import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { parsePackageRows } from "./parsePackageRows";
import type { AppliedExcelTemplateMode, ExcelTemplateMode } from "./types";
import {
	detectExcelTemplateVersion,
	resolveExcelTemplateMode,
	stripExtension,
} from "./utils";

interface ParseResult {
	worksheetNames: string[];
	rawPackages: ReturnType<typeof parsePackageRows>;
	packageCount: number;
	fileError: string | null;
	detectedVersion: number | null;
	appliedTemplateMode: AppliedExcelTemplateMode;
	columnOffset: number;
}

interface ParseExcelFileOptions {
	versionMode: ExcelTemplateMode;
	orderNameForDetection?: string;
}

const CALCULATION_SHEET_NAME = "Calculation";

const findCalculationSheetName = (sheetNames: string[]) =>
	sheetNames.find((sheetName) => sheetName === CALCULATION_SHEET_NAME);

const toExcelJsWorksheet = (
	workbook: XLSX.WorkBook,
	sheetName: string,
): ExcelJS.Worksheet => {
	const sourceSheet = workbook.Sheets[sheetName];
	const convertedWorkbook = new ExcelJS.Workbook();
	const convertedSheet = convertedWorkbook.addWorksheet(sheetName);

	if (!sourceSheet) return convertedSheet;

	const rows = XLSX.utils.sheet_to_json(sourceSheet, {
		header: 1,
		raw: false,
		defval: null,
	}) as unknown[][];

	rows.forEach((row, rowIndex) => {
		row.forEach((cellValue, colIndex) => {
			if (cellValue === null || cellValue === undefined || cellValue === "") return;
			convertedSheet.getCell(rowIndex + 1, colIndex + 1).value =
				cellValue as any;
		});
	});

	return convertedSheet;
};

const parseWorkbookWithExcelJs = async (arrayBuffer: ArrayBuffer) => {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(arrayBuffer);
	const worksheetNames = workbook.worksheets.map((sheet) => sheet.name);

	if (!worksheetNames.length) {
		throw new Error("ExcelJS loaded workbook with no worksheets");
	}

	const calculationSheetName = findCalculationSheetName(worksheetNames);
	const targetSheet = calculationSheetName
		? workbook.worksheets.find((sheet) => sheet.name === calculationSheetName) || null
		: workbook.worksheets[0] || null;

	return {
		worksheetNames,
		targetSheet,
		usedCalculationSheet: Boolean(calculationSheetName),
	};
};

const parseWorkbookWithSheetJs = (arrayBuffer: ArrayBuffer) => {
	const workbook = XLSX.read(arrayBuffer, {
		type: "array",
		cellDates: true,
		cellFormula: true,
	});

	const worksheetNames = workbook.SheetNames || [];
	const calculationSheetName = findCalculationSheetName(worksheetNames);
	const targetSheetName = calculationSheetName ?? worksheetNames[0] ?? null;
	const targetSheet = targetSheetName
		? toExcelJsWorksheet(workbook, targetSheetName)
		: null;

	return {
		worksheetNames,
		targetSheet,
		usedCalculationSheet: Boolean(calculationSheetName),
	};
};

export const parseExcelFile = async (
	file: File,
	options: ParseExcelFileOptions,
): Promise<ParseResult> => {
	const arrayBuffer = await file.arrayBuffer();
	const normalizedFileName = String(file.name || "").toLowerCase();
	const shouldPreferSheetJs = normalizedFileName.endsWith(".xlsb");
	let worksheetNames: string[] = [];
	let targetSheet: ExcelJS.Worksheet | null = null;
	let usedCalculationSheet = false;

	if (shouldPreferSheetJs) {
		const parsedWithSheetJs = parseWorkbookWithSheetJs(arrayBuffer);
		worksheetNames = parsedWithSheetJs.worksheetNames;
		targetSheet = parsedWithSheetJs.targetSheet;
		usedCalculationSheet = parsedWithSheetJs.usedCalculationSheet;
	} else {
		try {
			const parsedWithExcelJs = await parseWorkbookWithExcelJs(arrayBuffer);
			worksheetNames = parsedWithExcelJs.worksheetNames;
			targetSheet = parsedWithExcelJs.targetSheet;
			usedCalculationSheet = parsedWithExcelJs.usedCalculationSheet;
		} catch {
			const parsedWithSheetJs = parseWorkbookWithSheetJs(arrayBuffer);
			worksheetNames = parsedWithSheetJs.worksheetNames;
			targetSheet = parsedWithSheetJs.targetSheet;
			usedCalculationSheet = parsedWithSheetJs.usedCalculationSheet;
		}
	}

	const candidateOrderName =
		options.orderNameForDetection?.trim() || stripExtension(file.name);
	const detectedVersion = detectExcelTemplateVersion(candidateOrderName);
	const appliedTemplateMode = resolveExcelTemplateMode(
		options.versionMode,
		detectedVersion,
	);
	const columnOffset = appliedTemplateMode === "v54plus" ? 2 : 0;

	if (!targetSheet) {
		return {
			worksheetNames,
			rawPackages: [],
			packageCount: 0,
			fileError: "No worksheets were found in this Excel file.",
			detectedVersion,
			appliedTemplateMode,
			columnOffset,
		};
	}

	const rawPackages = parsePackageRows(targetSheet, columnOffset);
	return {
		worksheetNames,
		rawPackages,
		packageCount: rawPackages.length,
		fileError: usedCalculationSheet
			? null
			: '"Calculation" sheet not found. Using the first worksheet instead.',
		detectedVersion,
		appliedTemplateMode,
		columnOffset,
	};
};
