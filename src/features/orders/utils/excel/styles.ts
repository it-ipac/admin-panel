import type ExcelJS from "exceljs";

export const headerStyle: Partial<ExcelJS.Style> = {
	font: { bold: true, color: { argb: "FFFFFFFF" } },
	fill: {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF2563EB" },
	},
	alignment: { horizontal: "center", vertical: "middle" },
	border: {
		top: { style: "thin" },
		left: { style: "thin" },
		bottom: { style: "thin" },
		right: { style: "thin" },
	},
};

export const subHeaderStyle: Partial<ExcelJS.Style> = {
	font: { bold: true },
	fill: {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFE5E7EB" },
	},
	alignment: { horizontal: "center", vertical: "middle" },
	border: {
		top: { style: "thin" },
		left: { style: "thin" },
		bottom: { style: "thin" },
		right: { style: "thin" },
	},
};
