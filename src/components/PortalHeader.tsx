import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	Camera,
	Home,
	Loader2,
	LogOut,
	Moon,
	Sun,
	UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
	applyThemePreference,
	getThemePreference,
	setThemePreference,
} from "../lib/theme";
import { PortalBrand } from "./PortalBrand";
import { PortalLookup } from "./portal/PortalLookup";
import "./portal-header-layout.css";
import { PortalTooltip } from "./PortalTooltip";

interface PortalHeaderProps {
	title: string;
	onScan: () => void;
	activePage?: "home" | "package";
	maxWidth?: "max-w-4xl" | "max-w-7xl";
}

const utilityButtonClass =
	"inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-text-muted shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface active:bg-primary-100 max-[380px]:h-9 max-[380px]:w-9 sm:h-11 sm:w-11";

export function PortalHeader({
	title,
	onScan,
	activePage = "home",
	maxWidth = "max-w-7xl",
}: PortalHeaderProps) {
	const navigate = useNavigate();
	const { profile, user, signOut } = useAuth();
	const [isDark, setIsDark] = useState(false);
	const [signingOut, setSigningOut] = useState(false);

	useEffect(() => {
		const root = document.documentElement;
		const media = window.matchMedia("(prefers-color-scheme: dark)");

		// Re-apply the saved manual preference after hydration. The root route can
		// render on the server, where browser storage is unavailable, so without
		// this step a refresh could temporarily resolve back to the OS theme.
		applyThemePreference(getThemePreference());

		const syncResolvedTheme = () => {
			const appliedTheme = root.getAttribute("data-theme");
			if (appliedTheme === "dark") {
				setIsDark(true);
				return;
			}
			if (appliedTheme === "light") {
				setIsDark(false);
				return;
			}
			setIsDark(media.matches);
		};

		syncResolvedTheme();
		media.addEventListener("change", syncResolvedTheme);
		const observer = new MutationObserver(syncResolvedTheme);
		observer.observe(root, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});

		return () => {
			media.removeEventListener("change", syncResolvedTheme);
			observer.disconnect();
		};
	}, []);

	const nextTheme = isDark ? "light" : "dark";
	const displayName =
		profile?.full_name || profile?.username || user?.email || "Portal account";
	const secondaryIdentity = profile?.username || user?.email || "Client portal";

	const handleThemeToggle = () => {
		const appliedTheme = document.documentElement.getAttribute("data-theme");
		const currentlyDark =
			appliedTheme === "dark" ||
			(appliedTheme !== "light" &&
				window.matchMedia("(prefers-color-scheme: dark)").matches);
		const targetTheme = currentlyDark ? "light" : "dark";

		setThemePreference(targetTheme);
		setIsDark(targetTheme === "dark");
	};

	const handleSignOut = async () => {
		if (signingOut) return;
		setSigningOut(true);
		try {
			await signOut();
			navigate({ to: "/portal/login" });
		} finally {
			setSigningOut(false);
		}
	};

	return (
		<header className="portal-brand sticky top-0 z-40 border-b border-app-border bg-app-surface/95 backdrop-blur-xl">
			<div
				className={`${maxWidth} mx-auto px-3 min-[480px]:px-4 sm:px-6 lg:px-8`}
			>
				<div className="flex min-h-[4.25rem] flex-wrap items-center justify-between gap-2 py-2 sm:min-h-[4.75rem] sm:gap-3">
					<Link
						to="/portal/projects"
						className="flex min-w-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
						aria-label="Client portal home"
					>
						<PortalBrand
							variant="header"
							className={
								activePage === "package" ? "max-[479px]:[&>span]:hidden" : ""
							}
						/>
						<div className="ml-4 hidden min-w-0 border-l border-app-border pl-4 xl:block">
							<p className="text-[9px] font-bold uppercase tracking-[0.22em] text-app-text-muted">
								Client portal
							</p>
							<p className="mt-0.5 max-w-44 truncate text-sm font-semibold text-app-text-strong">
								{title}
							</p>
						</div>
					</Link>

					<PortalLookup clientId={profile?.client_id || null} />

					<nav
						className="flex shrink-0 items-center gap-0.5 rounded-2xl border border-app-border bg-app-surface-muted/60 p-1 shadow-[0_1px_3px_rgba(15,23,42,0.05)] min-[390px]:gap-1 sm:gap-1.5 sm:p-1.5"
						aria-label="Portal actions"
					>
						{activePage !== "home" && (
							<PortalTooltip
								label="Portal home"
								detail="Back to package access"
								align="start"
							>
								<Link
									to="/portal/projects"
									className={utilityButtonClass}
									aria-label="Portal home"
								>
									<Home className="h-[18px] w-[18px]" aria-hidden="true" />
								</Link>
							</PortalTooltip>
						)}

						<PortalTooltip label="Scan package" detail="Use your device camera">
							<button
								type="button"
								onClick={onScan}
								className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-500 bg-primary-600 text-white shadow-[0_3px_10px_rgba(0,94,168,0.22)] transition-[background-color,border-color,box-shadow] duration-150 hover:border-primary-400 hover:bg-primary-700 hover:shadow-[0_4px_14px_rgba(0,94,168,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface active:bg-primary-800 max-[380px]:h-9 max-[380px]:w-9 sm:h-11 sm:w-auto sm:gap-2 sm:px-3.5"
								aria-label="Scan package QR code"
							>
								<Camera
									className="h-[18px] w-[18px] text-white"
									aria-hidden="true"
								/>
								<span className="hidden text-sm font-semibold text-white sm:inline">
									Scan
								</span>
							</button>
						</PortalTooltip>

						<PortalTooltip
							label={nextTheme === "dark" ? "Dark mode" : "Light mode"}
							detail="Switch portal appearance"
						>
							<button
								type="button"
								onClick={handleThemeToggle}
								className={utilityButtonClass}
								aria-label={`Switch to ${nextTheme} theme`}
							>
								{isDark ? (
									<Sun className="h-[19px] w-[19px]" aria-hidden="true" />
								) : (
									<Moon className="h-[19px] w-[19px]" aria-hidden="true" />
								)}
							</button>
						</PortalTooltip>

						{user ? (
							<DropdownMenu.Root>
								<PortalTooltip
									label="Your account"
									detail="Profile & sign out"
									align="end"
								>
									<DropdownMenu.Trigger asChild>
										<button
											type="button"
											className={`${utilityButtonClass} text-app-text-strong`}
											aria-label="Open account menu"
										>
											<UserRound
												className="h-[19px] w-[19px]"
												aria-hidden="true"
											/>
										</button>
									</DropdownMenu.Trigger>
								</PortalTooltip>
								<DropdownMenu.Portal>
									<DropdownMenu.Content
										align="end"
										sideOffset={10}
										className="z-50 w-64 origin-top-right rounded-2xl border border-app-border bg-app-surface p-2 shadow-[0_18px_50px_-16px_rgba(15,23,42,0.35)] outline-none"
									>
										<div className="flex items-center gap-3 px-3 py-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 text-primary-700">
												<UserRound className="h-5 w-5" aria-hidden="true" />
											</div>
											<div className="min-w-0">
												<p className="truncate text-sm font-semibold text-app-text-strong">
													{displayName}
												</p>
												<p className="mt-0.5 truncate text-xs text-app-text-muted">
													{secondaryIdentity}
												</p>
											</div>
										</div>
										<DropdownMenu.Separator className="my-1 h-px bg-app-border" />
										<DropdownMenu.Item
											onSelect={() => void handleSignOut()}
											disabled={signingOut}
											className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold text-danger-700 outline-none transition-colors hover:bg-danger-50 focus:bg-danger-50 data-[disabled]:cursor-wait data-[disabled]:opacity-60"
										>
											{signingOut ? (
												<Loader2
													className="h-4 w-4 animate-spin"
													aria-hidden="true"
												/>
											) : (
												<LogOut className="h-4 w-4" aria-hidden="true" />
											)}
											{signingOut ? "Signing out..." : "Log out"}
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Portal>
							</DropdownMenu.Root>
						) : (
							<PortalTooltip
								label="Sign in"
								detail="Open client access"
								align="end"
							>
								<Link
									to="/portal/login"
									className={utilityButtonClass}
									aria-label="Log in"
								>
									<UserRound className="h-[19px] w-[19px]" aria-hidden="true" />
								</Link>
							</PortalTooltip>
						)}
					</nav>
				</div>
			</div>
		</header>
	);
}
