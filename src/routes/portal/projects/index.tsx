import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	Box,
	Camera,
	Check,
	Images,
	Keyboard,
	Loader2,
	MapPin,
	PackageCheck,
	PackageX,
	Ruler,
	Search,
	ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { QrScanner } from "../../../components/orders/orderId/modals/QrScanner";
import { PortalHeader } from "../../../components/PortalHeader";
import { parseQrToken } from "../../../features/orders/hooks/useInstanceQr";
import { useAuth } from "../../../hooks/useAuth";
import { auth, db, supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/portal/projects/")({
	component: PortalProjects,
	head: () => ({
		meta: [{ title: "Package Portal | Client Portal" }],
	}),
});

type BoxLocation = {
	id: string;
	reference: string;
	destination: string | null;
	status: string | null;
	quantity: number | null;
};

type ItemLookupResult = {
	kind: "item";
	query: string;
	itemReference: string | null;
	itemNumbers: string[];
	description: string | null;
	matchedRecords: number;
	boxes: BoxLocation[];
};

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PORTAL_RECORD_SIGNALS = [
	{
		label: "Verified contents",
		detail: "See exactly what was packed",
		icon: PackageCheck,
	},
	{
		label: "Dimensions",
		detail: "Review size and package details",
		icon: Ruler,
	},
	{
		label: "Destination",
		detail: "Confirm where the package is going",
		icon: MapPin,
	},
	{
		label: "Photo record",
		detail: "Access supporting visual evidence",
		icon: Images,
	},
];

