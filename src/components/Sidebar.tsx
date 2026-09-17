import * as Dialog from "@radix-ui/react-dialog";
import { Link, useLocation } from "@tanstack/react-router";
import {
	Building2,
	ClipboardList,
	Copy,
	FileText,
	LayoutDashboard,
	LogOut,
	Menu,
	Package,
	PanelLeftClose,
	PanelLeftOpen,
	Settings,
	ShoppingCart,
	Users,
	X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { canAccessPage } from "../lib/access";
import { cn } from "../lib/cn";

const SIDEBAR_STORAGE_KEY = "ipac-admin-sidebar-collapsed";
const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 80;

const navItems = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/my-orders", label: "My Orders", icon: ShoppingCart },
	{ to: "/orders", label: "Orders", icon: ShoppingCart },
	{ to: "/clients", label: "Clients", icon: Building2 },
	{ to: "/users", label: "Users", icon: Users },
	{ to: "/inventory", label: "Inventory", icon: Package },
	{ to: "/inventory-duplicates", label: "Variant Duplicates", icon: Copy },
	{ to: "/requests", label: "Requests", icon: ClipboardList },
	{ to: "/reports", label: "Reports", icon: FileText },
	{ to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
	const location = useLocation();
	const { profile, signOut } = useAuth();
	const reduceMotion = useReducedMotion();
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);

	const role = profile?.roles?.name ?? null;
	const visibleNavItems = navItems.filter((item) =>
		canAccessPage(role, item.to),
	);
	const displayName = profile?.full_name || "Admin";
	const displayRole = profile?.roles?.name || "User";
	const userInitial = profile?.full_name?.charAt(0) || "A";

	useEffect(() => {
		try {
			setCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
		} catch {
			// Storage can be unavailable in restricted browser contexts.
		}
	}, []);

	useEffect(() => {
		setMobileOpen(false);
	}, [location.pathname]);

	const toggleCollapsed = () => {
		setCollapsed((current) => {
			const next = !current;
			try {
				localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
			} catch {
				// Keep the in-memory preference when storage is unavailable.
			}
			return next;
		});
	};

	const renderNavigation = (compact = false, onNavigate?: () => void) =>
		visibleNavItems.map((item) => {
			const isActive =
				location.pathname === item.to ||
				location.pathname.startsWith(`${item.to}/`);

			return (
				<Link
					key={item.to}
					to={item.to}
					onClick={onNavigate}
					aria-label={compact ? item.label : undefined}
					title={compact ? item.label : undefined}
					className={cn(
						"flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
						compact ? "justify-center px-2" : "gap-3 px-3",
						isActive
							? "bg-primary-50 text-primary-700"
							: "text-neutral-700 hover:bg-neutral-100",
					)}
				>
					<item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
					{!compact && <span className="truncate">{item.label}</span>}
				</Link>
			);
		});

	const motionTransition = reduceMotion
		? { duration: 0 }
		: { duration: 0.18, ease: "easeOut" as const };

	return (
		<>
			<motion.aside
				initial={false}
				animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
				transition={motionTransition}
				className="hidden h-screen shrink-0 flex-col border-r border-neutral-200 bg-white md:flex"
			>
				<div
					className={cn(
						"flex h-16 shrink-0 items-center border-b border-neutral-200",
						collapsed ? "justify-center px-2" : "justify-between px-4",
					)}
				>
					{!collapsed && (
						<h1 className="truncate text-xl font-bold text-neutral-900">
							IPAC Admin
						</h1>
					)}
					<button
						type="button"
						onClick={toggleCollapsed}
						aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
						title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
					>
						{collapsed ? (
							<PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
						) : (
							<PanelLeftClose className="h-5 w-5" aria-hidden="true" />
						)}
					</button>
				</div>

				<div
					className={cn(
						"border-b border-neutral-100 py-4",
						collapsed ? "px-2" : "px-4",
					)}
				>
					<div
						className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}
						title={collapsed ? `${displayName} · ${displayRole}` : undefined}
					>
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
							<span className="font-semibold text-primary-600">{userInitial}</span>
						</div>
						{!collapsed && (
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-neutral-900">
									{displayName}
								</p>
								<p className="truncate text-xs text-neutral-500">{displayRole}</p>
							</div>
						)}
					</div>
				</div>

				<nav
					className={cn(
						"flex-1 space-y-1 overflow-y-auto py-4",
						collapsed ? "px-2" : "px-3",
					)}
					aria-label="Admin navigation"
				>
					{renderNavigation(collapsed)}
				</nav>

				<div className={cn("border-t border-neutral-200 p-3", collapsed && "px-2")}>
					<button
						type="button"
						onClick={signOut}
						aria-label={collapsed ? "Sign Out" : undefined}
						title={collapsed ? "Sign Out" : undefined}
						className={cn(
							"flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100",
							collapsed ? "justify-center px-2" : "gap-3 px-3",
						)}
					>
						<LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
						{!collapsed && <span>Sign Out</span>}
					</button>
				</div>
			</motion.aside>

			<Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
				<div className="flex h-screen w-14 shrink-0 flex-col items-center border-r border-neutral-200 bg-white py-3 md:hidden">
					<Dialog.Trigger asChild>
						<button
							type="button"
							aria-label="Open navigation"
							className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
						>
							<Menu className="h-5 w-5" aria-hidden="true" />
						</button>
					</Dialog.Trigger>
				</div>

				<Dialog.Portal forceMount>
					<AnimatePresence initial={false}>
						{mobileOpen && (
							<>
								<Dialog.Overlay asChild forceMount>
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={motionTransition}
										className="fixed inset-0 z-40 bg-neutral-950/45 backdrop-blur-[1px] md:hidden"
									/>
								</Dialog.Overlay>

								<Dialog.Content asChild forceMount>
									<motion.aside
										initial={{ x: reduceMotion ? 0 : "-100%" }}
										animate={{ x: 0 }}
										exit={{ x: reduceMotion ? 0 : "-100%" }}
										transition={motionTransition}
										className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-3.5rem)] flex-col border-r border-neutral-200 bg-white shadow-xl outline-none md:hidden"
									>
										<Dialog.Title className="sr-only">Admin navigation</Dialog.Title>
										<Dialog.Description className="sr-only">
											Navigate between admin panel pages.
										</Dialog.Description>

										<div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-4">
											<h1 className="text-xl font-bold text-neutral-900">IPAC Admin</h1>
											<Dialog.Close asChild>
												<button
													type="button"
													aria-label="Close navigation"
													className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
												>
													<X className="h-5 w-5" aria-hidden="true" />
												</button>
											</Dialog.Close>
										</div>

										<div className="border-b border-neutral-100 px-4 py-4">
											<div className="flex items-center gap-3">
												<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
													<span className="font-semibold text-primary-600">{userInitial}</span>
												</div>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium text-neutral-900">
														{displayName}
													</p>
													<p className="truncate text-xs text-neutral-500">{displayRole}</p>
												</div>
											</div>
										</div>

										<nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Mobile admin navigation">
											{renderNavigation(false, () => setMobileOpen(false))}
										</nav>

										<div className="border-t border-neutral-200 p-3">
											<button
												type="button"
												onClick={() => {
													setMobileOpen(false);
													void signOut();
												}}
												className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
											>
												<LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
												<span>Sign Out</span>
											</button>
										</div>
									</motion.aside>
								</Dialog.Content>
							</>
						)}
					</AnimatePresence>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}
