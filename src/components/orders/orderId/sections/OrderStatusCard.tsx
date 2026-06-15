import type { UseMutationResult } from "@tanstack/react-query";
import type { Order } from "@/features/orders/types";
import {
	getCommercialStatusColor,
	getStatusColor,
} from "../orderDetailPresentation";

interface OrderStatusCardProps {
	order: Order;
	updateOrderStatusMutation: UseMutationResult<
		any,
		Error,
		{ production_status?: string; commercial_status?: string }
	>;
}

/** Production/commercial status selectors + package count summary tiles. */
export function OrderStatusCard({
	order,
	updateOrderStatusMutation,
}: OrderStatusCardProps) {
	return (
		<div className="bg-white rounded-lg border shadow-sm p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold text-neutral-900">Order Status</h2>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<label
							htmlFor="order-production-status"
							className="text-xs text-neutral-500"
						>
							Production:
						</label>
						<select
							id="order-production-status"
							value={order.production_status || "pending"}
							onChange={(e) =>
								updateOrderStatusMutation.mutate({
									production_status: e.target.value,
								})
							}
							disabled={updateOrderStatusMutation.isPending}
							className={`px-2 py-1 rounded text-xs font-medium cursor-pointer border ${getStatusColor(order.production_status)} ${updateOrderStatusMutation.isPending ? "opacity-50" : ""}`}
						>
							<option value="pending">Pending</option>
							<option value="in_progress">In Progress</option>
							<option value="on_hold">On Hold</option>
							<option value="completed">Completed</option>
							<option value="cancelled">Cancelled</option>
						</select>
					</div>
					<div className="flex items-center gap-2">
						<label
							htmlFor="order-commercial-status"
							className="text-xs text-neutral-500"
						>
							Commercial:
						</label>
						<select
							id="order-commercial-status"
							value={order.commercial_status || "draft"}
							onChange={(e) =>
								updateOrderStatusMutation.mutate({
									commercial_status: e.target.value,
								})
							}
							disabled={updateOrderStatusMutation.isPending}
							className={`px-2 py-1 rounded text-xs font-medium cursor-pointer border ${getCommercialStatusColor(order.commercial_status)} ${updateOrderStatusMutation.isPending ? "opacity-50" : ""}`}
						>
							<option value="draft">Draft</option>
							<option value="approved">Approved</option>
							<option value="invoiced">Invoiced</option>
							<option value="paid">Paid</option>
							<option value="cancelled">Cancelled</option>
						</select>
					</div>
				</div>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				<div className="text-center p-3 bg-neutral-50 rounded-lg">
					<p className="text-2xl font-bold text-primary-600">
						{order.order_packages?.length || 0}
					</p>
					<p className="text-sm text-neutral-500">Packages</p>
				</div>
				<div className="text-center p-3 bg-primary-50 border border-primary-100 rounded-lg">
					<p className="text-2xl font-bold text-primary-600">
						{order.order_packages?.filter(
							(p) => p.status === "packed" || p.status === "delivered",
						).length || 0}
					</p>
					<p className="text-sm text-primary-700 font-medium">Completed</p>
				</div>
				<div className="text-center p-3 bg-success-50 border border-success-100 rounded-lg">
					<p className="text-2xl font-bold text-success-600">
						{order.order_packages?.filter((p) => p.status === "in_production")
							.length || 0}
					</p>
					<p className="text-sm text-success-700 font-medium">In Production</p>
				</div>
				<div className="text-center p-3 bg-neutral-50 rounded-lg">
					<p className="text-2xl font-bold text-warning-600">
						{order.order_packages?.filter(
							(p) =>
								!p.status || p.status === "design" || p.status === "approved",
						).length || 0}
					</p>
					<p className="text-sm text-neutral-500">Pending</p>
				</div>
			</div>
		</div>
	);
}
