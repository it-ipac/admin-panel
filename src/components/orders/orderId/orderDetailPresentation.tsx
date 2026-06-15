import { Clock, Moon, Sun, Sunset } from "lucide-react";
import type {
	AttendanceLog,
	OrderPackage,
	PackageInfo,
	TaskLog,
} from "@/features/orders/types";

/** Status chip classes for production/package statuses. */
export const getStatusColor = (status: string): string => {
	switch (status?.toLowerCase()) {
		case "completed":
		case "packed":
		case "delivered":
			return "bg-primary-100 text-primary-800 border-primary-200";
		case "in_progress":
		case "in_production":
			return "bg-success-100 text-success-800 border-success-200";
		case "pending":
		case "design":
			return "bg-warning-100 text-warning-800 border-warning-200";
		case "on_hold":
			return "bg-ember-100 text-ember-800 border-ember-200";
		case "approved":
			return "bg-accent-100 text-accent-800 border-accent-200";
		default:
			return "bg-neutral-100 text-neutral-800 border-neutral-200";
	}
};

export const getCommercialStatusColor = (status: string): string => {
	switch (status?.toLowerCase()) {
		case "paid":
			return "bg-success-100 text-success-700";
		case "invoiced":
			return "bg-primary-100 text-primary-700";
		case "approved":
			return "bg-accent-100 text-accent-700";
		case "quoted":
			return "bg-warning-100 text-warning-700";
		case "draft":
			return "bg-neutral-100 text-neutral-700";
		default:
			return "bg-neutral-100 text-neutral-700";
	}
};

export const formatDate = (dateString: string | null): string => {
	if (!dateString) return "Not set";
	return new Date(dateString).toLocaleDateString("en-US", {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

export const formatDateTime = (dateString: string | null): string => {
	if (!dateString) return "Not set";
	return new Date(dateString).toLocaleString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

export const formatTime = (dateString: string | null): string => {
	if (!dateString) return "—";
	return new Date(dateString).toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});
};

export const getShiftIcon = (shift: string): React.ReactNode => {
	switch (shift) {
		case "morning":
			return <Sun className="w-4 h-4 text-warning-500" />;
		case "afternoon":
			return <Sunset className="w-4 h-4 text-ember-500" />;
		case "full_day":
			return <Moon className="w-4 h-4 text-primary-500" />;
		default:
			return <Clock className="w-4 h-4 text-neutral-500" />;
	}
};

export const getShiftLabel = (shift: string): string => {
	switch (shift) {
		case "morning":
			return "Morning";
		case "afternoon":
			return "Afternoon";
		case "full_day":
			return "Full Day";
		default:
			return shift;
	}
};

/** Final value when set, otherwise the original value. */
export const getMergedField = (
	pkg: OrderPackage,
	field: keyof PackageInfo,
): any => {
	const finalVal = pkg.final_pkg_info?.[field];
	const originalVal = pkg.original_pkg_info?.[field];
	if (finalVal !== null && finalVal !== undefined && finalVal !== "") {
		return finalVal as any;
	}
	return (originalVal ?? null) as any;
};

export const getDimensions = (pkg: OrderPackage): string | null => {
	if (!pkg.final_pkg_info && !pkg.original_pkg_info) return null;

	// Prefer external dimensions, fall back to internal
	const extL = getMergedField(pkg, "external_length");
	const extW = getMergedField(pkg, "external_width");
	const extH = getMergedField(pkg, "external_height");

	const intL = getMergedField(pkg, "internal_length");
	const intW = getMergedField(pkg, "internal_width");
	const intH = getMergedField(pkg, "internal_height");

	const l = extL || intL;
	const w = extW || intW;
	const h = extH || intH;

	if (l && w && h) {
		return `${l} × ${w} × ${h} cm`;
	}
	return null;
};

export const getWeight = (pkg: OrderPackage): number | null => {
	if (!pkg.final_pkg_info && !pkg.original_pkg_info) return null;
	const gross = getMergedField(pkg, "gross_weight");
	const net = getMergedField(pkg, "net_weight");
	return gross || net;
};

/** Smart default end time for a task: 12:00 for morning starts, else
 *  latest afternoon attendance end (fallback 23:59). */
export const getSmartEndTime = (
	task: TaskLog,
	attendanceLogs: AttendanceLog[] | undefined,
): string => {
	const taskDate = new Date(task.start_time);
	const taskDateStr = taskDate.toISOString().split("T")[0];
	const taskHour = taskDate.getHours();

	// Determine if morning or afternoon based on task start time
	const isMorning = taskHour < 12;

	// Look for attendance logs on that day to get shift end time
	const dayAttendance =
		attendanceLogs?.filter((log) => log.log_date === taskDateStr) || [];

	if (isMorning) {
		// Morning shift - default to 12:00 PM
		return `${taskDateStr}T12:00`;
	} else {
		// Afternoon shift - try to get end time from attendance
		const afternoonLogs = dayAttendance.filter(
			(log) => log.shift_period === "afternoon" && log.end_time,
		);
		if (afternoonLogs.length > 0) {
			// Use the latest end time from afternoon attendance
			const latestEnd = afternoonLogs
				.map((log) => new Date(log.end_time!))
				.sort((a, b) => b.getTime() - a.getTime())[0];
			return latestEnd.toISOString().slice(0, 16);
		}
		// Default to 11:59 PM
		return `${taskDateStr}T23:59`;
	}
};
