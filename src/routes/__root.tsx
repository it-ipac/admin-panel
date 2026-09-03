/// <reference types="vite/client" />

import * as Dialog from "@radix-ui/react-dialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import {
	ArrowRight,
	LayoutDashboard,
	Loader2,
	LogOut,
	PackageCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PortalBrand } from "../components/PortalBrand";
import { ToastProvider } from "../components/ui/ToastProvider";
import { AuthContext, useAuthState } from "../hooks/useAuth";
import {
	getAccountAreaMismatch,
	type AccountAreaMismatch,
} from "../lib/accountAreaAccess";
import { getThemePreference } from "../lib/theme";
import portalScrollFixesCss from "../portal-scroll-fixes.css?url";
import appCss from "../styles.css?url";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			retry: 1,
		},
	},
});

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "IPAC Admin Panel" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "stylesheet", href: portalScrollFixesCss },
			{ rel: "icon", href: "/IPAC_favicon.ico" },
		],
	}),
	loader: async () => {
		return { theme: getThemePreference() };
	},
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
});

function NotFoundComponent() {
	let theme: string | undefined;
	try {
		// biome-ignore lint/correctness/useHookAtTopLevel: required for tanstack router not-found fallback
		const data = Route.useLoaderData();
		theme = data?.theme;
	} catch {
		// Route.useLoaderData might throw if loader hasn't run or is not found context
	}

	const location = useLocation();
	const isPortalNotFound = location.pathname.startsWith("/portal");

	return (
		<RootDocument theme={theme}>
			{isPortalNotFound ? (
				<div className="portal-brand flex min-h-screen items-center justify-center bg-app-bg p-4 sm:p-6">
					<div className="w-full max-w-md rounded-3xl border border-app-border bg-app-surface p-7 text-center shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] sm:p-8">
						<PortalBrand
							variant="full"
							showTagline
							className="mx-auto mb-6 justify-center"
							markClassName="!w-[6rem] sm:!w-[6.75rem]"
						/>
						<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary-700 dark:text-primary-300">
							404 · Client Portal
						</p>
						<h1 className="mt-3 text-2xl font-bold tracking-tight text-app-text-strong sm:text-3xl">
							Package portal page not found
						</h1>
						<p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-app-text-muted">
							The link may be outdated or incomplete. Return to the package portal and scan the label again.
						</p>
						<Link
							to="/portal/projects"
							className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface dark:bg-primary-500 dark:hover:bg-primary-400"
						>
							<span className="text-white">Return to Package Portal</span>
						</Link>
					</div>
				</div>
			) : (
				<div className="flex min-h-screen items-center justify-center bg-app-bg p-4">
					<div className="text-center">
						<h1 className="text-6xl font-bold text-app-text-muted">404</h1>
						<p className="mt-4 text-xl text-app-text-subtle">Page not found</p>
						<Link
							to="/dashboard"
							className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-3 text-white transition-colors hover:bg-primary-700"
						>
							<span className="text-white">Go to Dashboard</span>
						</Link>
					</div>
				</div>
			)}
		</RootDocument>
	);
}

function RootDocument({
	children,
	theme,
}: Readonly<{ children: ReactNode; theme?: string }>) {
	const dataTheme = theme === "dark" || theme === "light" ? theme : undefined;
	const style =
		theme === "dark"
			? { colorScheme: "dark" }
			: theme === "light"
				? { colorScheme: "light" }
				: undefined;

	return (
		<html
			lang="en"
			data-theme={dataTheme}
			style={style}
			suppressHydrationWarning
		>
			<head suppressHydrationWarning>
				<HeadContent />
			</head>
			<body suppressHydrationWarning>
				{children}
				<Scripts />
			</body>
		</html>
	);
}

