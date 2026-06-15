import {
	CheckCircle2,
	ClipboardList,
	Sparkles,
	UserCheck,
	XCircle,
} from "lucide-react";
import type { AttendanceLog } from "@/features/orders/types";
import {
	formatTime,
	getShiftIcon,
	getShiftLabel,
} from "../orderDetailPresentation";

interface AttendanceSectionProps {
	attendanceLogs: AttendanceLog[] | undefined;
	attendanceDates: string[];
	selectedAttendanceDate: string | null;
	setSelectedAttendanceDate: (date: string) => void;
	filteredAttendance: AttendanceLog[];
	onCleanAttendance: () => void;
}

/** Attendance logs with per-day tabs and the Clean Attendance trigger. */
export function AttendanceSection({
	attendanceLogs,
	attendanceDates,
	selectedAttendanceDate,
	setSelectedAttendanceDate,
	filteredAttendance,
	onCleanAttendance,
}: AttendanceSectionProps) {
	return (
		<div className="bg-white rounded-lg border shadow-sm overflow-hidden">
			<div className="px-6 py-4 border-b flex items-center gap-2">
				<ClipboardList className="w-5 h-5 text-neutral-600" />
				<h2 className="text-lg font-semibold text-neutral-900">
					Attendance & Work Sessions
				</h2>
				<div className="ml-auto flex items-center gap-3">
					<span className="text-sm text-neutral-600">
						{attendanceDates.length} days • {attendanceLogs?.length || 0}{" "}
						records
					</span>
					{selectedAttendanceDate && (
						<button
							onClick={onCleanAttendance}
							className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-warning-700 bg-warning-50 border border-warning-200 rounded-lg hover:bg-warning-100 transition-colors"
							title="Fix morning shift end times (set missing/invalid end times to 12:00 PM)"
						>
							<Sparkles className="w-4 h-4" />
							Clean Attendance
						</button>
					)}
				</div>
			</div>

			{attendanceDates.length > 0 ? (
				<>
					{/* Day Tabs */}
					<div className="border-b bg-neutral-50 px-4 py-2 overflow-x-auto">
						<div className="flex gap-1 min-w-max">
							{attendanceDates.map((date) => {
								const dayLogs =
									attendanceLogs?.filter((l) => l.log_date === date) || [];
								const hasProjectStart = dayLogs.some((l) => l.is_project_start);
								return (
									<button
										key={date}
										onClick={() => setSelectedAttendanceDate(date)}
										className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
											selectedAttendanceDate === date
												? "bg-primary-600 text-white"
												: "bg-white text-neutral-700 hover:bg-neutral-100 border"
										}`}
									>
										{new Date(date).toLocaleDateString("en-US", {
											weekday: "short",
											month: "short",
											day: "numeric",
										})}
										{hasProjectStart && (
											<span
												className={`ml-1.5 text-xs px-1 py-0.5 rounded ${
													selectedAttendanceDate === date
														? "bg-white/20"
														: "bg-accent-100 text-accent-700"
												}`}
											>
												Start
											</span>
										)}
										<span
											className={`ml-1.5 text-xs ${selectedAttendanceDate === date ? "text-primary-200" : "text-neutral-400"}`}
										>
											({dayLogs.length})
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Attendance Table for Selected Day */}
					<div className="overflow-x-auto max-h-96 overflow-y-auto">
						<table className="excel-table">
							<thead className="sticky top-0 bg-neutral-50 z-10">
								<tr>
									<th>Packer</th>
									<th>Shift</th>
									<th>Start</th>
									<th>End</th>
									<th>Hours</th>
									<th>Status</th>
									<th>Toolbox</th>
								</tr>
							</thead>
							<tbody>
								{filteredAttendance.map((log) => {
									const hours =
										log.start_time && log.end_time
											? (
													(new Date(log.end_time).getTime() -
														new Date(log.start_time).getTime()) /
													(1000 * 60 * 60)
												).toFixed(1)
											: null;
									return (
										<tr key={log.id}>
											<td className="font-medium text-neutral-900">
												{log.packer?.full_name || "Unknown"}
											</td>
											<td>
												<div className="flex items-center gap-1.5">
													{getShiftIcon(log.shift_period)}
													<span className="text-neutral-700">
														{getShiftLabel(log.shift_period)}
													</span>
												</div>
											</td>
											<td className="text-neutral-700">
												{formatTime(log.start_time)}
											</td>
											<td className="text-neutral-700">
												{formatTime(log.end_time)}
											</td>
											<td className="text-neutral-700">
												{hours ? `${hours}h` : "—"}
											</td>
											<td>
												<span
													className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
														log.status === "present"
															? "bg-success-100 text-success-700"
															: "bg-danger-100 text-danger-700"
													}`}
												>
													{log.status === "present" ? (
														<UserCheck className="w-3 h-3 mr-1" />
													) : (
														<XCircle className="w-3 h-3 mr-1" />
													)}
													{log.status}
												</span>
											</td>
											<td>
												{log.toolbox_briefing_completed ? (
													<CheckCircle2 className="w-5 h-5 text-success-500" />
												) : (
													<span className="text-neutral-400">—</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</>
			) : (
				<div className="p-6 text-center text-neutral-500">
					<ClipboardList className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
					<p>No attendance records yet</p>
				</div>
			)}
		</div>
	);
}
