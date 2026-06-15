import type { UseMutationResult } from "@tanstack/react-query";
import { Package } from "lucide-react";
import type { Order, OrderPackage } from "@/features/orders/types";
import {
	getDimensions,
	getStatusColor,
	getWeight,
} from "../orderDetailPresentation";

interface PackagesTableProps {
	order: Order;
	updatePackageStatusMutation: UseMutationResult<
		any,
		Error,
		{ packageId: string; status: string }
	>;
}

function StatusBadges({ packages }: { packages: OrderPackage[] }) {
	return (
		<>
			<span className="text-neutral-600 bg-neutral-200/80 px-2.5 py-1 rounded-full">
				Total Boxes: {packages.length}
			</span>
			<span className="text-primary-700 bg-primary-50 border border-primary-200 px-2.5 py-1 rounded-full">
				Completed:{" "}
				{
					packages.filter(
						(p) => p.status === "packed" || p.status === "delivered",
					).length
				}
			</span>
			<span className="text-success-700 bg-success-50 border border-success-200 px-2.5 py-1 rounded-full">
				In Production:{" "}
				{packages.filter((p) => p.status === "in_production").length}
			</span>
			<span className="text-warning-700 bg-warning-50 border border-warning-200 px-2.5 py-1 rounded-full">
				Pending:{" "}
				{
					packages.filter(
						(p) =>
							!p.status ||
							p.status === "design" ||
							p.status === "approved" ||
							p.status === "pending",
					).length
				}
			</span>
			<span className="text-danger-700 bg-danger-50 border border-danger-200 px-2.5 py-1 rounded-full">
				Cancelled: {packages.filter((p) => p.status === "cancelled").length}
			</span>
		</>
	);
}

/** Read-only packages table with per-package status dropdowns. */
export function PackagesTable({
	order,
	updatePackageStatusMutation,
}: PackagesTableProps) {
	return (
		<div className="bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col">
			<div className="px-6 py-4 border-b flex flex-wrap justify-between items-center bg-neutral-50 gap-2">
				<h2 className="text-lg font-semibold text-neutral-900">Packages</h2>
				<div className="flex flex-wrap gap-2 text-xs font-semibold">
					<StatusBadges packages={order.order_packages} />
				</div>
			</div>
			{order.order_packages && order.order_packages.length > 0 ? (
				<>
					<div className="overflow-x-auto max-h-[680px] overflow-y-auto">
						<table className="excel-table w-full border-collapse">
							<thead>
								<tr className="sticky top-0 bg-neutral-100 z-10 shadow-[inset_0_-2px_0_rgba(0,0,0,0.05)]">
									<th className="sticky top-0 bg-neutral-100 z-10 py-3 px-4 border-b text-left">
										#
									</th>
									<th className="sticky top-0 bg-neutral-100 z-10 py-3 px-4 border-b text-left">
										Dimensions (L×W×H)
									</th>
									<th className="sticky top-0 bg-neutral-100 z-10 py-3 px-4 border-b text-left">
										Weight
									</th>
									<th className="sticky top-0 bg-neutral-100 z-10 py-3 px-4 border-b text-left">
										Status
									</th>
								</tr>
							</thead>
							<tbody>
								{order.order_packages
									.sort((a, b) => a.package_number - b.package_number)
									.map((pkg) => (
										<tr key={pkg.id}>
											<td className="font-medium py-3 px-4 border-b">
												{pkg.package_number}
											</td>
											<td className="py-3 px-4 border-b">
												{getDimensions(pkg) || "—"}
											</td>
											<td className="py-3 px-4 border-b">
												{getWeight(pkg) ? `${getWeight(pkg)} kg` : "—"}
											</td>
											<td className="py-3 px-4 border-b">
												<select
													value={pkg.status || "pending"}
													onChange={(e) =>
														updatePackageStatusMutation.mutate({
															packageId: pkg.id,
															status: e.target.value,
														})
													}
													disabled={updatePackageStatusMutation.isPending}
													className={`px-2 py-1 text-xs font-medium rounded border cursor-pointer capitalize ${getStatusColor(pkg.status || "pending")} ${updatePackageStatusMutation.isPending ? "opacity-50" : ""}`}
												>
													<option value="pending">Pending</option>
													<option value="design">Design</option>
													<option value="approved">Approved</option>
													<option value="in_production">In Production</option>
													<option value="packed">Packed</option>
													<option value="delivered">Delivered</option>
													<option value="on_hold">On Hold</option>
													<option value="cancelled">Cancelled</option>
												</select>
											</td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
					<div className="px-6 py-3 border-t flex flex-wrap justify-end items-center bg-neutral-50 gap-2 text-xs font-semibold">
						<StatusBadges packages={order.order_packages} />
					</div>
				</>
			) : (
				<div className="p-6 text-center text-neutral-500">
					<Package className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
					<p>No packages added yet</p>
				</div>
			)}
		</div>
	);
}