function PortalRecordFlowIllustration() {
	return (
		<div className="overflow-hidden rounded-[1.5rem] border border-app-border bg-app-surface shadow-[0_24px_70px_-42px_rgba(15,23,42,0.55)]">
			<div className="border-b border-app-border bg-neutral-950 p-5 sm:p-6 dark:bg-steel-950">
				<div className="mb-5 flex items-center justify-between gap-4">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary-300">
							Your package label
						</p>
						<p className="mt-1 text-xs text-steel-400">
							Search the printed box number or scan the QR code.
						</p>
					</div>
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
						<Search className="h-5 w-5 text-primary-300" aria-hidden="true" />
					</span>
				</div>

				<div className="relative flex min-h-[118px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#17263b] px-3 py-5 sm:min-h-[132px] sm:px-5">
					<div className="absolute inset-y-4 left-1/2 w-px bg-primary-400/25" aria-hidden="true" />
					<div className="absolute inset-x-4 top-1/2 h-px bg-primary-400/25" aria-hidden="true" />
					<img
						src="/image.png"
						alt="Example client package label with a QR code and box number"
						className="relative z-10 block h-auto w-full max-w-[560px] rounded-sm shadow-[0_14px_28px_-10px_rgba(0,0,0,0.8)]"
					/>
				</div>
				<div className="mt-3 flex items-center gap-2 text-xs text-steel-300">
					<Check className="h-3.5 w-3.5 text-success-400" aria-hidden="true" />
					A box number opens the complete box record directly
				</div>
			</div>

			<div className="grid gap-px bg-app-border sm:grid-cols-2">
				{PORTAL_RECORD_SIGNALS.map(({ label, detail, icon: Icon }) => (
					<div key={label} className="flex min-w-0 items-start gap-3 bg-app-surface px-4 py-4">
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
							<Icon className="h-4 w-4" aria-hidden="true" />
						</span>
						<span className="min-w-0">
							<span className="block text-xs font-semibold text-app-text-strong">{label}</span>
							<span className="mt-0.5 block text-[11px] leading-4 text-app-text-muted">{detail}</span>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function PortalSignature() {
	return (
		<div className="mt-5 flex w-full items-center justify-center gap-3 lg:mt-6">
			<span className="h-px min-w-0 flex-1 bg-gradient-to-r from-transparent to-primary-600/70 dark:to-primary-300/80" aria-hidden="true" />
			<p className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.22em] text-primary-700 dark:text-primary-300 sm:text-[11px]">
				Powered by Precision
			</p>
			<span className="h-px min-w-0 flex-1 bg-gradient-to-l from-transparent to-primary-600/70 dark:to-primary-300/80" aria-hidden="true" />
		</div>
	);
}

function ItemLocationResult({
	result,
	onOpenBox,
}: {
	result: ItemLookupResult;
	onOpenBox: (id: string) => void;
}) {
	const title = result.itemReference || result.itemNumbers[0] || result.query;
	return (
		<div className="mt-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[0_18px_48px_-38px_rgba(15,23,42,0.55)]" aria-live="polite">
			<div className="border-b border-app-border bg-app-surface-muted px-4 py-4 sm:px-5">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0">
						<p className="text-[10px] font-bold uppercase tracking-[0.17em] text-primary-700 dark:text-primary-300">
							Item location
						</p>
						<h3 className="mt-1 break-all text-lg font-bold tracking-[-0.02em] text-app-text-strong">
							{title}
						</h3>
						{result.description && (
							<p className="mt-1 line-clamp-2 text-xs leading-5 text-app-text-muted">
								{result.description}
							</p>
						)}
					</div>
					<span className="shrink-0 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[10px] font-bold text-primary-800 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-200">
						{result.boxes.length} box{result.boxes.length === 1 ? "" : "es"}
					</span>
				</div>
				{result.matchedRecords > 1 && (
					<p className="mt-2 text-[10px] text-app-text-muted">
						Matched {result.matchedRecords} item records
						{result.itemNumbers.length > 0 ? ` · ${result.itemNumbers.join(", ")}` : ""}
					</p>
				)}
			</div>

			{result.boxes.length === 0 ? (
				<div className="px-4 py-6 text-center sm:px-5">
					<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-app-surface-muted text-app-text-muted">
						<Box className="h-5 w-5" aria-hidden="true" />
					</div>
					<p className="mt-3 text-sm font-semibold text-app-text-strong">No packed box recorded yet</p>
					<p className="mt-1 text-xs text-app-text-muted">This item exists, but it is not currently linked to a packed box.</p>
				</div>
			) : (
				<div className="divide-y divide-app-border">
					{result.boxes.map((box) => (
						<button
							type="button"
							key={box.id}
							onClick={() => onOpenBox(box.id)}
							className="group flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 sm:px-5"
						>
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300">
								<Box className="h-5 w-5" aria-hidden="true" />
							</span>
							<span className="min-w-0 flex-1">
								<span className="block break-all text-sm font-bold text-app-text-strong">{box.reference}</span>
								<span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-app-text-muted">
									{box.destination && <span>Destination {box.destination}</span>}
									{box.quantity != null && <span>Qty in box {box.quantity}</span>}
									{box.status && <span className="capitalize">{box.status}</span>}
								</span>
							</span>
							<span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary-700 dark:text-primary-300">
								Open
								<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function PortalProjects() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();
	const [lookupInput, setLookupInput] = useState("");
	const [lookupResult, setLookupResult] = useState<ItemLookupResult | null>(null);
	const [lookupError, setLookupError] = useState<string | null>(null);
	const [lookupLoading, setLookupLoading] = useState(false);
	const [scannerOpen, setScannerOpen] = useState(false);

	useEffect(() => {
		if (!loading && !user) {
			navigate({
				to: "/portal/login",
				search: { returnUrl: window.location.pathname },
			});
		}
	}, [user, loading, navigate]);

	const { data: profile, isLoading: profileLoading } = useQuery({
		queryKey: ["currentUserProfile", user?.id],
		queryFn: async () => {
			if (!user) return null;
			const { data, error } = await db.getProfile(user.id);
			if (error) throw error;
			return data;
		},
		enabled: !!user,
	});

	const clientId = profile?.client_id;
	const roleName = profile?.roles?.name;
	const isStaffUser =
		roleName === "admin" ||
		roleName === "director" ||
		roleName === "project_lead" ||
		roleName === "sales";

	const handleQrSubmit = (raw: string) => {
		const token = parseQrToken(raw);
		if (!token) return;
		setScannerOpen(false);
		navigate({ to: "/portal/scan/$token", params: { token } });
	};

	const findBox = async (value: string) => {
		const fields = "id, ipac_reference, client_reference, destination, status";
		const byIpac = await supabase
			.from("order_pkg_instance")
			.select(fields)
			.ilike("ipac_reference", value)
			.limit(1);
		if (byIpac.error) throw byIpac.error;
		if (byIpac.data?.[0]) return byIpac.data[0];

		const byClientReference = await supabase
			.from("order_pkg_instance")
			.select(fields)
			.ilike("client_reference", value)
			.limit(1);
		if (byClientReference.error) throw byClientReference.error;
		return byClientReference.data?.[0] || null;
	};

	const findDeveloperBox = async (value: string) => {
		const fields = "id, ipac_reference, client_reference, destination, status";
		const packageUrlMatch = value.match(/\/portal\/package\/([^/?#\s]+)/i);
		const directCandidate = packageUrlMatch
			? decodeURIComponent(packageUrlMatch[1])
			: value;

		if (UUID_PATTERN.test(directCandidate)) {
			const byId = await supabase
				.from("order_pkg_instance")
				.select(fields)
				.eq("id", directCandidate)
				.limit(1);
			if (byId.error) throw byId.error;
			if (byId.data?.[0]) return byId.data[0];
		}

		const token = parseQrToken(value);
		if (!token) return null;
		const { data: qrRow, error: qrError } = await supabase
			.from("qr_codes")
			.select("entity_id")
			.eq("entity_type", "package")
			.eq("token", token)
			.eq("is_active", true)
			.limit(1)
			.maybeSingle();
		if (qrError) throw qrError;
		if (!qrRow?.entity_id) return null;

		const byQrEntity = await supabase
			.from("order_pkg_instance")
			.select(fields)
			.eq("id", qrRow.entity_id)
			.limit(1);
		if (byQrEntity.error) throw byQrEntity.error;
		return byQrEntity.data?.[0] || null;
	};

	const findItems = async (value: string) => {
		if (!clientId) return [];
		const fields = "id, item_num, reference, description";
		const byItemNumber = await supabase
			.from("items_db")
			.select(fields)
			.eq("client_id", clientId)
			.ilike("item_num", value)
			.limit(100);
		if (byItemNumber.error) throw byItemNumber.error;
		if (byItemNumber.data && byItemNumber.data.length > 0) return byItemNumber.data;

		const byReference = await supabase
			.from("items_db")
			.select(fields)
			.eq("client_id", clientId)
			.ilike("reference", value)
			.limit(100);
		if (byReference.error) throw byReference.error;
		if (byReference.data && byReference.data.length > 0) return byReference.data;

		const itemUrlMatch = value.match(/\/portal\/item\/([^/?#\s]+)/i);
		const developerItemId = itemUrlMatch
			? decodeURIComponent(itemUrlMatch[1])
			: value;
		if (!UUID_PATTERN.test(developerItemId)) return [];

		const byId = await supabase
			.from("items_db")
			.select(fields)
			.eq("client_id", clientId)
			.eq("id", developerItemId)
			.limit(1);
		if (byId.error) throw byId.error;
		return byId.data || [];
	};

	const buildItemResult = async (query: string, itemRows: any[]): Promise<ItemLookupResult> => {
		const itemIds = itemRows.map((item) => item.id).filter(Boolean);
		const itemNumbers = Array.from(
			new Set(itemRows.map((item) => item.item_num).filter(Boolean)),
		) as string[];
		const references = Array.from(
			new Set(itemRows.map((item) => item.reference).filter(Boolean)),
		) as string[];
		const descriptions = Array.from(
			new Set(itemRows.map((item) => item.description).filter(Boolean)),
		) as string[];

		if (itemIds.length === 0) {
			return {
				kind: "item",
				query,
				itemReference: references[0] || null,
				itemNumbers,
				description: descriptions.length === 1 ? descriptions[0] : null,
				matchedRecords: itemRows.length,
				boxes: [],
			};
		}

		const { data: packedRows, error } = await supabase
			.from("pkd_item")
			.select(`
				id,
				quantity,
				order_pkg_instance:pkg_instance_id (
					id,
					ipac_reference,
					client_reference,
					destination,
					status
				)
			`)
			.in("maintenance_db_id", itemIds)
			.not("pkg_instance_id", "is", null);
		if (error) throw error;

		const boxes = new Map<string, BoxLocation>();
		for (const row of packedRows || []) {
			const instance = Array.isArray((row as any).order_pkg_instance)
				? (row as any).order_pkg_instance[0]
				: (row as any).order_pkg_instance;
			if (!instance?.id) continue;

			const numericQuantity = Number((row as any).quantity);
			const quantity = Number.isFinite(numericQuantity) ? numericQuantity : null;
			const existing = boxes.get(instance.id);
			if (existing) {
				if (quantity != null) existing.quantity = (existing.quantity || 0) + quantity;
				continue;
			}

			boxes.set(instance.id, {
				id: instance.id,
				reference:
					instance.ipac_reference || instance.client_reference || `Box ${instance.id.slice(0, 8)}`,
				destination: instance.destination || null,
				status: instance.status || null,
				quantity,
			});
		}

		return {
			kind: "item",
			query,
			itemReference: references.length === 1 ? references[0] : references[0] || null,
			itemNumbers,
			description: descriptions.length === 1 ? descriptions[0] : null,
			matchedRecords: itemRows.length,
			boxes: Array.from(boxes.values()).sort((a, b) => a.reference.localeCompare(b.reference)),
		};
	};

	const handleLookup = async () => {
		const value = lookupInput.trim();
		if (!value || !clientId) return;

		setLookupLoading(true);
		setLookupError(null);
		setLookupResult(null);
		try {
			const box = await findBox(value);
			if (box?.id) {
				navigate({ to: "/portal/package/$id", params: { id: box.id } });
				return;
			}

			const itemRows = await findItems(value);
			if (itemRows.length > 0) {
				setLookupResult(await buildItemResult(value, itemRows));
				return;
			}

			const developerBox = await findDeveloperBox(value);
			if (developerBox?.id) {
				navigate({ to: "/portal/package/$id", params: { id: developerBox.id } });
				return;
			}

			setLookupError(
				"No matching box number or item reference was found for your account.",
			);
		} catch (error: any) {
			setLookupError(error?.message || "Unable to search right now. Please try again.");
		} finally {
			setLookupLoading(false);
		}
	};

	const resultSummary = useMemo(() => {
		if (!lookupResult) return null;
		if (lookupResult.boxes.length === 0) return "Item found, but no packed box is linked yet.";
		return `Item found in ${lookupResult.boxes.length} box${lookupResult.boxes.length === 1 ? "" : "es"}.`;
	}, [lookupResult]);

	if (loading || profileLoading) {
		return (
			<div className="portal-brand flex min-h-screen items-center justify-center bg-app-bg">
				<Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-300" />
			</div>
		);
	}

	if (isStaffUser && !clientId) {
		return (
			<div className="portal-brand flex min-h-screen items-center justify-center bg-app-bg p-4 sm:p-6">
				<div className="w-full max-w-lg rounded-3xl border border-app-border bg-app-surface p-7 text-center shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] sm:p-8">
					<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-warning-200 bg-warning-50 dark:border-warning-700/60 dark:bg-warning-950/30">
						<ShieldAlert className="h-7 w-7 text-warning-600 dark:text-warning-300" aria-hidden="true" />
					</div>
					<h2 className="mb-2 text-xl font-bold text-app-text-strong">Staff Account</h2>
					<p className="mx-auto mb-6 max-w-md text-sm leading-6 text-app-text-muted">
						You're logged in as a staff member (
						<span className="font-semibold text-app-text-strong">{profile?.full_name || profile?.username}</span>
						). This portal is for clients only.
					</p>
					<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
						<Link to="/dashboard" className="rounded-xl bg-primary-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface dark:bg-primary-500 dark:hover:bg-primary-400">
							<span className="text-white">Go to Admin Panel</span>
						</Link>
						<button
							type="button"
							onClick={async () => {
								await auth.signOut();
								navigate({ to: "/portal/login" });
							}}
							className="rounded-xl border border-app-border bg-app-surface px-5 py-2.5 font-semibold text-app-text-strong transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
						>
							Sign out
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (!clientId) {
		return (
			<div className="portal-brand flex min-h-screen items-center justify-center bg-app-bg p-4 sm:p-6">
				<div className="w-full max-w-lg rounded-3xl border border-app-border bg-app-surface p-7 text-center shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] sm:p-8">
					<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-app-border bg-app-surface-muted">
						<PackageX className="h-7 w-7 text-app-text-muted" aria-hidden="true" />
					</div>
					<h2 className="mb-2 text-xl font-bold text-app-text-strong">No Client Assigned</h2>
					<p className="mx-auto mb-6 max-w-md text-sm leading-6 text-app-text-muted">
						Your user profile is not linked to any client company. Please contact support.
					</p>
					<button
						type="button"
						onClick={async () => {
								await auth.signOut();
								navigate({ to: "/portal/login" });
							}}
						className="rounded-xl border border-app-border bg-app-surface px-5 py-2.5 font-semibold text-app-text-strong transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
					>
						Sign out & try again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="portal-brand min-h-dvh bg-app-bg">
			<PortalHeader title="Package Portal" onScan={() => setScannerOpen(true)} activePage="home" maxWidth="max-w-7xl" />

			<main className="relative isolate overflow-hidden">
				<div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
					<div className="absolute -left-40 top-12 h-80 w-80 rounded-full bg-primary-200/30 blur-3xl dark:bg-primary-900/15" />
					<div className="absolute -right-32 top-1/3 h-72 w-72 rounded-full bg-aqua-200/20 blur-3xl dark:bg-aqua-900/10" />
				</div>

				<section className="mx-auto grid w-full max-w-7xl items-start gap-8 px-3 py-6 sm:px-6 sm:py-9 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-8 lg:py-12">
					<div className="mx-auto w-full max-w-xl lg:mx-0">
						<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-700 dark:text-primary-300">
							Box & item lookup
						</p>
						<h1 className="mt-2 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-app-text-strong sm:text-5xl">
							Find a box or locate an item.
						</h1>
						<p className="mt-3 max-w-lg text-sm leading-6 text-app-text-muted sm:text-base">
							Enter a box number to open its full record. Enter an item number or item reference to see every box containing those parts.
						</p>

						<div className="mt-6 rounded-[1.35rem] border border-app-border bg-app-surface p-3 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.55)] sm:mt-8 sm:p-4">
							<form
								onSubmit={(event) => {
									event.preventDefault();
									void handleLookup();
								}}
							>
								<label htmlFor="box-or-item" className="mb-2 flex items-center gap-2 text-sm font-bold text-app-text-strong">
									<Keyboard className="h-4 w-4 text-primary-700 dark:text-primary-300" aria-hidden="true" />
									Box number or item number/reference
								</label>
								<div className="flex gap-2">
									<input
										id="box-or-item"
										type="text"
										value={lookupInput}
										onChange={(event) => {
											setLookupInput(event.target.value);
											setLookupError(null);
										}}
										placeholder="AUH-P-AC-SB-#02 or 03G12A021"
										autoComplete="off"
										spellCheck={false}
										aria-describedby="lookup-help"
										className="min-h-12 min-w-0 flex-1 rounded-xl border border-app-border bg-app-surface-muted px-3 py-3 text-sm font-medium text-app-text-strong placeholder:font-normal placeholder:text-app-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:px-4"
									/>
									<button
										type="submit"
										disabled={!lookupInput.trim() || lookupLoading}
										className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white transition-[background-color,transform] hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transform-none motion-reduce:transition-none dark:bg-primary-500 dark:hover:bg-primary-400 sm:px-5"
									>
										{lookupLoading ? (
											<Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
										) : (
											<Search className="h-4 w-4 text-white" aria-hidden="true" />
										)}
										<span className="hidden text-white sm:inline">Find</span>
									</button>
								</div>
								<p id="lookup-help" className="mt-2 px-1 text-[11px] leading-4 text-app-text-muted sm:text-xs sm:leading-5">
									Box number → opens the box. Item number/reference → shows every box containing that item.
								</p>
							</form>

							{lookupError && (
								<div className="mt-4 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800 dark:border-danger-800/70 dark:bg-danger-950/30 dark:text-danger-200" role="alert">
									{lookupError}
								</div>
							)}

							{lookupResult && (
								<>
									<span className="sr-only" aria-live="polite">{resultSummary}</span>
									<ItemLocationResult
										result={lookupResult}
										onOpenBox={(id) => navigate({ to: "/portal/package/$id", params: { id } })}
									/>
								</>
							)}

							<div className="my-4 flex items-center gap-3 px-1 text-[9px] font-bold uppercase tracking-[0.16em] text-app-text-muted sm:my-5 sm:text-[10px] sm:tracking-[0.18em]">
								<span className="h-px flex-1 bg-app-border" />
								<span>Or scan a box QR code</span>
								<span className="h-px flex-1 bg-app-border" />
							</div>

							<button
								type="button"
								onClick={() => setScannerOpen(true)}
								className="group flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-3 py-3 text-left transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none sm:min-h-20 sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-4 dark:border-primary-800 dark:bg-primary-950/25 dark:hover:border-primary-700 dark:hover:bg-primary-950/40"
							>
								<div className="flex items-center gap-3 sm:gap-4">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm sm:h-12 sm:w-12 sm:rounded-xl dark:bg-primary-500">
										<Camera className="h-5 w-5 text-white" aria-hidden="true" />
									</div>
									<div>
										<div className="text-sm font-bold text-primary-950 sm:text-base dark:text-primary-100">Scan box QR code</div>
										<div className="mt-0.5 text-xs text-primary-700 dark:text-primary-300">Use your device camera</div>
									</div>
								</div>
								<ArrowRight className="h-5 w-5 text-primary-700 transition-transform group-hover:translate-x-1 dark:text-primary-300" aria-hidden="true" />
							</button>
						</div>

						<PortalSignature />
					</div>

					<div className="mx-auto hidden w-full max-w-xl lg:mx-0 lg:block">
						<PortalRecordFlowIllustration />
					</div>
				</section>
			</main>

			<QrScanner
				open={scannerOpen}
				onClose={() => setScannerOpen(false)}
				onResult={handleQrSubmit}
			/>
		</div>
	);
}
