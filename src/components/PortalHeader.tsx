import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	Camera,
	ChevronDown,
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

	const scanButtonClass =
		"group relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary-500 bg-primary-600 text-sm font-semibold text-white shadow-sm shadow-primary-900/15 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary-400 hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none sm:h-11 sm:w-auto sm:gap-2 sm:px-3.5 dark:bg-primary-500 dark:hover:bg-primary-400";

	return (
		<header className="portal-brand sticky top-0 z-40 border-b border-app-border bg-app-surface/95 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl dark:shadow-[0_1px_0_rgba(15,23,42,0.2)]">
			<div className={`${maxWidth} mx-auto px-3 sm:px-6 lg:px-8`}>
				<div className="flex min-h-16 items-center gap-1.5 py-2 sm:min-h-[4.5rem] sm:gap-3">
					<Link
						to="/portal/projects"
						className="group mr-auto flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:gap-3"
						aria-label="Metrix-Assets client portal home"
					>
						<PortalBrand
							className="h-9 w-[7.5rem] border border-app-border shadow-sm transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary-300 group-hover:shadow-lg group-hover:shadow-primary-600/10 group-active:translate-y-0 group-active:scale-[0.97] group-focus-visible:border-primary-400 motion-reduce:transform-none motion-reduce:transition-none sm:h-10 sm:w-[9.5rem]"
							imageClassName="transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
						/>
						<div className="min-w-0">
							<p className="hidden truncate text-[9px] font-bold uppercase tracking-[0.24em] text-primary-700 dark:text-primary-300 sm:block">
								Metrix-Assets / Client access
							</p>
							<h1 className="truncate text-xs font-semibold tracking-tight text-app-text-strong min-[360px]:text-sm sm:text-base">
								{title}
							</h1>
						</div>
					</Link>

					<nav
						className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5"
						aria-label="Portal actions"
					>
						{activePage !== "home" && (
							<Link
								to="/portal/projects"
								className="group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app-border bg-app-surface text-sm font-semibold text-app-text-strong shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none sm:h-11 sm:w-auto sm:gap-2 sm:px-3.5 dark:hover:border-primary-800 dark:hover:bg-primary-950/40 dark:hover:text-primary-300"
								aria-label="Portal home"
								title="Home"
							>
								<Home
									className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
									aria-hidden="true"
								/>
								<span className="hidden sm:inline">Home</span>
							</Link>
						)}
						<button
							type="button"
							onClick={onScan}
							className={scanButtonClass}
							aria-label="Scan package QR code"
							title="Scan package"
						>
							<span
								className="pointer-events-none absolute inset-0 translate-y-full bg-white/10 transition-transform duration-200 group-hover:translate-y-0 motion-reduce:hidden"
								aria-hidden="true"
							/>
							<Camera
								className="relative h-4 w-4 text-white transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
								aria-hidden="true"
							/>
							<span className="relative hidden text-white sm:inline">
								Scan package
							</span>
						</button>
						<button
							type="button"
							onClick={handleThemeToggle}
							className="group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-neutral-600 transition-[background-color,color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none sm:h-11 sm:w-11 dark:text-steel-300 dark:hover:border-primary-800 dark:hover:bg-primary-950/40 dark:hover:text-primary-300"
							aria-label={`Switch to ${nextTheme} theme`}
							title={`Switch to ${nextTheme} theme`}
						>
							{isDark ? (
								<Sun
									className="h-5 w-5 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
									aria-hidden="true"
								/>
							) : (
								<Moon
									className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
									aria-hidden="true"
								/>
							)}
						</button>

						<div
							className="hidden h-7 w-px bg-neutral-200 md:block dark:bg-steel-700"
							aria-hidden="true"
						/>

						{user ? (
							<DropdownMenu.Root>
								<DropdownMenu.Trigger asChild>
									<button
										type="button"
										className="group inline-flex h-10 min-h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-1.5 text-sm font-semibold text-neutral-700 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:shadow-lg hover:shadow-primary-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none sm:h-11 sm:min-h-11 sm:px-3 dark:border-steel-700 dark:bg-steel-800 dark:text-steel-100 dark:hover:border-primary-800 dark:hover:bg-primary-950/40"
										aria-label="Open account menu"
										title="Account"
									>
										<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-primary-700 transition-[background-color,transform] duration-200 group-hover:scale-105 group-hover:bg-primary-200 motion-reduce:transform-none motion-reduce:transition-none dark:bg-primary-900/40 dark:text-primary-200 dark:group-hover:bg-primary-900/70">
											<UserRound
												className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
												aria-hidden="true"
											/>
										</span>
										<span className="hidden max-w-28 truncate lg:block">
											Account
										</span>
										<ChevronDown
											className="hidden h-4 w-4 text-neutral-400 transition-transform duration-200 group-hover:translate-y-0.5 group-data-[state=open]:rotate-180 motion-reduce:transform-none motion-reduce:transition-none sm:block"
											aria-hidden="true"
										/>
									</button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Portal>
									<DropdownMenu.Content
										align="end"
										sideOffset={8}
										className="z-50 min-w-60 origin-top-right rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl outline-none dark:border-steel-700 dark:bg-steel-900"
									>
										<div className="px-3 py-2.5">
											<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
												Signed in as
											</p>
											<p className="mt-1 max-w-52 truncate text-sm font-bold text-neutral-900">
												{displayName}
											</p>
										</div>
										<DropdownMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-steel-700" />
										<DropdownMenu.Item
											onSelect={() => void handleSignOut()}
											disabled={signingOut}
											className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold text-danger-700 outline-none transition-colors hover:bg-danger-50 focus:bg-danger-50 data-[disabled]:cursor-wait data-[disabled]:opacity-60 dark:text-danger-300 dark:hover:bg-danger-950/30 dark:focus:bg-danger-950/30"
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
							<Link
								to="/portal/login"
								className="group inline-flex h-10 min-h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-1.5 text-sm font-semibold text-neutral-700 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:shadow-lg hover:shadow-primary-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none sm:h-11 sm:min-h-11 sm:px-3 dark:border-steel-700 dark:bg-steel-800 dark:text-steel-100 dark:hover:border-primary-800 dark:hover:bg-primary-950/40"
								aria-label="Log in"
								title="Log in"
							>
								<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-primary-700 transition-[background-color,transform] duration-200 group-hover:scale-105 group-hover:bg-primary-200 motion-reduce:transform-none motion-reduce:transition-none dark:bg-primary-900/40 dark:text-primary-200 dark:group-hover:bg-primary-900/70">
									<UserRound
										className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
										aria-hidden="true"
									/>
								</span>
								<span className="hidden max-w-28 truncate lg:block">Login</span>
							</Link>
						)}
					</nav>
				</div>
			</div>
		</header>
	);
}
