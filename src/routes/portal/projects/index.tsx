import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	Camera,
	Check,
	ChevronDown,
	Images,
	Keyboard,
	Loader2,
	LockKeyhole,
	MapPin,
	PackageCheck,
	PackageX,
	Ruler,
	ScanLine,
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
		meta: [{ title: "Package Portal | Metrix-Assets 4.0" }],
	}),
});

const QR_DRIVEN_PORTAL = true;

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
					<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary-300">
						Your package label
					</p>
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
						<ScanLine className="h-5 w-5 text-primary-300" aria-hidden="true" />
					</span>
				</div>

				<div className="relative flex min-h-[118px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#17263b] px-3 py-5 sm:min-h-[132px] sm:px-5">
					<div
						className="absolute inset-y-4 left-1/2 w-px bg-primary-400/25"
						aria-hidden="true"
					/>
					<div
						className="absolute inset-x-4 top-1/2 h-px bg-primary-400/25"
						aria-hidden="true"
					/>
						<img
						src="/image.png"
						alt="Example Metrix-Assets package label with a QR code"
						className="relative z-10 block h-auto w-full max-w-[560px] rounded-sm shadow-[0_14px_28px_-10px_rgba(0,0,0,0.8)]"
					/>
				</div>
				<div className="mt-3 flex items-center gap-2 text-xs text-steel-300">
					<Check className="h-3.5 w-3.5 text-success-400" aria-hidden="true" />
					Scan the QR code printed on the yellow label
				</div>
			</div>

			<div className="grid gap-px bg-app-border sm:grid-cols-2">
				{PORTAL_RECORD_SIGNALS.map(({ label, detail, icon: Icon }) => (
					<div
						key={label}
						className="flex min-w-0 items-start gap-3 bg-app-surface px-4 py-4"
					>
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
							<Icon className="h-4 w-4" aria-hidden="true" />
						</span>
						<span className="min-w-0">
							<span className="block text-xs font-semibold text-app-text-strong">
								{label}
							</span>
							<span className="mt-0.5 block text-[11px] leading-4 text-app-text-muted">
								{detail}
							</span>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function MobileRecordSummary() {
	return (
		<details className="group overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm lg:hidden">
			<summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-app-text-strong transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 [&::-webkit-details-marker]:hidden">
				<span className="inline-flex items-center gap-2">
					<PackageCheck
						className="h-4 w-4 text-primary-600 dark:text-primary-300"
						aria-hidden="true"
					/>
					What you can view after scanning
				</span>
				<ChevronDown
					className="h-4 w-4 shrink-0 text-app-text-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
					aria-hidden="true"
				/>
			</summary>
			<div className="grid grid-cols-2 gap-px border-t border-app-border bg-app-border">
				{PORTAL_RECORD_SIGNALS.map(({ label, icon: Icon }) => (
					<div
						key={label}
						className="flex items-center gap-2 bg-app-surface px-3 py-3 text-xs font-medium text-app-text-strong"
					>
						<Icon
							className="h-3.5 w-3.5 shrink-0 text-primary-600 dark:text-primary-300"
							aria-hidden="true"
						/>
						{label}
					</div>
				))}
			</div>
		</details>
	);
}

function PortalProjects() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();

	// Redirect to portal login if unauthenticated
	useEffect(() => {
		if (!loading && !user) {
			navigate({
				to: "/portal/login",
				search: { returnUrl: window.location.pathname },
			});
		}
	}, [user, loading, navigate]);

	// Fetch current user's profile to extract their client_id and role
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
	const [itemSearch, setItemSearch] = useState("");
	const [qrInput, setQrInput] = useState("");
	const [scannerOpen, setScannerOpen] = useState(false);
	const handleQrSubmit = (raw: string) => {
		const token = parseQrToken(raw);
		if (!token) return;
		setQrInput("");
		setScannerOpen(false);
		navigate({ to: "/portal/scan/$token", params: { token } });
	};
	const closeScanner = () => {
		setScannerOpen(false);
	};
	const scanner = (
		<QrScanner
			open={scannerOpen}
			onClose={closeScanner}
			onResult={handleQrSubmit}
		/>
	);

	const {
		data: items,
		isLoading: itemsLoading,
		error: itemsError,
	} = useQuery({
		queryKey: ["portal-items", clientId],
		queryFn: async () => {
			if (!clientId) return [];

			const { data, error } = await supabase
				.from("items_db")
				.select(`
					id,
					item_num,
					reference,
					description,
					expected_qty,
					packed_qty,
					pkg_category (label)
				`)
				.eq("client_id", clientId)
				.order("item_num", { ascending: true })
				.limit(1000);

			if (error) throw error;
			return data || [];
		},
		enabled: !QR_DRIVEN_PORTAL && !!clientId,
	});

	const searchToken = itemSearch.trim().toLowerCase();
	const filteredItems = useMemo(() => {
		const source = items || [];
		if (!searchToken) return source;

		return source.filter((item: any) => {
			const searchable = [
				item.item_num,
				item.reference,
				item.description,
				item.pkg_category?.label,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return searchable.includes(searchToken);
		});
	}, [items, searchToken]);

	if (loading || profileLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-neutral-50">
				<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
			</div>
		);
	}

	// Staff/admin accidentally landed on the client portal
	if (isStaffUser && !clientId) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6 text-center">
				<ShieldAlert className="w-16 h-16 text-warning-400 mb-4" />
				<h2 className="text-xl font-bold text-neutral-900 mb-2">
					Staff Account Detected
				</h2>
				<p className="text-neutral-500 max-w-md mb-6">
					You're logged in as a staff member (
					<span className="font-semibold">
						{profile?.full_name || profile?.username}
					</span>
					). This portal is for clients only.
				</p>
				<div className="flex gap-3">
					<Link
						to="/dashboard"
						className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
					>
						Go to Admin Panel
					</Link>
					<button
						onClick={async () => {
							await auth.signOut();
							navigate({ to: "/portal/login" });
						}}
						className="px-5 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-xl transition-colors"
					>
						Sign out
					</button>
				</div>
			</div>
		);
	}

	if (!clientId) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6 text-center">
				<PackageX className="w-16 h-16 text-neutral-300 mb-4" />
				<h2 className="text-xl font-bold text-neutral-900 mb-2">
					No Client Assigned
				</h2>
				<p className="text-neutral-500 max-w-md mb-6">
					Your user profile is not linked to any client company. Please contact
					support.
				</p>
				<button
					onClick={async () => {
						await auth.signOut();
						navigate({ to: "/portal/login" });
					}}
					className="px-5 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-xl transition-colors"
				>
					Sign out & try again
				</button>
			</div>
		);
	}

	if (QR_DRIVEN_PORTAL) {
		return (
			<div className="portal-brand flex h-dvh flex-col overflow-hidden bg-app-bg">
				<a
					href="#package-access"
					className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-lg focus:bg-neutral-950 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
				>
					Skip to package access
				</a>
				<PortalHeader
					title="Package Portal"
					onScan={() => setScannerOpen(true)}
					activePage="home"
					maxWidth="max-w-7xl"
				/>

				<main
					id="package-access"
					tabIndex={-1}
					className="relative isolate min-h-0 flex-1 overflow-hidden focus:outline-none"
				>
					<div
						className="pointer-events-none absolute inset-0 -z-10"
						aria-hidden="true"
					>
						<div className="absolute -left-40 top-12 h-80 w-80 rounded-full bg-primary-200/30 blur-3xl dark:bg-primary-900/15" />
						<div className="absolute -right-32 top-1/3 h-72 w-72 rounded-full bg-aqua-200/20 blur-3xl dark:bg-aqua-900/10" />
					</div>

					<section className="mx-auto grid h-full min-h-0 w-full max-w-7xl items-center gap-8 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-8 lg:py-8">
						<div className="mx-auto w-full max-w-xl lg:mx-0">
							<div className="mb-4 flex items-center gap-3 sm:mb-6">
								<div
									className="h-px w-8 bg-primary-500 sm:w-12"
									aria-hidden="true"
								/>
								<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary-700 dark:text-primary-300 sm:text-[11px]">
									Powered by Precision
								</p>
							</div>
							<h2 className="text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-app-text-strong sm:text-5xl">
								Open any package record in seconds.
							</h2>
							<div className="mt-6 rounded-[1.25rem] border border-app-border bg-app-surface p-2 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.55)] sm:mt-8 sm:rounded-[1.5rem] sm:p-3">
								<button
									type="button"
									onClick={() => setScannerOpen(true)}
									className="group flex min-h-16 w-full items-center justify-between gap-3 rounded-xl bg-primary-600 px-3 py-3 text-left text-white shadow-lg shadow-primary-900/20 transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none sm:min-h-20 sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-4 dark:bg-primary-500 dark:hover:bg-primary-400"
								>
									<div className="flex items-center gap-3 sm:gap-4">
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20 sm:h-12 sm:w-12 sm:rounded-xl">
											<Camera
												className="h-5 w-5 text-white"
												aria-hidden="true"
											/>
										</div>
										<div>
											<div className="text-sm font-semibold text-white sm:text-base">
												Scan package QR code
											</div>
											<div className="mt-0.5 text-xs text-white/75">
												Use your device camera
											</div>
										</div>
									</div>
									<ArrowRight
										className="h-5 w-5 text-white/80 transition-transform group-hover:translate-x-1"
										aria-hidden="true"
									/>
								</button>

								<div className="my-3 flex items-center gap-3 px-1 text-[9px] font-bold uppercase tracking-[0.16em] text-app-text-muted sm:my-4 sm:text-[10px] sm:tracking-[0.18em]">
									<span className="h-px flex-1 bg-app-border" />
									<span>Or enter label details</span>
									<span className="h-px flex-1 bg-app-border" />
								</div>

								<form
									onSubmit={(event) => {
										event.preventDefault();
										handleQrSubmit(qrInput);
									}}
									className="rounded-xl bg-app-surface p-1 text-left"
								>
									<label
										htmlFor="package-token"
										className="mb-2 flex items-center gap-2 text-sm font-semibold text-app-text-strong"
									>
										<Keyboard
											className="h-4 w-4 text-app-text-muted"
											aria-hidden="true"
										/>
										Package token or scan URL
									</label>
									<div className="flex gap-2">
										<input
											id="package-token"
											type="text"
											value={qrInput}
											onChange={(event) => setQrInput(event.target.value)}
											placeholder="Token or scan URL"
											autoComplete="off"
											spellCheck={false}
											aria-describedby="package-token-help"
											className="min-h-12 min-w-0 flex-1 rounded-xl border border-app-border bg-app-surface-muted px-3 py-3 text-sm text-app-text-strong placeholder:text-app-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:px-4"
										/>
										<button
											type="submit"
											disabled={!qrInput.trim()}
											className="inline-flex min-h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-3 py-3 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transform-none motion-reduce:transition-none sm:w-auto sm:px-5 dark:bg-steel-950 dark:hover:bg-steel-800"
											aria-label="Open package record"
										>
											<span className="hidden text-white sm:inline">
												Open record
											</span>
											<ArrowRight className="h-4 w-4" aria-hidden="true" />
										</button>
									</div>
									<p
										id="package-token-help"
										className="mt-2 px-1 text-[11px] leading-4 text-app-text-muted sm:text-xs sm:leading-5"
									>
										You can paste the complete scan link or enter its token.
									</p>
								</form>
							</div>

							<div className="mt-3 flex items-center gap-5 text-[11px] text-app-text-muted sm:mt-5 sm:text-xs">
								<span className="hidden items-center gap-2 sm:inline-flex">
									<LockKeyhole
										className="h-3.5 w-3.5 text-success-600 dark:text-success-400"
										aria-hidden="true"
									/>
									Protected by your signed-in account
								</span>
								<span className="inline-flex items-center gap-2">
									<Camera
										className="h-3.5 w-3.5 text-primary-600 dark:text-primary-300"
										aria-hidden="true"
									/>
									Camera opens only when requested
								</span>
							</div>

							<div className="mt-3 lg:hidden">
								<MobileRecordSummary />
							</div>
						</div>

						<div className="mx-auto hidden w-full max-w-xl lg:mx-0 lg:block">
							<PortalRecordFlowIllustration />
						</div>
					</section>
				</main>
				{scanner}
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-neutral-50">
			<PortalHeader
				title="Client Overview"
				onScan={() => setScannerOpen(true)}
				activePage="home"
				maxWidth="max-w-7xl"
			/>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<h2 className="text-2xl font-bold text-neutral-900">
						Your Inventory Projects
					</h2>
					<p className="text-neutral-500 mt-1">
						Browse all items and open detailed records for each item.
					</p>
				</div>

				<div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 sm:p-6">
					<div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
						<input
							type="search"
							value={itemSearch}
							onChange={(event) => setItemSearch(event.target.value)}
							placeholder="Search item number, reference, or description"
							className="w-full sm:max-w-xl px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
						/>
						<button
							type="button"
							onClick={() => setScannerOpen(true)}
							className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
						>
							<Camera className="h-4 w-4" />
							Scan QR
						</button>
						<div className="text-sm text-neutral-500">
							{filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
						</div>
					</div>

					{itemsLoading ? (
						<div className="py-14 flex items-center justify-center text-neutral-500">
							<Loader2 className="w-5 h-5 mr-2 animate-spin" />
							Loading items...
						</div>
					) : itemsError ? (
						<div className="py-10 px-4 rounded-xl border border-danger-200 bg-danger-50 text-danger-700 text-sm">
							Failed to load items. Please refresh and try again.
						</div>
					) : filteredItems.length === 0 ? (
						<div className="py-10 px-4 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600 text-center">
							No items found for this client.
						</div>
					) : (
						<ul className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl overflow-hidden">
							{filteredItems.map((item: any) => {
								const packedQty = Number(item?.packed_qty ?? 0);
								const expectedQty = Number(item?.expected_qty ?? 0);
								const fullyPacked = expectedQty > 0 && packedQty >= expectedQty;

								return (
									<li key={item.id}>
										<Link
											to="/portal/item/$id"
											params={{ id: item.id }}
											className="block p-4 sm:p-5 hover:bg-neutral-50 transition-colors"
										>
											<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
												<div>
													<div className="flex items-center gap-2 mb-1.5">
														<span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
															{item.item_num || item.reference || "NO-REF"}
														</span>
														<span className="text-xs text-neutral-500">
															{item.pkg_category?.label || "General"}
														</span>
													</div>
													<h3 className="text-base font-semibold text-neutral-900">
														{item.description ||
															item.reference ||
															"Unnamed Item"}
													</h3>
												</div>
												<div className="sm:text-right text-sm">
													<div className="text-neutral-700">
														Packed {packedQty} / {expectedQty || "-"}
													</div>
													<div
														className={`inline-flex mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
															fullyPacked
																? "bg-success-100 text-success-700"
																: "bg-warning-100 text-warning-700"
														}`}
													>
														{fullyPacked ? "Packed" : "Pending"}
													</div>
												</div>
											</div>
										</Link>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</main>
			{scanner}
		</div>
	);
}
