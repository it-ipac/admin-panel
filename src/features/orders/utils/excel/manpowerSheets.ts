import type ExcelJS from "exceljs";
import type { AttendanceLog, Order } from "../../types";
import { headerStyle, subHeaderStyle } from "./styles";

/** Sheet 1: manpower overview + per-packer hour totals. */
export function addManpowerSummarySheet(
	workbook: ExcelJS.Workbook,
	order: Order,
	attendanceLogs: AttendanceLog[] | undefined,
): void {
	const manpowerSheet = workbook.addWorksheet("Manpower Summary");

	manpowerSheet.mergeCells("A1:C1");
	const titleCell = manpowerSheet.getCell("A1");
	titleCell.value = `Manpower Summary - ${order.order_name}`;
	titleCell.font = { bold: true, size: 14 };
	titleCell.alignment = { horizontal: "center" };

	// Calculate manpower summary
	const workDays = [
		...new Set(attendanceLogs?.map((log) => log.log_date) || []),
	];
	const uniquePackers = [
		...new Set(
			attendanceLogs?.map((log) => log.packer?.full_name).filter(Boolean) || [],
		),
	];

	let totalManHours = 0;
	const packerHours: Record<string, number> = {};

	attendanceLogs?.forEach((log) => {
		if (log.start_time && log.end_time && log.packer?.full_name) {
			const hours =
				(new Date(log.end_time).getTime() -
					new Date(log.start_time).getTime()) /
				(1000 * 60 * 60);
			totalManHours += hours;
			packerHours[log.packer.full_name] =
				(packerHours[log.packer.full_name] || 0) + hours;
		}
	});

	// Summary section
	manpowerSheet.getCell("A3").value = "OVERVIEW";
	manpowerSheet.getCell("A3").font = { bold: true, size: 12 };

	manpowerSheet.getCell("A4").value = "Total Work Days:";
	manpowerSheet.getCell("B4").value = workDays.length;
	manpowerSheet.getCell("A5").value = "Total Packers:";
	manpowerSheet.getCell("B5").value = uniquePackers.length;
	manpowerSheet.getCell("A6").value = "Total Man-Hours:";
	manpowerSheet.getCell("B6").value = `${totalManHours.toFixed(1)} hrs`;
	manpowerSheet.getCell("B6").font = {
		bold: true,
		color: { argb: "FF16A34A" },
	};

	if (workDays.length > 0) {
		const sortedDays = [...workDays].sort();
		manpowerSheet.getCell("A7").value = "Start Date:";
		manpowerSheet.getCell("B7").value = new Date(
			sortedDays[0],
		).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
		manpowerSheet.getCell("A8").value = "End Date:";
		manpowerSheet.getCell("B8").value = new Date(
			sortedDays[sortedDays.length - 1],
		).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	// Packer summary
	let rowIndex = 10;
	manpowerSheet.getCell(`A${rowIndex}`).value = "PACKER HOURS";
	manpowerSheet.getCell(`A${rowIndex}`).font = { bold: true, size: 12 };
	rowIndex++;

	const packerHeaderRow = manpowerSheet.getRow(rowIndex);
	packerHeaderRow.getCell(1).value = "Packer";
	packerHeaderRow.getCell(2).value = "Total Hours";
	Object.assign(packerHeaderRow.getCell(1), subHeaderStyle);
	Object.assign(packerHeaderRow.getCell(2), subHeaderStyle);
	rowIndex++;

	Object.entries(packerHours)
		.sort((a, b) => b[1] - a[1])
		.forEach(([name, hours]) => {
			const row = manpowerSheet.getRow(rowIndex);
			row.values = [name, `${hours.toFixed(1)} hrs`];
			rowIndex++;
		});

	manpowerSheet.columns = [{ width: 25 }, { width: 20 }, { width: 15 }];
}

/** Sheet 2: per-day attendance breakdown. */
export function addManpowerBreakdownSheet(
	workbook: ExcelJS.Workbook,
	order: Order,
	attendanceLogs: AttendanceLog[] | undefined,
): void {
	const attendanceSheet = workbook.addWorksheet("Manpower Breakdown");

	attendanceSheet.mergeCells("A1:F1");
	const attTitle = attendanceSheet.getCell("A1");
	attTitle.value = `Daily Attendance Log - ${order.order_name}`;
	attTitle.font = { bold: true, size: 14 };
	attTitle.alignment = { horizontal: "center" };

	const dailyHeaders = [
		"Date",
		"Packer",
		"Shift",
		"Start Time",
		"End Time",
		"Hours",
	];
	const dailyHeaderRow = attendanceSheet.getRow(3);
	dailyHeaders.forEach((header, i) => {
		const cell = dailyHeaderRow.getCell(i + 1);
		cell.value = header;
		Object.assign(cell, headerStyle);
	});

	let rowIndex = 4;
	const sortedAttendance = [...(attendanceLogs || [])].sort((a, b) => {
		const dateCompare = a.log_date.localeCompare(b.log_date);
		if (dateCompare !== 0) return dateCompare;
		return (a.start_time || "").localeCompare(b.start_time || "");
	});

	sortedAttendance.forEach((log) => {
		const row = attendanceSheet.getRow(rowIndex);
		const hours =
			log.start_time && log.end_time
				? (
						(new Date(log.end_time).getTime() -
							new Date(log.start_time).getTime()) /
						(1000 * 60 * 60)
					).toFixed(1)
				: "—";

		row.values = [
			new Date(log.log_date).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			}),
			log.packer?.full_name || "Unknown",
			log.shift_period,
			log.start_time
				? new Date(log.start_time).toLocaleTimeString("en-US", {
						hour: "2-digit",
						minute: "2-digit",
					})
				: "—",
			log.end_time
				? new Date(log.end_time).toLocaleTimeString("en-US", {
						hour: "2-digit",
						minute: "2-digit",
					})
				: "—",
			hours,
		];
		rowIndex++;
	});

	attendanceSheet.columns = [
		{ width: 15 },
		{ width: 25 },
		{ width: 15 },
		{ width: 15 },
		{ width: 15 },
		{ width: 12 },
	];
}
