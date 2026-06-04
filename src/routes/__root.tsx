/// <reference types="vite/client" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ToastProvider } from "../components/ui/ToastProvider";
import { AuthContext, useAuthState } from "../hooks/useAuth";
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

const getThemeCookie = createServerFn({ method: "GET" }).handler(async () => {
	const theme = getCookie("ipac-theme-preference") || "system";
	return theme;
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
			{ rel: "icon", href: "/IPAC_favicon.ico" },
		],
	}),
	loader: async () => {
		const theme = await getThemeCookie();
		return { theme };
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
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<h1 className="text-6xl font-bold text-gray-300">404</h1>
					<p className="text-xl text-gray-600 mt-4">Page not found</p>
					<Link
						to="/dashboard"
						className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

function RootComponent() {
	const authState = useAuthState();
	const [isHydrated, setIsHydrated] = useState(false);
	const { theme } = Route.useLoaderData();
	const showTanStackDevtools =
		import.meta.env.DEV &&
		import.meta.env.VITE_ENABLE_TANSTACK_DEVTOOLS === "true";

	useEffect(() => {
		setIsHydrated(true);
	}, []);

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
