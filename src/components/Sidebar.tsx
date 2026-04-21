import { Link, useLocation } from "@tanstack/react-router";
import {
	Building2,
	ClipboardList,
	Copy,
	FileText,
	LayoutDashboard,
	LogOut,
	Package,
	Settings,
	ShoppingCart,
	Users,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/cn";

const navItems = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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

	return (
		<aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
			{/* Logo */}
			<div className="h-16 flex items-center px-6 border-b border-gray-200">
				<h1 className="text-xl font-bold text-gray-900">IPAC Admin</h1>
			</div>

			{/* User Info */}
			<div className="px-4 py-4 border-b border-gray-100">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
						<span className="text-blue-600 font-semibold">
							{profile?.full_name?.charAt(0) || "A"}
						</span>
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-gray-900 truncate">
							{profile?.full_name || "Admin"}
						</p>
						<p className="text-xs text-gray-500 truncate">
							{profile?.roles?.name || "User"}
						</p>
					</div>
				</div>
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
				{navItems.map((item) => {
					const isActive =
						location.pathname === item.to ||
						location.pathname.startsWith(`${item.to}/`);
					return (
						<Link
							key={item.to}
							to={item.to}
							className={cn(
								"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
								isActive
									? "bg-blue-50 text-blue-700"
									: "text-gray-700 hover:bg-gray-100",
							)}
						>
							<item.icon className="w-5 h-5" />
							{item.label}
						</Link>
					);
				})}
			</nav>

			{/* Sign Out */}
			<div className="p-3 border-t border-gray-200">
				<button
					type="button"
					onClick={signOut}
					className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
				>
					<LogOut className="w-5 h-5" />
					Sign Out
				</button>
			</div>
		</aside>
	);
}
