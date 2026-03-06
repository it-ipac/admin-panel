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
import type { ReactNode } from "react";
import { useEffect } from "react";
import { AuthContext, useAuthState } from "../hooks/useAuth";
import { ToastProvider } from "../components/ui/ToastProvider";
import {
	applyThemePreference,
	getThemePreference,
	subscribeThemePreference,
	watchSystemTheme,
} from "../lib/theme";
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
			{ rel: "icon", href: "/IPAC_favicon.ico" },
		],
	}),
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
});

function NotFoundComponent() {
	return (
		<RootDocument>
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

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
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

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		let stopSystemWatcher = () => {};

		const applyWithWatcher = (preference: "light" | "dark" | "system") => {
			applyThemePreference(preference);
			stopSystemWatcher();
			if (preference === "system") {
				stopSystemWatcher = watchSystemTheme(() =>
					applyThemePreference("system"),
				);
			}
		};

		applyWithWatcher(getThemePreference());

		const stopPreferenceWatcher = subscribeThemePreference((preference) => {
			applyWithWatcher(preference);
		});

		return () => {
			stopSystemWatcher();
			stopPreferenceWatcher();
		};
	}, []);

	return (
		<RootDocument>
			<QueryClientProvider client={queryClient}>
				<AuthContext.Provider value={authState}>
					<ToastProvider>
						<Outlet />
						{import.meta.env.DEV && (
							<TanStackRouterDevtools position="bottom-right" />
						)}
					</ToastProvider>
				</AuthContext.Provider>
			</QueryClientProvider>
		</RootDocument>
	);
}
