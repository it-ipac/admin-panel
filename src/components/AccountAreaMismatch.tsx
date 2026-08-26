import {
	ArrowRight,
	LayoutDashboard,
	Loader2,
	LogOut,
	Package,
	ShieldAlert,
} from "lucide-react";
import type { AccountAreaMismatch as AccountAreaMismatchKind } from "../lib/accountAreaAccess";

interface AccountAreaMismatchProps {
	kind: AccountAreaMismatchKind;
	accountName?: string | null;
	isSigningOut?: boolean;
	onGoToCorrectArea: () => void;
	onSignOut: () => void;
}

const COPY = {
	"client-in-admin": {
		title: "Client Account Detected",
		accountType: "client",
		restrictedArea: "Admin Panel",
		fromLabel: "Admin Panel",
		toLabel: "Package Portal",
		actionLabel: "Go to Package Portal",
		FromIcon: LayoutDashboard,
		ToIcon: Package,
	},
	"staff-in-portal": {
		title: "Staff Account Detected",
		accountType: "staff",
		restrictedArea: "Package Portal",
		fromLabel: "Package Portal",
		toLabel: "Admin Panel",
		actionLabel: "Go to Admin Panel",
		FromIcon: Package,
		ToIcon: LayoutDashboard,
	},
} as const;

export function AccountAreaMismatch({
	kind,
	accountName,
	isSigningOut = false,
	onGoToCorrectArea,
	onSignOut,
}: AccountAreaMismatchProps) {
	const copy = COPY[kind];
	const FromIcon = copy.FromIcon;
	const ToIcon = copy.ToIcon;

	return (
		<div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
			<div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl sm:p-8">
				<div className="mb-6 flex items-center gap-3" aria-hidden="true">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
						<FromIcon className="h-6 w-6" />
					</div>
					<ArrowRight className="h-5 w-5 text-neutral-400" />
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
						<ToIcon className="h-6 w-6" />
					</div>
				</div>

				<div className="mb-6">
					<div className="mb-3 flex items-center gap-2 text-warning-600">
						<ShieldAlert className="h-5 w-5" aria-hidden="true" />
						<span className="text-xs font-bold uppercase tracking-[0.16em]">
							Account area mismatch
						</span>
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-neutral-900">
						{copy.title}
					</h1>
					<p className="mt-3 text-sm leading-6 text-neutral-600">
						You're logged in as a {copy.accountType} account
						{accountName ? (
							<>
								{" "}
								(<span className="font-semibold text-neutral-800">{accountName}</span>)
							</>
						) : null}
						. The {copy.restrictedArea} is for {kind === "client-in-admin" ? "staff" : "clients"} only.
					</p>
					<p className="mt-2 text-sm text-neutral-500">
						Continue to the correct area without signing out, or sign out to use a different account.
					</p>
				</div>

				<div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
					<span className="font-medium text-neutral-500">{copy.fromLabel}</span>
					<ArrowRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
					<span className="text-right font-semibold text-neutral-800">{copy.toLabel}</span>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<button
						type="button"
						onClick={onGoToCorrectArea}
						disabled={isSigningOut}
						className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
					>
						<ToIcon className="h-4 w-4" aria-hidden="true" />
						{copy.actionLabel}
					</button>
					<button
						type="button"
						onClick={onSignOut}
						disabled={isSigningOut}
						className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSigningOut ? (
							<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
						) : (
							<LogOut className="h-4 w-4" aria-hidden="true" />
						)}
						{isSigningOut ? "Signing out..." : "Sign out"}
					</button>
				</div>
			</div>
		</div>
	);
}
