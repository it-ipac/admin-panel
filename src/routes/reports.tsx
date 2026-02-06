import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Clock, Loader2, Package, Users } from "lucide-react";
import { useEffect } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { db } from "../lib/supabase";

export const Route = createFileRoute("/reports")({
	component: ReportsPage,
});

function ReportsPage() {
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();

	useEffect(() => {
		if (!authLoading && !user) {
			navigate({ to: "/login" });
		}
	}, [user, authLoading, navigate]);

	const { data: orders, isLoading } = useQuery({
		queryKey: ["orders"],
		queryFn: async () => {
			const { data, error } = await db.getOrders();
			if (error) throw error;
			return data || [];
		},
		enabled: !!user,
		staleTime: 30000,
	});

	const stats = {
		total: orders?.length || 0,
		completed:
			orders?.filter((o: any) => o.production_status === "completed").length ||
			0,
		inProgress:
			orders?.filter((o: any) => o.production_status === "in_progress")
				.length || 0,
		pending:
			orders?.filter((o: any) => o.production_status === "pending").length || 0,
	};

	const completionRate =
		stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

	// Monthly and weekly data - empty until real analytics are implemented
	const monthlyData: { month: string; orders: number; completed: number }[] =
		[];
	const weeklyProductivity: { day: string; hours: number }[] = [];

	if (authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-gray-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<div className="p-8">
					<div className="mb-8">
						<h1 className="text-2xl font-bold text-gray-900">
							Reports & Analytics
						</h1>
						<p className="text-gray-500 mt-1">
							Track performance and productivity metrics
						</p>
					</div>

					{/* KPI Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
							<div className="flex items-center justify-between mb-4">
								<div className="p-3 rounded-xl bg-blue-100">
									<Package className="w-6 h-6 text-blue-600" />
								</div>
							</div>
							<p className="text-sm text-gray-500">Total Orders</p>
							<p className="text-3xl font-bold text-gray-900">
								{isLoading ? "-" : stats.total}
							</p>
						</div>

						<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
							<div className="flex items-center justify-between mb-4">
								<div className="p-3 rounded-xl bg-emerald-100">
									<CheckCircle className="w-6 h-6 text-emerald-600" />
								</div>
							</div>
							<p className="text-sm text-gray-500">Completion Rate</p>
							<p className="text-3xl font-bold text-gray-900">
								{completionRate}%
							</p>
						</div>

						<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
							<div className="flex items-center justify-between mb-4">
								<div className="p-3 rounded-xl bg-amber-100">
									<Clock className="w-6 h-6 text-amber-600" />
								</div>
							</div>
							<p className="text-sm text-gray-500">In Progress</p>
							<p className="text-3xl font-bold text-gray-900">
								{isLoading ? "-" : stats.inProgress}
							</p>
						</div>

						<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
							<div className="flex items-center justify-between mb-4">
								<div className="p-3 rounded-xl bg-purple-100">
									<Users className="w-6 h-6 text-purple-600" />
								</div>
							</div>
							<p className="text-sm text-gray-500">Pending</p>
							<p className="text-3xl font-bold text-gray-900">
								{isLoading ? "-" : stats.pending}
							</p>
						</div>
					</div>

					{/* Charts */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
						<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">
								Monthly Orders
							</h2>
							<div className="h-80">
								{monthlyData.length > 0 ? (
									<ResponsiveContainer width="100%" height="100%">
										<AreaChart data={monthlyData}>
											<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
											<XAxis dataKey="month" stroke="#64748b" fontSize={12} />
											<YAxis stroke="#64748b" fontSize={12} />
											<Tooltip />
											<Area
												type="monotone"
												dataKey="orders"
												name="Total Orders"
												stroke="#3b82f6"
												fill="#3b82f6"
												fillOpacity={0.2}
											/>
											<Area
												type="monotone"
												dataKey="completed"
												name="Completed"
												stroke="#10b981"
												fill="#10b981"
												fillOpacity={0.2}
											/>
										</AreaChart>
									</ResponsiveContainer>
								) : (
									<div className="flex items-center justify-center h-full text-gray-400">
										<p>Monthly orders chart coming soon</p>
									</div>
								)}
							</div>
						</div>

						<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">
								Weekly Productivity
							</h2>
							<div className="h-80">
								{weeklyProductivity.length > 0 ? (
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={weeklyProductivity}>
											<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
											<XAxis dataKey="day" stroke="#64748b" fontSize={12} />
											<YAxis stroke="#64748b" fontSize={12} />
											<Tooltip />
											<Bar
												dataKey="hours"
												name="Hours"
												fill="#8b5cf6"
												radius={[4, 4, 0, 0]}
											/>
										</BarChart>
									</ResponsiveContainer>
								) : (
									<div className="flex items-center justify-center h-full text-gray-400">
										<p>Weekly productivity chart coming soon</p>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Summary Table */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-100">
							<h2 className="text-lg font-semibold text-gray-900">
								Order Status Summary
							</h2>
						</div>
						<table className="w-full">
							<thead className="bg-gray-50">
								<tr>
									<th className="text-left py-3 px-6 text-sm font-medium text-gray-500">
										Status
									</th>
									<th className="text-left py-3 px-6 text-sm font-medium text-gray-500">
										Count
									</th>
									<th className="text-left py-3 px-6 text-sm font-medium text-gray-500">
										Percentage
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-gray-50">
									<td className="py-4 px-6">
										<span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
											Completed
										</span>
									</td>
									<td className="py-4 px-6 text-sm text-gray-600">
										{stats.completed}
									</td>
									<td className="py-4 px-6 text-sm text-gray-600">
										{stats.total > 0
											? Math.round((stats.completed / stats.total) * 100)
											: 0}
										%
									</td>
								</tr>
								<tr className="border-b border-gray-50">
									<td className="py-4 px-6">
										<span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
											In Progress
										</span>
									</td>
									<td className="py-4 px-6 text-sm text-gray-600">
										{stats.inProgress}
									</td>
									<td className="py-4 px-6 text-sm text-gray-600">
										{stats.total > 0
											? Math.round((stats.inProgress / stats.total) * 100)
											: 0}
										%
									</td>
								</tr>
								<tr>
									<td className="py-4 px-6">
										<span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
											Pending
										</span>
									</td>
									<td className="py-4 px-6 text-sm text-gray-600">
										{stats.pending}
									</td>
									<td className="py-4 px-6 text-sm text-gray-600">
										{stats.total > 0
											? Math.round((stats.pending / stats.total) * 100)
											: 0}
										%
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</main>
		</div>
	);
}
