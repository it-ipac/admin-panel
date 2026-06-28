// Loads a dropped TAQA items file (.xlsx/.xlsm/.xls/.csv) into the ManifestWorksheet
// shape the parser consumes. ExcelJS for xlsx/xlsm, SheetJS for csv/xls/xlsb.

import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { isManifestWorksheet, type ManifestWorksheet } from "./manifestParser";

const buildExcelJsWorksheets = (
	workbook: ExcelJS.Workbook,
): ManifestWorksheet[] =>
	workbook.worksheets.map((worksheet) => ({
		name: worksheet.name,
		rowCount: worksheet.rowCount || 0,
		getCellText: (rowNumber: number, columnNumber: number) =>
			worksheet.getCell(rowNumber, columnNumber).text?.trim() || "",
	}));

const buildXlsxWorksheets = (workbook: XLSX.WorkBook): ManifestWorksheet[] =>
	workbook.SheetNames.map((sheetName) => {
		const worksheet = workbook.Sheets[sheetName] as XLSX.WorkSheet;
		const ref = worksheet["!ref"];
		const range = ref ? XLSX.utils.decode_range(ref) : null;
		return {
			name: sheetName,
			rowCount: range ? range.e.r + 1 : 0,
			getCellText: (rowNumber: number, columnNumber: number) => {
				const address = XLSX.utils.encode_cell({
					r: rowNumber - 1,
					c: columnNumber - 1,
				});
				const cell = worksheet[address] as XLSX.CellObject | undefined;
				if (!cell) return "";
				return String(cell.w ?? cell.v ?? "").trim();
			},
		};
	});

const getExtension = (fileName: string): string => {
	const dot = fileName.lastIndexOf(".");
	return dot < 0 ? "" : fileName.slice(dot + 1).toLowerCase();
};

/** Load the file and return the worksheet that looks like the items manifest. */
export const loadManifestWorksheet = async (
	file: File,
): Promise<ManifestWorksheet | null> => {
	const buffer = await file.arrayBuffer();
	const extension = getExtension(file.name);
	let worksheets: ManifestWorksheet[] = [];

	if (extension === "csv" || extension === "xls" || extension === "xlsb") {
		worksheets = buildXlsxWorksheets(
			XLSX.read(buffer, {
				type: "array",
				cellText: true,
				cellFormula: false,
				cellDates: false,
			}),
		);
	} else {
		try {
			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.load(buffer);
			worksheets = buildExcelJsWorksheets(workbook);
		} catch {
			worksheets = buildXlsxWorksheets(
				XLSX.read(buffer, { type: "array", cellText: true }),
			);
		}
	}

	if (!worksheets.length) return null;
	return worksheets.find(isManifestWorksheet) || worksheets[0];
};
