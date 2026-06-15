import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ChevronLeft,
	ChevronRight,
	Eye,
	Loader2,
	Package,
	Search,
} from "lucide-react";
import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useRequirePageAccess } from "../../hooks/usePageAccess";
import { db } from "../../lib/supabase";

export const Route = createFileRoute("/my-orders/")({
	component: MyOrdersPage,
});

const statusColors: Record<string, string> = {
	pending: "bg-warning-100 text-warning-700",
	in_progress: "bg-primary-100 text-primary-700",
	completed: "bg-success-100 text-success-700",
};

function MyOrdersPage() {
	const { user, loading: authLoading } = useRequirePageAccess();
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 200);
	const [page, setPage] = useState(1);
	const perPage = 10;

	// RLS ("Clients can read own orders") restricts this to the client's own orders.
	const { data: orders, isLoading } = useQuery({
		queryKey: ["my-orders"],
		queryFn: async () => {
			const { data, error } = await db.getOrders();
			if (error) throw error;
			return data || [];
		},
		enabled: !!user,
		staleTime: 30000,
	});

	const filteredOrders =
		orders?.filter((order: any) =>
			order.order_name?.toLowerCase().includes(debouncedSearch.toLowerCase()),
		) || [];

	const totalPages = Math.ceil(filteredOrders.length / perPage);
	const paginatedOrders = filteredOrders.slice(
		(page - 1) * perPage,
		page * perPage,
	);

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
					<div className="mb-8">
						<h1 className="text-2xl font-bold text-neutral-900">My Orders</h1>
						<p className="text-neutral-500 mt-1">
							Track the status of your orders and packages.
						</p>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4 mb-6">
						<div className="relative max-w-md">
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
												Packages
											</th>
											<th className="text-left py-3 px-6 text-sm font-medium text-neutral-500">
												Status
											</th>
											<th className="text-left py-3 px-6 text-sm font-medium text-neutral-500">
												Date
											</th>
											<th className="text-left py-3 px-6 text-sm font-medium text-neutral-500">
												View
											</th>
										</tr>
									</thead>
									<tbody>
										{paginatedOrders.map((order: any) => (
											<tr
												key={order.id}
												className="border-b border-neutral-50 hover:bg-neutral-50"
											>
												<td className="py-4 px-6">
													<Link
														to="/my-orders/$orderId"
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
													{order.created_at
														? new Date(order.created_at).toLocaleDateString()
														: "—"}
												</td>
												<td className="py-4 px-6">
													<Link
														to="/my-orders/$orderId"
														params={{ orderId: order.id }}
														className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
													>
														<Eye className="w-4 h-4" />
														View
														<ChevronRight className="w-4 h-4" />
													</Link>
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
											type="button"
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
											type="button"
											onClick={() =>
												setPage((p) => Math.min(totalPages || 1, p + 1))
											}
											disabled={page === totalPages || totalPages === 0}
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
		</div>
	);
}
