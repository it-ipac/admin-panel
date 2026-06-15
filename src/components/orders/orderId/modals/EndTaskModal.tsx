import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Play, StopCircle } from "lucide-react";
import type { TaskLog } from "@/features/orders/types";

interface EndTaskModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	endingTask: TaskLog | null;
	endTaskTime: string;
	setEndTaskTime: (time: string) => void;
	onConfirm: () => void;
	isPending: boolean;
}

/** Modal to end an open task log with a smart-defaulted end time. */
export function EndTaskModal({
	open,
	onOpenChange,
	endingTask,
	endTaskTime,
	setEndTaskTime,
	onConfirm,
	isPending,
}: EndTaskModalProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
					<Dialog.Title className="text-lg font-semibold text-neutral-900 mb-2">
						End Task
					</Dialog.Title>
					<Dialog.Description className="text-sm text-neutral-500 mb-4">
						Mark this task as completed and set the end time
					</Dialog.Description>

					{endingTask && (
						<div className="space-y-4">
							{/* Task Info */}
							<div className="bg-neutral-50 rounded-lg p-4">
								<div className="flex items-center gap-2 mb-2">
									<Play className="w-4 h-4 text-primary-500" />
									<span className="font-medium text-neutral-900">
										{endingTask.task?.name || "Unknown Task"}
									</span>
								</div>
								<div className="text-sm text-neutral-600">
									<p>
										<strong>Started:</strong>{" "}
										{new Date(endingTask.start_time).toLocaleString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
									<p>
										<strong>Packers:</strong>{" "}
										{endingTask.task_assignments
											.map((a) => a.packer?.full_name)
											.filter(Boolean)
											.join(", ") || "None assigned"}
									</p>
								</div>
							</div>

							{/* End Time Input */}
							<div>
								<label
									htmlFor="end-task-time"
									className="block text-sm font-medium text-neutral-700 mb-1"
								>
									End Time
								</label>
								<input
									id="end-task-time"
									type="datetime-local"
									value={endTaskTime}
									onChange={(e) => setEndTaskTime(e.target.value)}
									min={endingTask.start_time.slice(0, 16)}
									className="w-full px-3 py-2 border rounded-lg text-neutral-900"
								/>
								<p className="mt-1 text-xs text-neutral-500">
									Defaulted to shift end time. Adjust if needed.
								</p>
							</div>

							{/* Duration Preview */}
							{endTaskTime && (
								<div className="bg-primary-50 rounded-lg p-3">
									<p className="text-sm text-primary-700">
										<strong>Duration:</strong> {(() => {
											const start = new Date(endingTask.start_time);
											const end = new Date(endTaskTime);
											const minutes = Math.round(
												(end.getTime() - start.getTime()) / (1000 * 60),
											);
											const hours = Math.floor(minutes / 60);
											const mins = minutes % 60;
											return `${hours}h ${mins}m`;
										})()}
										{endingTask.task_assignments.filter(
											(a) => a.packer?.full_name,
										).length > 1 && (
											<span className="ml-2">
												(Total: {(() => {
													const start = new Date(endingTask.start_time);
													const end = new Date(endTaskTime);
													const minutes = Math.round(
														(end.getTime() - start.getTime()) / (1000 * 60),
													);
													const packerCount =
														endingTask.task_assignments.filter(
															(a) => a.packer?.full_name,
														).length;
													const totalMinutes = minutes * packerCount;
													const hours = Math.floor(totalMinutes / 60);
													const mins = totalMinutes % 60;
													return `${hours}h ${mins}m for ${packerCount} packers`;
												})()})
											</span>
										)}
									</p>
								</div>
							)}
						</div>
					)}

					<div className="flex justify-end gap-2 mt-6">
						<Dialog.Close asChild>
							<button className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg">
								Cancel
							</button>
						</Dialog.Close>
						<button
							onClick={onConfirm}
							disabled={!endTaskTime || isPending}
							className="flex items-center gap-2 px-4 py-2 text-sm bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50"
						>
							{isPending && <Loader2 className="w-4 h-4 animate-spin" />}
							<StopCircle className="w-4 h-4" />
							End Task
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