function AccountAreaMismatchDialog({
	mismatch,
	displayName,
	pending,
	onGoToCorrectArea,
	onSignOut,
}: Readonly<{
	mismatch: AccountAreaMismatch;
	displayName?: string | null;
	pending: boolean;
	onGoToCorrectArea: () => void;
	onSignOut: () => void;
}>) {
	const isClientInAdmin = mismatch === "client-in-admin";
	const title = isClientInAdmin ? "Client Account" : "Staff Account";
	const destinationLabel = isClientInAdmin
		? "Go to Package Portal"
		: "Go to Admin Panel";
	const description = isClientInAdmin
		? "You're signed in with a client account. The Admin Panel is for staff accounts only."
		: `You're signed in as a staff member${displayName ? ` (${displayName})` : ""}. The Package Portal is for client accounts only.`;

	return (
		<Dialog.Root
			open
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !pending) onGoToCorrectArea();
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-[10000] bg-steel-950/65 backdrop-blur-sm" />
				<Dialog.Content className="fixed left-1/2 top-1/2 z-[10000] w-[calc(100%-2rem)] max-w-[30rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-2xl focus:outline-none">
					<div className="px-6 pb-6 pt-7">
						<div className="mb-6 flex items-center gap-2.5" aria-hidden="true">
							<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
								{isClientInAdmin ? (
									<LayoutDashboard className="h-6 w-6" />
								) : (
									<PackageCheck className="h-6 w-6" />
								)}
							</span>
							<ArrowRight className="h-5 w-5 text-app-text-muted" />
							<span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-app-border bg-app-surface-muted text-app-text-strong shadow-sm">
								{isClientInAdmin ? (
									<PackageCheck className="h-6 w-6" />
								) : (
									<LayoutDashboard className="h-6 w-6" />
								)}
							</span>
						</div>

						<Dialog.Title className="text-2xl font-bold tracking-tight text-app-text-strong sm:text-[1.75rem]">
							{title}
						</Dialog.Title>
						<Dialog.Description className="mt-3 text-sm leading-6 text-app-text-muted">
							{description}
						</Dialog.Description>
					</div>

					<div className="flex flex-col-reverse gap-3 border-t border-app-border bg-app-surface p-4 sm:flex-row">
						<button
							type="button"
							onClick={onSignOut}
							disabled={pending}
							className="inline-flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-app-border px-4 text-base font-semibold text-app-text-strong transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface disabled:cursor-wait disabled:opacity-60"
						>
							{pending ? (
								<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
							) : (
								<LogOut className="h-4 w-4" aria-hidden="true" />
							)}
							<span>{pending ? "Signing out" : "Sign out"}</span>
						</button>
						<button
							type="button"
							onClick={onGoToCorrectArea}
							disabled={pending}
							className="h-12 flex-1 whitespace-nowrap rounded-xl bg-primary-600 px-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface disabled:opacity-50"
						>
							<span className="text-white">{destinationLabel}</span>
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function RootComponent() {
	const authState = useAuthState();
	const [isHydrated, setIsHydrated] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const { theme } = Route.useLoaderData();
	const location = useLocation();
	const navigate = useNavigate();
	const showTanStackDevtools =
		import.meta.env.DEV &&
		import.meta.env.VITE_ENABLE_TANSTACK_DEVTOOLS === "true";
	const role = authState.profile?.roles?.name ?? null;
	const accountAreaMismatch =
		!authState.loading && authState.user && authState.profile
			? getAccountAreaMismatch(
					role,
					location.pathname,
					authState.profile.client_id ?? null,
				)
			: null;

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	useEffect(() => {
		if (accountAreaMismatch) return;
		setIsSigningOut(false);
	}, [accountAreaMismatch]);

	const goToCorrectArea = () => {
		if (accountAreaMismatch === "client-in-admin") {
			navigate({ to: "/portal/projects" });
			return;
		}

		navigate({ to: "/dashboard" });
	};

	const handleSignOut = async () => {
		if (!accountAreaMismatch) return;

		setIsSigningOut(true);
		try {
			const signOutDestination =
				accountAreaMismatch === "client-in-admin" ? "/login" : "/portal/login";
			await authState.signOut();
			navigate({ to: signOutDestination });
		} finally {
			setIsSigningOut(false);
		}
	};

	if (accountAreaMismatch) {
		return (
			<RootDocument theme={theme}>
				<AccountAreaMismatchDialog
					mismatch={accountAreaMismatch}
					displayName={
						authState.profile?.full_name || authState.profile?.username
					}
					pending={isSigningOut}
					onGoToCorrectArea={goToCorrectArea}
					onSignOut={handleSignOut}
				/>
			</RootDocument>
		);
	}

	return (
		<RootDocument theme={theme}>
			<QueryClientProvider client={queryClient}>
				<AuthContext.Provider value={authState}>
					<ToastProvider>
						<Outlet />
						{showTanStackDevtools && isHydrated && (
							<TanStackRouterDevtools position="bottom-right" />
						)}
					</ToastProvider>
			</QueryClientProvider>
		</RootDocument>
	);
}
