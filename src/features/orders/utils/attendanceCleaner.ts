import type { AttendanceChange, AttendanceLog } from "../types";

/**
 * Proposes end-time fixes for a day's attendance logs: morning shifts
 * should end at 12:00 PM, afternoon shifts at 11:59 PM of the start
 * date. Absent packers are skipped. Pure function — no IO.
 */
export function calculateAttendanceChanges(
	attendanceLogs: AttendanceLog[],
	selectedAttendanceDate: string,
): AttendanceChange[] {
	// Filter logs for the selected date - EXCLUDE ABSENT packers
	const presentLogs = attendanceLogs.filter(
		(log) =>
			log.log_date === selectedAttendanceDate && log.status === "present",
	);

	const changes: AttendanceChange[] = [];

	for (const log of presentLogs) {
		let needsChange = false;
		let newEndTime: Date | null = null;

		// Get the date from the start_time (more reliable than log_date for time calculations)
		const startTime = log.start_time ? new Date(log.start_time) : null;
		const startDate = startTime
			? new Date(
					startTime.getFullYear(),
					startTime.getMonth(),
					startTime.getDate(),
				)
			: new Date(selectedAttendanceDate);

		// Calculate current hours
		let currentHours = "—";
		if (log.start_time && log.end_time) {
			const start = new Date(log.start_time);
			const end = new Date(log.end_time);
			const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
			currentHours = `${hours.toFixed(1)}h`;
		}

		if (log.shift_period === "morning") {
			// Morning shift should end at 12:00 PM of the START TIME's date
			const correctEndTime = new Date(startDate);
			correctEndTime.setHours(12, 0, 0, 0);

			if (!log.end_time) {
				// No end time set
				needsChange = true;
				newEndTime = correctEndTime;
			} else {
				const endTime = new Date(log.end_time);
				const endDateOnly = new Date(
					endTime.getFullYear(),
					endTime.getMonth(),
					endTime.getDate(),
				);

				// Check if end time is on a different day
				if (endDateOnly.getTime() !== startDate.getTime()) {
					needsChange = true;
					newEndTime = correctEndTime;
				}
				// Check if end time is already exactly 12:00 PM - skip if same
				else if (endTime.getHours() === 12 && endTime.getMinutes() === 0) {
					// Already correct, no change needed
					needsChange = false;
				}
				// Check if end time is after noon
				else if (
					endTime.getHours() > 12 ||
					(endTime.getHours() === 12 && endTime.getMinutes() > 0)
				) {
					needsChange = true;
					newEndTime = correctEndTime;
				}
			}
		} else if (log.shift_period === "afternoon") {
			// Afternoon shift should end at 11:59 PM of the START TIME's date
			const correctEndTime = new Date(startDate);
			correctEndTime.setHours(23, 59, 0, 0);

			if (!log.end_time) {
				// No end time set
				needsChange = true;
				newEndTime = correctEndTime;
			} else {
				const endTime = new Date(log.end_time);
				const endDateOnly = new Date(
					endTime.getFullYear(),
					endTime.getMonth(),
					endTime.getDate(),
				);

				// Check if end time is on a different day (e.g., 12:00 AM next day causing negative hours)
				if (endDateOnly.getTime() !== startDate.getTime()) {
					needsChange = true;
					newEndTime = correctEndTime;
				}
				// Check if end time is before start time (negative hours)
				else if (startTime && endTime.getTime() < startTime.getTime()) {
					needsChange = true;
					newEndTime = correctEndTime;
				}
				// Check if end time is at midnight (00:00) - common bug
				else if (endTime.getHours() === 0 && endTime.getMinutes() === 0) {
					needsChange = true;
					newEndTime = correctEndTime;
				}
			}
		}
		// full_day shift - could add logic here if needed

		if (needsChange && newEndTime) {
			// Calculate new hours
			let newHours = "—";
			if (log.start_time) {
				const start = new Date(log.start_time);
				const hours =
					(newEndTime.getTime() - start.getTime()) / (1000 * 60 * 60);
				newHours = `${hours.toFixed(1)}h`;
			}

			changes.push({
				id: log.id,
				packerName: log.packer?.full_name || "Unknown",
				shift: log.shift_period,
				currentStart: log.start_time,
				currentEnd: log.end_time,
				currentHours,
				newEnd: newEndTime.toISOString(),
				newHours,
				approved: false,
			});
		}
	}

	// Sort changes: morning first (A-Z), then afternoon (A-Z)
	const shiftOrder: Record<string, number> = {
		morning: 0,
		afternoon: 1,
		full_day: 2,
	};
	changes.sort((a, b) => {
		const shiftDiff = (shiftOrder[a.shift] ?? 99) - (shiftOrder[b.shift] ?? 99);
		if (shiftDiff !== 0) return shiftDiff;
		return a.packerName.toLowerCase().localeCompare(b.packerName.toLowerCase());
	});

	return changes;
}
