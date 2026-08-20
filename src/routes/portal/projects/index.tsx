import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Camera,
	ChevronRight,
	Images,
	Loader2,
	MapPin,
	PackageCheck,
	PackageX,
	Ruler,
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
});

const QR_DRIVEN_PORTAL = true;

function PortalRecordFlowIllustration() {
	const recordSignals = [
		{ label: "Contents", icon: PackageCheck },
		{ label: "Dimensions", icon: Ruler },
		{ label: "Destination", icon: MapPin },
		{ label: "Photos", icon: Images },
	];

	return (
		<div
			aria-label="Scan the IPAC QR label to open the package record"
			className="relative overflow-hidden rounded-[1.25rem] border border-slate-700 bg-[#0c1728] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.9)]"
		>
			<div className="relative px-3 pb-3 pt-3 sm:px-4 sm:pt-4">
				<div className="relative flex min-h-[104px] items-center justify-center overflow-hidden rounded-lg border border-slate-600/70 bg-[#17263b] px-2 py-3 sm:min-h-[112px] sm:px-4">
					<img
						src="/image.png"
						alt="Full IPAC package label for package AUH-P-AC-SB-BOX number 01"
						className="relative z-0 block h-auto w-full max-w-[560px] rounded-[2px] shadow-[0_12px_24px_-10px_rgba(0,0,0,0.75)]"
					/>
				</div>
				<div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-300">
					<span>Full label</span>
					<span className="text-slate-500">·</span>
					<span className="text-primary-200">QR code only</span>
				</div>
			</div>

			<div className="border-t border-slate-700 bg-app-surface px-3 py-3 dark:bg-steel-900 sm:px-4">
				<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
					{recordSignals.map(({ label, icon: Icon }) => (
						<div
							key={label}
							className="flex min-w-0 items-center gap-1.5 rounded-lg border border-app-border bg-app-surface-muted px-2 py-1.5 text-[10px] font-semibold text-app-text-strong"
						>
							<Icon className="h-3.5 w-3.5 shrink-0 text-primary-600 dark:text-primary-300" />
							<span className="truncate">{label}</span>
						</div>
					))}
				</div>
			</div>
		</div>
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
			<div className="min-h-screen bg-app-bg">
				<PortalHeader
					title="Client Overview"
					onScan={() => setScannerOpen(true)}
					activePage="home"
					tokenValue={qrInput}
					onTokenValueChange={setQrInput}
					onTokenSubmit={() => handleQrSubmit(qrInput)}
				/>

				<main className="h-[calc(100svh-4rem)] overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
					<section className="mx-auto grid h-full w-full max-w-5xl overflow-hidden rounded-[1.5rem] border border-app-border bg-app-surface shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] md:grid-cols-[1.12fr_0.88fr]">
						<div className="flex min-h-0 items-center justify-center px-4 py-5 sm:px-8 sm:py-6">
							<div className="w-full max-w-2xl text-center">
							<div className="flex items-center justify-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-surface-muted p-2">
									<img src="/IPAC_logo.svg" alt="IPAC" className="h-full w-full" />
								</div>
								<div className="text-left">
									<div className="text-[10px] font-bold uppercase tracking-[0.28em] text-app-text-muted">
										IPAC
									</div>
									<div className="text-sm font-medium text-app-text-strong">
										Package information for your team
									</div>
								</div>
							</div>
							<h2 className="portal-hero-headline animate-fade-in mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
								Your package is ready to view.
							</h2>
							<p className="mx-auto mt-2 max-w-xl text-sm leading-5 text-app-text-muted">
								Scan the IPAC QR label or use the token below to open the exact package record.
							</p>

							<div className="mx-auto mt-5 max-w-2xl rounded-[1.25rem] border-2 border-primary-200 bg-primary-50/40 p-2 shadow-[0_20px_50px_-30px_rgba(37,99,235,0.55)] dark:border-primary-800/70 dark:bg-primary-950/20 sm:p-3">
								<button
									type="button"
									onClick={() => setScannerOpen(true)}
									className="group flex min-h-16 w-full items-center justify-between gap-4 rounded-xl bg-primary-600 px-4 py-3 text-left text-white shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-400"
								>
									<div className="flex items-center gap-4">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
											<Camera className="h-4 w-4" />
										</div>
										<div>
											<div className="text-sm font-semibold">Open camera</div>
											<div className="text-xs text-white/75">Scan the QR label with your device</div>
										</div>
									</div>
									<ChevronRight className="h-5 w-5 text-white/75 transition-transform group-hover:translate-x-0.5" />
								</button>
							</div>
						</div>
					</div>

						<div className="flex min-h-0 items-center border-t border-app-border bg-app-surface-muted/40 px-4 py-4 md:border-l md:border-t-0 sm:px-6">
							<div className="w-full">
								<PortalRecordFlowIllustration />
							</div>
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
