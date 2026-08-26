import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	Camera,
	Check,
	Images,
	Loader2,
	MapPin,
	PackageCheck,
	PackageX,
	Ruler,
	Search,
	ShieldAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import { QrScanner } from "../../../components/orders/orderId/modals/QrScanner";
import { PortalHeader } from "../../../components/PortalHeader";
import { parseQrToken } from "../../../features/orders/hooks/useInstanceQr";
import { useAuth } from "../../../hooks/useAuth";
import { auth, db } from "../../../lib/supabase";

export const Route = createFileRoute("/portal/projects/")({
	component: PortalProjects,
	head: () => ({
		meta: [{ title: "Package Portal | Client Portal" }],
	}),
});

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

function PortalSignature() {
	return (
		<div className="mt-5 flex w-full items-center justify-center gap-3 lg:mt-6">
			<span
				className="h-px min-w-0 flex-1 bg-gradient-to-r from-transparent to-primary-600/70 dark:to-primary-300/80"
				aria-hidden="true"
			/>
			<p className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.22em] text-primary-700 dark:text-primary-300 sm:text-[11px]">
				Powered by Precision
			</p>
			<span
				className="h-px min-w-0 flex-1 bg-gradient-to-l from-transparent to-primary-600/70 dark:to-primary-300/80"
				aria-hidden="true"
			/>
		</div>
	);
}

function PortalProjects() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();
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
						<ShieldAlert
							className="h-7 w-7 text-warning-600 dark:text-warning-300"
							aria-hidden="true"
						/>
					</div>
					<h2 className="mb-2 text-xl font-bold text-app-text-strong">
						Staff Account
					</h2>
					<p className="mx-auto mb-6 max-w-md text-sm leading-6 text-app-text-muted">
						You're logged in as a staff member (
						<span className="font-semibold text-app-text-strong">
							{profile?.full_name || profile?.username}
						</span>
						). This portal is for clients only.
					</p>
					<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
						<Link
							to="/dashboard"
							className="rounded-xl bg-primary-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface dark:bg-primary-500 dark:hover:bg-primary-400"
						>
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
						<PackageX
							className="h-7 w-7 text-app-text-muted"
							aria-hidden="true"
						/>
					</div>
					<h2 className="mb-2 text-xl font-bold text-app-text-strong">
						No Client Assigned
					</h2>
					<p className="mx-auto mb-6 max-w-md text-sm leading-6 text-app-text-muted">
						Your user profile is not linked to any client company. Please
						contact support.
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
			<PortalHeader
				title="Package Portal"
				onScan={() => setScannerOpen(true)}
				activePage="home"
				maxWidth="max-w-7xl"
			/>

			<main className="relative isolate overflow-hidden">
				<div
					className="pointer-events-none absolute inset-0 -z-10"
					aria-hidden="true"
				>
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
							Use the search in the header with a box number, item number, item
							reference, or printed item label. Box matches open directly; item
							matches show every box containing those parts beside the search.
						</p>

						<div className="mt-7 border-t border-app-border pt-5 sm:mt-8 sm:pt-6">
							<p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-app-text-muted">
								Prefer to scan?
							</p>
							<button
								type="button"
								onClick={() => setScannerOpen(true)}
								className="group flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-3 py-3 text-left shadow-[0_10px_22px_-22px_rgba(0,94,168,0.42)] transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-100 hover:shadow-[0_14px_28px_-22px_rgba(0,94,168,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none sm:min-h-20 sm:gap-4 sm:px-4 sm:py-4 dark:border-primary-800 dark:bg-primary-950/25 dark:hover:border-primary-700 dark:hover:bg-primary-950/40"
							>
								<div className="flex items-center gap-3 sm:gap-4">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm sm:h-12 sm:w-12 dark:bg-primary-500">
										<Camera className="h-5 w-5 text-white" aria-hidden="true" />
									</div>
									<div>
										<div className="text-sm font-bold text-primary-950 sm:text-base dark:text-primary-100">
											Scan box QR code
										</div>
										<div className="mt-0.5 text-xs text-primary-700 dark:text-primary-300">
											Use your device camera
										</div>
									</div>
								</div>
								<ArrowRight
									className="h-5 w-5 text-primary-700 transition-transform group-hover:translate-x-1 dark:text-primary-300"
									aria-hidden="true"
								/>
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
