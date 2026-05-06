import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	BarChart3,
	ChevronRight,
	Filter,
	Hash,
	Loader2,
	Package,
	Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { db, supabase } from "../lib/supabase";

export const Route = createFileRoute("/reports")({
	component: ReportsPage,
});

interface ProjectAnalytics {
	orderId: string;
	orderName: string;
	projectType: string;
	uniqueItems: number;
	totalQty: number;
}

interface AggregatedAnalytics {
	totalUniqueItems: number;
	totalQty: number;
	projectBreakdown: ProjectAnalytics[];
}

function ReportsPage() {
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();

	const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
	const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
	const [analytics, setAnalytics] = useState<AggregatedAnalytics | null>(null);
	const [analyticsLoading, setAnalyticsLoading] = useState(false);
	const [projectSearch, setProjectSearch] = useState("");

	useEffect(() => {
		if (!authLoading && !user) {
			navigate({ to: "/login" });
		}
	}, [user, authLoading, navigate]);

	// Fetch Clients
	const { data: clients, isLoading: clientsLoading } = useQuery({
		queryKey: ["clients"],
		queryFn: async () => {
			const { data, error } = await db.getClients();
			if (error) throw error;
			return data || [];
		},
		enabled: !!user,
	});

	// Fetch Orders for selected client
	const { data: orders, isLoading: ordersLoading } = useQuery({
		queryKey: ["orders", selectedClientId],
		queryFn: async () => {
			if (!selectedClientId) return [];
			const { data, error } = await supabase
				.from("orders")
				.select("id, order_name, project_type")
				.eq("client_id", selectedClientId)
				.order("order_name");
			if (error) throw error;
			return data || [];
		},
		enabled: !!user && !!selectedClientId,
	});

	const filteredOrders = useMemo(() => {
		if (!orders) return [];
		if (!projectSearch.trim()) return orders;
		const query = projectSearch.toLowerCase();
		return orders.filter((o) => o.order_name.toLowerCase().includes(query));
	}, [orders, projectSearch]);

	const toggleOrder = (orderId: string) => {
		setSelectedOrderIds((prev) =>
			prev.includes(orderId)
				? prev.filter((id) => id !== orderId)
				: [...prev, orderId],
		);
	};

	const selectAllOrders = () => {
		if (!orders) return;
		if (selectedOrderIds.length === orders.length) {
			setSelectedOrderIds([]);
		} else {
			setSelectedOrderIds(orders.map((o) => o.id));
		}
	};

	async function generateReport() {
		if (selectedOrderIds.length === 0) return;

		setAnalyticsLoading(true);
		try {
			const selectedOrdersInfo =
				orders?.filter((o) => selectedOrderIds.includes(o.id)) || [];

			// 1. Fetch packed boxes for these orders
			const { data: boxes, error: boxesError } = await supabase
				.from("order_pkg_instance")
				.select(`
					id,
					order_package_id,
					status,
					order_pkg_overview!inner (
						order_id
					)
				`)
				.in("order_pkg_overview.order_id", selectedOrderIds);

			if (boxesError) throw boxesError;

			if (!boxes || boxes.length === 0) {
				setAnalytics({
					totalUniqueItems: 0,
					totalQty: 0,
					projectBreakdown: selectedOrdersInfo.map((o) => ({
						orderId: o.id,
						orderName: o.order_name,
						projectType: o.project_type,
						uniqueItems: 0,
						totalQty: 0,
					})),
				});
				return;
			}

			// 2. Fetch Items from pkd_item for all boxes
			const boxIds = boxes.map((b) => b.id);
			const { data: allPkdItems, error: itemsError } = await supabase
				.from("pkd_item")
				.select("id, quantity, maintenance_db_id, pkg_instance_id")
				.in("pkg_instance_id", boxIds);

			if (itemsError) throw itemsError;

			// 3. Aggregate
			const projectBreakdown: ProjectAnalytics[] = [];
			const globalUniqueItems = new Set<string>();
			let globalTotalQty = 0;

			for (const order of selectedOrdersInfo) {
				const projectUniqueItems = new Set<string>();
				let projectTotalQty = 0;

				const projectBoxes = boxes.filter(
					(b) => (b.order_pkg_overview as any)?.order_id === order.id,
				);
				const projectBoxIds = projectBoxes.map((b) => b.id);
				const projectItems =
					allPkdItems?.filter((i) =>
						projectBoxIds.includes(i.pkg_instance_id),
					) || [];

				for (const item of projectItems) {
					const itemKey = item.maintenance_db_id || `item-${item.id}`;
					projectUniqueItems.add(itemKey);
					globalUniqueItems.add(itemKey);

					const qty = Number(item.quantity) || 0;
					projectTotalQty += qty;
					globalTotalQty += qty;
				}

				projectBreakdown.push({
					orderId: order.id,
					orderName: order.order_name,
					projectType: order.project_type,
					uniqueItems: projectUniqueItems.size,
					totalQty: projectTotalQty,
				});
			}

			setAnalytics({
				totalUniqueItems: globalUniqueItems.size,
				totalQty: globalTotalQty,
				projectBreakdown,
			});
		} catch (error) {
			console.error("Error generating analytics:", error);
		} finally {
			setAnalyticsLoading(false);
		}
	}

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
				<div className="p-8 max-w-7xl mx-auto">
					<div className="flex justify-between items-center mb-8">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Reports & Analytics
							</h1>
							<p className="text-gray-500 mt-1">
								Select clients and projects to view packing performance
							</p>
						</div>
						<div className="flex items-center space-x-3">
							<div className="p-2 bg-blue-100 rounded-lg">
								<BarChart3 className="w-6 h-6 text-blue-600" />
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						{/* Filter Sidebar */}
						<div className="lg:col-span-1 space-y-6">
							<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
								<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
									<Filter className="w-5 h-5 mr-2 text-gray-500" />
									Filters
								</h2>

								{/* Client Select */}
								<div className="mb-6">
									<label
										htmlFor="client-select"
										className="block text-sm font-medium text-gray-700 mb-2"
									>
										Client
									</label>
									{clientsLoading ? (
										<div className="h-10 bg-gray-50 animate-pulse rounded-lg" />
									) : (
										<select
											id="client-select"
											className="select select-bordered w-full bg-white"
											value={selectedClientId || ""}
											onChange={(e) => {
												setSelectedClientId(e.target.value);
												setSelectedOrderIds([]);
												setAnalytics(null);
											}}
										>
											<option value="">Select a client</option>
											{clients?.map((c) => (
												<option key={c.id} value={c.id}>
													{c.name}
												</option>
											))}
										</select>
									)}
								</div>

								{/* Projects Select */}
								{selectedClientId && (
									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<span className="block text-sm font-medium text-gray-700">
												Projects
											</span>
											<button
												onClick={selectAllOrders}
												className="text-xs font-semibold text-blue-600 hover:underline"
											>
												{selectedOrderIds.length === (orders?.length || 0)
													? "Deselect All"
													: "Select All"}
											</button>
										</div>

										<div className="relative">
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
											<input
												type="text"
												placeholder="Search projects..."
												className="input input-bordered w-full pl-10 h-10 bg-white text-sm"
												value={projectSearch}
												onChange={(e) => setProjectSearch(e.target.value)}
											/>
										</div>

										<div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50">
											{ordersLoading ? (
												<div className="flex justify-center py-4">
													<Loader2 className="w-5 h-5 animate-spin text-blue-600" />
												</div>
											) : (
												<div className="space-y-1">
													{filteredOrders.length === 0 ? (
														<p className="text-center py-4 text-sm text-gray-500">
															No projects found
														</p>
													) : (
														filteredOrders.map((order) => (
															<label
																key={order.id}
																className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
																	selectedOrderIds.includes(order.id)
																		? "bg-blue-50"
																		: "hover:bg-white"
																}`}
															>
																<input
																	type="checkbox"
																	className="checkbox checkbox-sm checkbox-primary mr-3"
																	checked={selectedOrderIds.includes(order.id)}
																	onChange={() => toggleOrder(order.id)}
																/>
																<span className="text-sm font-medium text-gray-700 truncate">
																	{order.order_name}
																</span>
															</label>
														))
													)}
												</div>
											)}
										</div>

										<button
											onClick={generateReport}
											disabled={
												selectedOrderIds.length === 0 || analyticsLoading
											}
											className="btn btn-primary w-full shadow-md text-white"
										>
											{analyticsLoading ? (
												<Loader2 className="w-5 h-5 animate-spin" />
											) : (
												"Generate Report"
											)}
										</button>
									</div>
								)}
							</div>
						</div>

						{/* Results Area */}
						<div className="lg:col-span-2 space-y-6">
							{!analytics ? (
								<div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-gray-300 py-20 px-6 text-center">
									<div className="p-4 bg-gray-100 rounded-full mb-4">
										<Filter className="w-10 h-10 text-gray-400" />
									</div>
									<h3 className="text-lg font-semibold text-gray-900">
										No Analytics Generated
									</h3>
									<p className="text-gray-500 max-w-xs mt-1">
										Select a client and at least one project from the sidebar to
										view the report.
									</p>
								</div>
							) : (
								<>
									{/* KPI Cards */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
										<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
											<div className="p-4 bg-indigo-100 rounded-xl">
												<Package className="w-8 h-8 text-indigo-600" />
											</div>
											<div>
												<p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
													Unique Items
												</p>
												<p className="text-3xl font-bold text-gray-900">
													{analytics.totalUniqueItems}
												</p>
											</div>
										</div>
										<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
											<div className="p-4 bg-emerald-100 rounded-xl">
												<Hash className="w-8 h-8 text-emerald-600" />
											</div>
											<div>
												<p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
													Total Quantity
												</p>
												<p className="text-3xl font-bold text-gray-900">
													{analytics.totalQty}
												</p>
											</div>
										</div>
									</div>

									{/* Breakdown Table */}
									<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
										<div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
											<h3 className="font-semibold text-gray-900">
												Project Breakdown
											</h3>
										</div>
										<div className="overflow-x-auto">
											<table className="w-full text-left">
												<thead>
													<tr className="bg-gray-50">
														<th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
															Project Name
														</th>
														<th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
															Type
														</th>
														<th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
															Items
														</th>
														<th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
															Total Qty
														</th>
														<th className="px-6 py-3 w-10"></th>
													</tr>
												</thead>
												<tbody className="divide-y divide-gray-100">
													{analytics.projectBreakdown.map((project) => (
														<tr
															key={project.orderId}
															className="hover:bg-gray-50 transition-colors group"
														>
															<td className="px-6 py-4">
																<span className="font-medium text-gray-900">
																	{project.orderName}
																</span>
															</td>
															<td className="px-6 py-4">
																<span
																	className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
																		project.projectType === "maintenance"
																			? "bg-orange-100 text-orange-700"
																			: "bg-blue-100 text-blue-700"
																	}`}
																>
																	{project.projectType}
																</span>
															</td>
															<td className="px-6 py-4 text-center">
																<span className="text-gray-900 font-semibold">
																	{project.uniqueItems}
																</span>
															</td>
															<td className="px-6 py-4 text-center">
																<span className="text-gray-900 font-semibold">
																	{project.totalQty}
																</span>
															</td>
															<td className="px-6 py-4">
																<ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
