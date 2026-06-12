import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ChevronLeft,
	ChevronRight,
	Edit,
	Eye,
	Loader2,
	Package,
	Plus,
	Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { OrderCreateDialog } from "../../components/orders/create/OrderCreateDialog";
import { Sidebar } from "../../components/Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { db } from "../../lib/supabase";

export const Route = createFileRoute("/orders/")({
	component: OrdersPage,
});

function OrdersPage() {
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 200);
	const [statusFilter, setStatusFilter] = useState("all");
	const [page, setPage] = useState(1);
	const perPage = 10;
	const [showCreateDialog, setShowCreateDialog] = useState(false);

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

	const filteredOrders =
		orders?.filter((order: any) => {
			const searchLower = debouncedSearch.toLowerCase();
			const matchesSearch =
				order.order_name?.toLowerCase().includes(searchLower) ||
				order.client_name?.toLowerCase().includes(searchLower);
			const matchesStatus =
				statusFilter === "all" || order.production_status === statusFilter;
			return matchesSearch && matchesStatus;
		}) || [];

	const totalPages = Math.ceil(filteredOrders.length / perPage);
	const paginatedOrders = filteredOrders.slice(
		(page - 1) * perPage,
		page * perPage,
	);

	const statusColors: Record<string, string> = {
		pending: "bg-warning-100 text-warning-700",
		in_progress: "bg-primary-100 text-primary-700",
		completed: "bg-success-100 text-success-700",
	};

	if (authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-neutral-50">
				<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-neutral-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<div className="p-8">
					<div className="flex items-center justify-between mb-8">
						<div>
							<h1 className="text-2xl font-bold text-neutral-900">Orders</h1>
							<p className="text-neutral-500 mt-1">
								Manage and track all orders
							</p>
						</div>
						<button
							onClick={() => setShowCreateDialog(true)}
							className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
						>
							<Plus className="w-5 h-5" />
							New Order
						</button>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4 mb-6">
						<div className="flex flex-wrap gap-4">
							<div className="flex-1 min-w-50">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
									<input
										type="text"
										placeholder="Search orders..."
										value={search}
										onChange={(e) => {
											setSearch(e.target.value);
											setPage(1);
										}}
										className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
									/>
								</div>
							</div>
							<select
								value={statusFilter}
								onChange={(e) => {
									setStatusFilter(e.target.value);
									setPage(1);
								}}
								className="px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
							>
								<option value="all">All Status</option>
								<option value="pending">Pending</option>
								<option value="in_progress">In Progress</option>
								<option value="completed">Completed</option>
							</select>
						</div>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
							</div>
						) : filteredOrders.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12">
								<Package className="w-12 h-12 text-neutral-300 mb-4" />
								<p className="text-neutral-500">No orders found</p>
							</div>
						) : (
							<>
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
												Packages
											</th>
											<th className="text-left py-3 px-6 text-sm font-medium text-neutral-500">
												Status
											</th>
											<th className="text-left py-3 px-6 text-sm font-medium text-neutral-500">
												Date
											</th>
											<th className="text-left py-3 px-6 text-sm font-medium text-neutral-500">
												Actions
											</th>
										</tr>
									</thead>
									<tbody>
										{paginatedOrders.map((order: any) => (
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
												<td className="py-4 px-6">
													<Link
														to="/orders/$orderId"
														params={{ orderId: order.id }}
														className="font-medium text-neutral-900 hover:text-primary-600"
													>
														{order.order_name}
													</Link>
													<div className="text-sm text-neutral-500">
														{order.order_number}
													</div>
												</td>
												<td className="py-4 px-6 text-sm text-neutral-600">
													{order.client_name}
												</td>
												<td className="py-4 px-6 text-sm text-neutral-600">
													{order.package_count || 0}
												</td>
												<td className="py-4 px-6">
													<span
														className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[order.production_status] || "bg-neutral-100 text-neutral-700"}`}
													>
														{order.production_status?.replace("_", " ")}
													</span>
												</td>
												<td className="py-4 px-6 text-sm text-neutral-500">
													{new Date(order.created_at).toLocaleDateString()}
												</td>
												<td
													className="py-4 px-6"
													onClick={(event) => event.stopPropagation()}
												>
													<div className="flex items-center gap-2">
														<Link
															to="/orders/$orderId"
															params={{ orderId: order.id }}
															className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
															title="View"
														>
															<Eye className="w-4 h-4 text-neutral-500" />
														</Link>
														<button
															className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
															title="Edit"
														>
															<Edit className="w-4 h-4 text-neutral-500" />
														</button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
								<div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100">
									<p className="text-sm text-neutral-500">
										Showing {(page - 1) * perPage + 1} to{" "}
										{Math.min(page * perPage, filteredOrders.length)} of{" "}
										{filteredOrders.length}
									</p>
									<div className="flex items-center gap-2">
										<button
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={page === 1}
											className="p-2 hover:bg-neutral-100 rounded-lg disabled:opacity-50"
										>
											<ChevronLeft className="w-5 h-5" />
										</button>
										<span className="text-sm text-neutral-600">
											Page {page} of {totalPages || 1}
										</span>
										<button
											onClick={() =>
												setPage((p) => Math.min(totalPages, p + 1))
											}
											disabled={page >= totalPages}
											className="p-2 hover:bg-neutral-100 rounded-lg disabled:opacity-50"
										>
											<ChevronRight className="w-5 h-5" />
										</button>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</main>

			<OrderCreateDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
			/>
		</div>
	);
}
