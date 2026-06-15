import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Clock, Loader2, ShoppingCart, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Sidebar } from "../components/Sidebar";
import { useRequirePageAccess } from "../hooks/usePageAccess";
import { db } from "../lib/supabase";

export const Route = createFileRoute("/dashboard")({
	component: DashboardPage,
});

interface StatCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: React.ComponentType<{ className?: string }>;
	color: "blue" | "green" | "amber" | "purple" | "red";
	loading?: boolean;
}

const colorClasses = {
	blue: "bg-primary-500",
	green: "bg-success-500",
	amber: "bg-warning-500",
	purple: "bg-accent-500",
	red: "bg-danger-500",
};

function StatCard({
	title,
	value,
	subtitle,
	icon: Icon,
	color,
	loading,
}: StatCardProps) {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6 card-hover">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm font-medium text-neutral-500">{title}</p>
					<p className="text-3xl font-bold text-neutral-900 mt-2">
						{loading ? (
							<Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
						) : (
							value
						)}
					</p>
					{subtitle && (
						<p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
					)}
				</div>
				<div className={`p-3 rounded-xl ${colorClasses[color]}`}>
					<Icon className="w-6 h-6 text-white" />
				</div>
			</div>
		</div>
	);
}

const CHART_COLORS = {
	primary: "#3b82f6",
	success: "#10b981",
	warning: "#f59e0b",
};

function DashboardPage() {
	const { user, profile, loading: authLoading } = useRequirePageAccess();
	const navigate = useNavigate();
	const isClient = profile?.roles?.name === "client";
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const { data: orders, isLoading: ordersLoading } = useQuery({
		queryKey: ["orders"],
		queryFn: async () => {
			const { data, error } = await db.getOrders();
			if (error) throw error;
			return data || [];
		},
		enabled: !!user,
		staleTime: 30000,
	});

	const { data: users, isLoading: usersLoading } = useQuery({
		queryKey: ["users"],
		queryFn: async () => {
			const { data, error } = await db.getUsers();
			if (error) throw error;
			return data || [];
		},
		// Clients must not see staff/user counts.
		enabled: !!user && !isClient,
		staleTime: 30000,
	});

	const stats = {
		total: orders?.length || 0,
		pending:
			orders?.filter((o: any) => o.production_status === "pending").length || 0,
		inProgress:
			orders?.filter((o: any) => o.production_status === "in_progress")
				.length || 0,
		completed:
			orders?.filter((o: any) => o.production_status === "completed").length ||
			0,
	};

	const pieData = [
		{ name: "Pending", value: stats.pending, color: CHART_COLORS.warning },
		{
			name: "In Progress",
			value: stats.inProgress,
			color: CHART_COLORS.primary,
		},
		{ name: "Completed", value: stats.completed, color: CHART_COLORS.success },
	].filter((d) => d.value > 0);

	// Weekly data - empty until real data is implemented
	const weeklyData: { name: string; orders: number; completed: number }[] = [];

	if (authLoading) {
		return (
			<div
				suppressHydrationWarning
				className="min-h-screen flex items-center justify-center bg-neutral-50"
			>
				<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
			</div>
		);
	}

	return (
		<div suppressHydrationWarning className="flex h-screen bg-neutral-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<div className="p-8 animate-fade-in">
					<div className="mb-8">
						<h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
						<p className="text-neutral-500 mt-1">
							Welcome back, {profile?.full_name || "Admin"}!
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						<StatCard
							title="Total Orders"
							value={stats.total}
							icon={ShoppingCart}
							color="blue"
							loading={ordersLoading}
						/>
						<StatCard
							title="In Progress"
							value={stats.inProgress}
							subtitle={`${stats.pending} pending`}
							icon={Clock}
							color="amber"
							loading={ordersLoading}
						/>
						<StatCard
							title="Completed"
							value={stats.completed}
							icon={CheckCircle}
							color="green"
							loading={ordersLoading}
						/>
						{!isClient && (
							<StatCard
								title="Active Users"
								value={users?.length || 0}
								icon={Users}
								color="purple"
								loading={usersLoading}
							/>
						)}
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
						<div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-neutral-100 p-6">
							<h2 className="text-lg font-semibold text-neutral-900 mb-4">
								Weekly Orders
							</h2>
							<div className="h-80">
								{isMounted && weeklyData.length > 0 ? (
									<ResponsiveContainer
										width="100%"
										height="100%"
										minWidth={0}
										minHeight={280}
									>
										<BarChart data={weeklyData}>
											<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
											<XAxis dataKey="name" stroke="#64748b" fontSize={12} />
											<YAxis stroke="#64748b" fontSize={12} />
											<Tooltip />
											<Legend />
											<Bar
												dataKey="orders"
												name="Orders"
												fill="#3b82f6"
												radius={[4, 4, 0, 0]}
											/>
											<Bar
												dataKey="completed"
												name="Completed"
												fill="#10b981"
												radius={[4, 4, 0, 0]}
											/>
										</BarChart>
									</ResponsiveContainer>
								) : (
									<div className="flex items-center justify-center h-full text-neutral-400">
										<p>Weekly orders chart coming soon</p>
									</div>
								)}
							</div>
						</div>

						<div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6">
							<h2 className="text-lg font-semibold text-neutral-900 mb-4">
								Order Status
							</h2>
							<div className="h-80">
								{isMounted ? (
									<ResponsiveContainer
										width="100%"
										height="100%"
										minWidth={0}
										minHeight={280}
									>
										<PieChart>
											<Pie
												data={pieData}
												cx="50%"
												cy="50%"
												innerRadius={60}
												outerRadius={100}
												paddingAngle={2}
												dataKey="value"
											>
												{pieData.map((entry) => (
													<Cell key={entry.name} fill={entry.color} />
												))}
											</Pie>
											<Tooltip />
											<Legend />
										</PieChart>
									</ResponsiveContainer>
								) : (
									<div className="flex items-center justify-center h-full text-neutral-400">
										<p>Loading chart...</p>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
						<div className="px-6 py-4 border-b border-neutral-100">
							<h2 className="text-lg font-semibold text-neutral-900">
								Recent Orders
							</h2>
						</div>
						{ordersLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
							</div>
						) : (
							<table className="w-full">
								<thead className="bg-neutral-50">
									<tr>
										<th className="text-left py-3 px-6 text-sm font-medium text-neutral-500">
											Order
										</th>
										<th className="text-left py-3 px-6 text-sm font-medium text-neutral-500">
											Client
										</th>
										<th className="text-left py-3 px-6 text-sm font-medium text-neutral-500">
											Status
										</th>
										<th className="text-left py-3 px-6 text-sm font-medium text-neutral-500">
											Date
										</th>
									</tr>
								</thead>
								<tbody>
									{orders?.slice(0, 5).map((order: any) => (
										<tr
											key={order.id}
											className="border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer"
											onClick={() =>
												navigate({
													to: "/orders/$orderId",
													params: { orderId: order.id },
												})
											}
										>
											<td className="py-4 px-6 text-sm font-medium text-neutral-900">
												{order.order_name}
											</td>
											<td className="py-4 px-6 text-sm text-neutral-600">
												{order.client_name}
											</td>
											<td className="py-4 px-6">
												<span
													className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
														order.production_status === "completed"
															? "bg-success-100 text-success-700"
															: order.production_status === "in_progress"
																? "bg-primary-100 text-primary-700"
																: "bg-warning-100 text-warning-700"
													}`}
												>
													{order.production_status?.replace("_", " ")}
												</span>
											</td>
											<td className="py-4 px-6 text-sm text-neutral-500">
												{new Date(order.created_at).toLocaleDateString()}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
