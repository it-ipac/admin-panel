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
import { ToastProvider } from "../components/ui/ToastProvider";
import { AuthContext, useAuthState } from "../hooks/useAuth";
import { getThemePreference } from "../lib/theme";
import portalScrollFixesCss from "../portal-scroll-fixes.css?url";
import appCss from "../styles.css?url";

// Create a client
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

	return (
		<RootDocument theme={theme}>
			<div className="min-h-screen flex items-center justify-center bg-neutral-50">
				<div className="text-center">
					<h1 className="text-6xl font-bold text-neutral-300">404</h1>
					<p className="text-xl text-neutral-600 mt-4">Page not found</p>
					<Link
						to="/dashboard"
						className="inline-block mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
					>
						Go to Dashboard
					</Link>
				</div>
			</div>
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

function WorkspaceSwitchDialog({
	open,
	pending,
	onCancel,
	onConfirm,
}: Readonly<{
	open: boolean;
	pending: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}>) {
	return (
		<Dialog.Root
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !pending) onCancel();
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-[10000] bg-steel-950/65 backdrop-blur-sm" />
				<Dialog.Content className="fixed left-1/2 top-1/2 z-[10000] w-[calc(100%-2rem)] max-w-[28rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-2xl focus:outline-none">
					<div className="px-6 pb-6 pt-7">
						<div className="mb-6 flex items-center gap-2.5" aria-hidden="true">
							<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
								<PackageCheck className="h-6 w-6" />
							</span>
							<ArrowRight className="h-5 w-5 text-app-text-muted" />
							<span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-app-border bg-app-surface-muted text-app-text-strong shadow-sm">
								<LayoutDashboard className="h-6 w-6" />
							</span>
						</div>

						<Dialog.Title className="text-2xl font-bold tracking-tight text-app-text-strong sm:text-[1.75rem]">
							Leave Package Portal?
						</Dialog.Title>
					</div>

					<div className="flex gap-3 border-t border-app-border bg-app-surface p-4">
						<button
							type="button"
							onClick={onCancel}
							disabled={pending}
							className="h-12 flex-1 whitespace-nowrap rounded-xl border border-app-border px-4 text-base font-semibold text-app-text-strong transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50"
						>
							Stay
						</button>
						<button
							type="button"
							onClick={onConfirm}
							disabled={pending}
							className="inline-flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary-600 px-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
						>
							{pending ? (
								<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
							) : (
								<LogOut className="h-4 w-4" aria-hidden="true" />
							)}
							{pending ? "Signing out" : "Sign out"}
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
	const { theme } = Route.useLoaderData();
	const location = useLocation();
	const navigate = useNavigate();
	const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
	const showTanStackDevtools =
		import.meta.env.DEV &&
		import.meta.env.VITE_ENABLE_TANSTACK_DEVTOOLS === "true";
	const role = authState.profile?.roles?.name ?? null;
	const isClientUser = role === "client";
	const isPortalRoute = location.pathname.startsWith("/portal");
	const shouldPromptForDashboard =
		!authState.loading &&
		!!authState.user &&
		!!authState.profile &&
		isClientUser &&
		!isPortalRoute;

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	useEffect(() => {
		if (shouldPromptForDashboard) return;
		setIsSwitchingWorkspace(false);
	}, [shouldPromptForDashboard]);

	const handleDashboardAccessRequest = async () => {
		setIsSwitchingWorkspace(true);
		try {
			await authState.signOut();
			navigate({ to: "/login" });
		} finally {
			setIsSwitchingWorkspace(false);
		}
	};

	if (shouldPromptForDashboard) {
		return (
			<RootDocument theme={theme}>
				<WorkspaceSwitchDialog
					open
					onCancel={() => navigate({ to: "/portal/projects" })}
					onConfirm={handleDashboardAccessRequest}
					pending={isSwitchingWorkspace}
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
				</AuthContext.Provider>
			</QueryClientProvider>
		</RootDocument>
	);
}
