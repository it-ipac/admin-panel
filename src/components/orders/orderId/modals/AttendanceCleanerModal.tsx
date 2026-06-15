import * as Dialog from "@radix-ui/react-dialog";
import { Check, CheckCircle2, Sparkles, X } from "lucide-react";
import type { AttendanceChange } from "@/features/orders/types";

interface AttendanceCleanerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	proposedChanges: AttendanceChange[];
	toggleApproval: (id: string) => void;
	approveAll: () => void;
	applySelectedChanges: () => void;
	applyingChanges: boolean;
}

/** Review/approve modal for proposed attendance end-time fixes. */
export function AttendanceCleanerModal({
	open,
	onOpenChange,
	proposedChanges,
	toggleApproval,
	approveAll,
	applySelectedChanges,
	applyingChanges,
}: AttendanceCleanerModalProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
					<div className="px-6 py-4 border-b flex items-center justify-between">
						<Dialog.Title className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
							<Sparkles className="w-5 h-5 text-warning-500" />
							Clean Attendance Issues
						</Dialog.Title>
						<Dialog.Close className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
							<X className="w-5 h-5 text-neutral-500" />
						</Dialog.Close>
					</div>

					<div className="flex-1 overflow-auto p-6">
						{proposedChanges.length > 0 ? (
							<>
								<p className="text-sm text-neutral-600 mb-4">
									The following attendance records have issues (missing end
									times, end times on wrong day, negative hours, or invalid
									times). Morning shifts will be corrected to 12:00 PM,
									afternoon shifts to 11:59 PM of the start date.
								</p>
								<div className="overflow-x-auto border rounded-lg">
									<table className="w-full text-sm">
										<thead className="bg-neutral-50 text-left">
											<tr>
												<th className="px-4 py-3 font-semibold text-neutral-700">
													Packer
												</th>
												<th className="px-4 py-3 font-semibold text-neutral-700">
													Shift
												</th>
												<th className="px-4 py-3 font-semibold text-neutral-700">
													Start
												</th>
												<th className="px-4 py-3 font-semibold text-neutral-700">
													Current End
												</th>
												<th className="px-4 py-3 font-semibold text-neutral-700">
													Hours
												</th>
												<th className="px-4 py-3 font-semibold text-success-700">
													New End
												</th>
												<th className="px-4 py-3 font-semibold text-success-700">
													New Hours
												</th>
												<th className="px-4 py-3 font-semibold text-neutral-700 text-center">
													Approve
												</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{proposedChanges.map((change) => (
												<tr
													key={change.id}
													className={change.approved ? "bg-success-50" : ""}
												>
													<td className="px-4 py-3 font-medium text-neutral-900">
														{change.packerName}
													</td>
													<td className="px-4 py-3 text-neutral-700 capitalize">
														{change.shift}
													</td>
													<td className="px-4 py-3 text-neutral-700">
														{change.currentStart
															? new Date(
																	change.currentStart,
																).toLocaleTimeString("en-US", {
																	hour: "2-digit",
																	minute: "2-digit",
																})
															: "—"}
													</td>
													<td className="px-4 py-3 text-neutral-700">
														{change.currentEnd ? (
															<span className="text-danger-600">
																{new Date(change.currentEnd).toLocaleString(
																	"en-US",
																	{
																		month: "short",
																		day: "numeric",
																		hour: "2-digit",
																		minute: "2-digit",
																	},
																)}
															</span>
														) : (
															<span className="text-warning-600">Not set</span>
														)}
													</td>
													<td className="px-4 py-3">
														<span
															className={
																parseFloat(change.currentHours) > 12
																	? "text-danger-600 font-semibold"
																	: "text-neutral-700"
															}
														>
															{change.currentHours}
														</span>
													</td>
													<td className="px-4 py-3 text-success-700 font-medium">
														{new Date(change.newEnd).toLocaleTimeString(
															"en-US",
															{ hour: "2-digit", minute: "2-digit" },
														)}
													</td>
													<td className="px-4 py-3 text-success-700 font-medium">
														{change.newHours}
													</td>
													<td className="px-4 py-3 text-center">
														<button
															onClick={() => toggleApproval(change.id)}
															className={`p-2 rounded-lg transition-colors ${
																change.approved
																	? "bg-success-500 text-white hover:bg-success-600"
																	: "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
															}`}
														>
															<Check className="w-4 h-4" />
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</>
						) : (
							<div className="text-center py-12">
								<CheckCircle2 className="w-12 h-12 text-success-500 mx-auto mb-3" />
								<p className="text-neutral-700 font-medium">
									All morning attendance records look good!
								</p>
								<p className="text-neutral-500 text-sm mt-1">
									No records need cleaning for the selected date.
								</p>
							</div>
						)}
					</div>

					{proposedChanges.length > 0 && (
						<div className="px-6 py-4 border-t bg-neutral-50 flex items-center justify-between">
							<div className="text-sm text-neutral-600">
								{proposedChanges.filter((c) => c.approved).length} of{" "}
								{proposedChanges.length} records selected
							</div>
							<div className="flex items-center gap-3">
								<button
									onClick={approveAll}
									className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
								>
									Select All
								</button>
								<button
									onClick={applySelectedChanges}
									disabled={
										applyingChanges ||
										proposedChanges.filter((c) => c.approved).length === 0
									}
									className="px-4 py-2 text-sm font-medium text-white bg-success-600 rounded-lg hover:bg-success-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									{applyingChanges ? (
										<>
											<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
											Applying...
										</>
									) : (
										<>
											<Check className="w-4 h-4" />
											Apply Selected (
											{proposedChanges.filter((c) => c.approved).length})
										</>
									)}
								</button>
							</div>
						</div>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
