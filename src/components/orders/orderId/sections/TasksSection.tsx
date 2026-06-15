import { Package, Play, StopCircle, Timer, Wrench } from "lucide-react";
import type { Order, TaskLog } from "@/features/orders/types";

interface TasksSectionProps {
	order: Order;
	taskLogs: TaskLog[] | undefined;
	selectedPackageId: string | null;
	setSelectedPackageId: (id: string) => void;
	selectedTaskDay: string;
	setSelectedTaskDay: (day: string) => void;
	taskDays: string[];
	tasksForPackage: TaskLog[];
	onOpenEndTaskModal: (task: TaskLog) => void;
}

/** Task sessions grouped by package with day filtering and End Task action. */
export function TasksSection({
	order,
	taskLogs,
	selectedPackageId,
	setSelectedPackageId,
	selectedTaskDay,
	setSelectedTaskDay,
	taskDays,
	tasksForPackage,
	onOpenEndTaskModal,
}: TasksSectionProps) {
	return (
		<div className="bg-white rounded-lg border shadow-sm overflow-hidden">
			<div className="px-6 py-4 border-b flex items-center gap-2">
				<Wrench className="w-5 h-5 text-neutral-600" />
				<h2 className="text-lg font-semibold text-neutral-900">
					Tasks by Package
				</h2>
				<span className="ml-auto text-sm text-neutral-600">
					{taskLogs?.length || 0} task sessions
				</span>
			</div>

			{order.order_packages && order.order_packages.length > 0 ? (
				<>
					{/* Package Tabs */}
					<div className="border-b bg-neutral-50 px-4 py-2 overflow-x-auto">
						<div className="flex gap-1 min-w-max">
							{[...order.order_packages]
								.sort((a, b) => a.package_number - b.package_number)
								.map((pkg) => {
									const pkgTasks =
										taskLogs?.filter((log) =>
											log.task_packages.some(
												(tp) => tp.order_package_id === pkg.id,
											),
										) || [];
									return (
										<button
											key={pkg.id}
											onClick={() => {
												setSelectedPackageId(pkg.id);
												setSelectedTaskDay("all");
											}}
											className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
												selectedPackageId === pkg.id
													? "bg-primary-600 text-white"
													: "bg-white text-neutral-700 hover:bg-neutral-100 border"
											}`}
										>
											<Package className="w-4 h-4 inline mr-1" />
											Box #{pkg.package_number}
											<span
												className={`ml-1.5 text-xs ${selectedPackageId === pkg.id ? "text-primary-200" : "text-neutral-400"}`}
											>
												({pkgTasks.length})
											</span>
										</button>
									);
								})}
						</div>
					</div>

					{/* Day Filter Tabs */}
					{taskDays.length > 0 && (
						<div className="border-b bg-white px-4 py-2 overflow-x-auto">
							<div className="flex gap-1 min-w-max">
								<button
									onClick={() => setSelectedTaskDay("all")}
									className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
										selectedTaskDay === "all"
											? "bg-neutral-800 text-white"
											: "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
									}`}
								>
									All Days (
									{taskLogs?.filter((log) =>
										log.task_packages.some(
											(tp) => tp.order_package_id === selectedPackageId,
										),
									).length || 0}
									)
								</button>
								{taskDays.map((day) => {
									const dayTasks =
										taskLogs?.filter(
											(log) =>
												log.task_packages.some(
													(tp) => tp.order_package_id === selectedPackageId,
												) &&
												new Date(log.start_time).toISOString().split("T")[0] ===
													day,
										) || [];
									return (
										<button
											key={day}
											onClick={() => setSelectedTaskDay(day)}
											className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
												selectedTaskDay === day
													? "bg-neutral-800 text-white"
													: "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
											}`}
										>
											{new Date(day).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
											})}
											<span className="ml-1 opacity-70">
												({dayTasks.length})
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* Tasks Table for Selected Package */}
					{tasksForPackage.length > 0 ? (
						<div className="overflow-x-auto max-h-96 overflow-y-auto">
							<table className="excel-table">
								<thead className="sticky top-0 bg-white z-10">
									<tr>
										<th>Task</th>
										<th>Packer(s)</th>
										<th>Started</th>
										<th>Ended</th>
										<th>Duration</th>
										<th>Total Hrs</th>
										<th>Notes</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{tasksForPackage.map((log) => {
										const packerCount =
											log.task_assignments.filter((a) => a.packer?.full_name)
												.length || 1;
										const totalMinutes = log.duration_minutes
											? log.duration_minutes * packerCount
											: null;
										return (
											<tr key={log.id}>
												<td className="font-medium text-neutral-900">
													<div className="flex items-center gap-2">
														<Play className="w-4 h-4 text-primary-500" />
														{log.task?.name || "Unknown Task"}
													</div>
												</td>
												<td className="text-neutral-700 max-w-[200px]">
													<span className="line-clamp-2">
														{log.task_assignments
															.map((a) => a.packer?.full_name)
															.filter(Boolean)
															.join(", ") || "—"}
													</span>
												</td>
												<td className="text-neutral-700 whitespace-nowrap">
													{new Date(log.start_time).toLocaleString("en-US", {
														month: "short",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</td>
												<td className="text-neutral-700 whitespace-nowrap">
													{log.end_time ? (
														new Date(log.end_time).toLocaleString("en-US", {
															month: "short",
															day: "numeric",
															hour: "2-digit",
															minute: "2-digit",
														})
													) : (
														<span className="text-primary-600 flex items-center gap-1">
															<Timer className="w-3 h-3" /> In Progress
														</span>
													)}
												</td>
												<td className="text-neutral-700">
													{log.duration_minutes
														? `${Math.floor(log.duration_minutes / 60)}h ${Math.round(log.duration_minutes % 60)}m`
														: "—"}
												</td>
												<td className="text-neutral-900 font-medium">
													{totalMinutes
														? `${Math.floor(totalMinutes / 60)}h ${Math.round(totalMinutes % 60)}m`
														: "—"}
													{packerCount > 1 && totalMinutes && (
														<span className="text-xs text-neutral-400 ml-1">
															({packerCount}×)
														</span>
													)}
												</td>
												<td className="text-neutral-600 max-w-[150px]">
													<span className="line-clamp-1">
														{log.notes || "—"}
													</span>
												</td>
												<td>
													{!log.end_time && (
														<button
															onClick={() => onOpenEndTaskModal(log)}
															className="flex items-center gap-1 px-2 py-1 text-xs bg-danger-100 text-danger-700 rounded hover:bg-danger-200 transition-colors"
															title="End Task"
														>
															<StopCircle className="w-3 h-3" />
															End
														</button>
													)}
													{log.end_time && (
														<span className="text-neutral-400 text-xs">
															Completed
														</span>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : (
						<div className="p-6 text-center text-neutral-500">
							<Wrench className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
							<p>
								No tasks recorded for this{" "}
								{selectedTaskDay !== "all" ? "day" : "package"}
							</p>
						</div>
					)}
				</>
			) : (
				<div className="p-6 text-center text-neutral-500">
					<Package className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
					<p>No packages in this order</p>
				</div>
			)}
		</div>
	);
}
