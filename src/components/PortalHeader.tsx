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
	getThemePreference,
	setThemePreference,
	type ThemePreference,
} from "../lib/theme";
import { PortalBrand } from "./PortalBrand";

interface PortalHeaderProps {
	title: string;
	onScan: () => void;
	activePage?: "home" | "package";
	maxWidth?: "max-w-4xl" | "max-w-7xl";
}

const utilityButtonClass =
	"inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-text-muted shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:bg-primary-100 max-[380px]:h-9 max-[380px]:w-9 sm:h-11 sm:w-11 dark:hover:border-primary-700 dark:hover:bg-primary-950/35 dark:hover:text-primary-200";

export function PortalHeader({
	title,
	onScan,
	activePage = "home",
	maxWidth = "max-w-4xl",
}: PortalHeaderProps) {
	const navigate = useNavigate();
	const { profile, user, signOut } = useAuth();
	const [themePreference, setThemePreferenceState] =
		useState<ThemePreference>("system");
	const [systemDark, setSystemDark] = useState(false);
	const [signingOut, setSigningOut] = useState(false);

	useEffect(() => {
		setThemePreferenceState(getThemePreference());
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const updateSystemTheme = () => setSystemDark(media.matches);
		updateSystemTheme();
		media.addEventListener("change", updateSystemTheme);
		return () => media.removeEventListener("change", updateSystemTheme);
	}, []);

	const isDark =
		themePreference === "dark" || (themePreference === "system" && systemDark);
	const nextTheme = isDark ? "light" : "dark";
	const displayName =
		profile?.full_name || profile?.username || user?.email || "Portal account";
	const secondaryIdentity = profile?.username || user?.email || "Client portal";

	const handleThemeToggle = () => {
		setThemePreference(nextTheme);
		setThemePreferenceState(nextTheme);
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
				<div className="flex min-h-[4.25rem] items-center justify-between gap-3 py-2 sm:min-h-[4.75rem]">
					<Link
						to="/portal/projects"
						className="flex min-w-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
						aria-label="Client portal home"
					>
						<PortalBrand variant="header" />
						<div className="ml-4 hidden min-w-0 border-l border-app-border pl-4 xl:block">
							<p className="text-[9px] font-bold uppercase tracking-[0.22em] text-app-text-muted">
								Client portal
							</p>
							<p className="mt-0.5 max-w-44 truncate text-sm font-semibold text-app-text-strong">
								{title}
							</p>
						</div>
					</Link>

					<nav
						className="flex shrink-0 items-center gap-1 rounded-2xl border border-app-border bg-app-surface-muted/60 p-1 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:gap-1.5 sm:p-1.5"
						aria-label="Portal actions"
					>
						{activePage !== "home" && (
							<Link
								to="/portal/projects"
								className={utilityButtonClass}
								aria-label="Portal home"
								title="Home"
							>
								<Home className="h-[18px] w-[18px]" aria-hidden="true" />
							</Link>
						)}

						<button
							type="button"
							onClick={onScan}
							className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-500 bg-primary-600 text-white shadow-[0_3px_10px_rgba(0,94,168,0.22)] transition-[background-color,border-color,box-shadow] duration-150 hover:border-primary-400 hover:bg-primary-700 hover:shadow-[0_4px_14px_rgba(0,94,168,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:bg-primary-800 max-[380px]:h-9 max-[380px]:w-9 sm:h-11 sm:w-auto sm:gap-2 sm:px-3.5 dark:bg-primary-500 dark:hover:bg-primary-400"
							aria-label="Scan package QR code"
							title="Scan package"
						>
							<Camera className="h-[18px] w-[18px] text-white" aria-hidden="true" />
							<span className="hidden text-sm font-semibold text-white sm:inline">
								Scan
							</span>
						</button>

						<button
							type="button"
							onClick={handleThemeToggle}
							className={utilityButtonClass}
							aria-label={`Switch to ${nextTheme} theme`}
							title={`Switch to ${nextTheme} theme`}
						>
							{isDark ? (
								<Sun className="h-[19px] w-[19px]" aria-hidden="true" />
							) : (
								<Moon className="h-[19px] w-[19px]" aria-hidden="true" />
							)}
						</button>

						{user ? (
							<DropdownMenu.Root>
								<DropdownMenu.Trigger asChild>
									<button
										type="button"
										className={`${utilityButtonClass} relative text-app-text-strong`}
										aria-label="Open account menu"
										title="Account"
									>
										<UserRound className="h-[19px] w-[19px]" aria-hidden="true" />
										<span
											className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full border border-app-surface bg-success-500"
											aria-hidden="true"
										/>
									</button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Portal>
									<DropdownMenu.Content
										align="end"
										sideOffset={10}
										className="z-50 w-64 origin-top-right rounded-2xl border border-app-border bg-app-surface p-2 shadow-[0_18px_50px_-16px_rgba(15,23,42,0.35)] outline-none"
									>
										<div className="flex items-center gap-3 px-3 py-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200">
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
											className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold text-danger-700 outline-none transition-colors hover:bg-danger-50 focus:bg-danger-50 data-[disabled]:cursor-wait data-[disabled]:opacity-60 dark:text-danger-300 dark:hover:bg-danger-950/30 dark:focus:bg-danger-950/30"
										>
											{signingOut ? (
												<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
											) : (
												<LogOut className="h-4 w-4" aria-hidden="true" />
											)}
											{signingOut ? "Signing out..." : "Log out"}
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Portal>
							</DropdownMenu.Root>
						) : (
							<Link
								to="/portal/login"
								className={utilityButtonClass}
								aria-label="Log in"
								title="Log in"
							>
								<UserRound className="h-[19px] w-[19px]" aria-hidden="true" />
							</Link>
						)}
					</nav>
				</div>
			</div>
		</header>
	);
}
