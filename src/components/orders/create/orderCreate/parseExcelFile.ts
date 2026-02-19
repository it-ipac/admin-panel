import ExcelJS from "exceljs";
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

export const parseExcelFile = async (
	file: File,
	options: ParseExcelFileOptions,
): Promise<ParseResult> => {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(await file.arrayBuffer());
	const candidateOrderName =
		options.orderNameForDetection?.trim() || stripExtension(file.name);
	const detectedVersion = detectExcelTemplateVersion(candidateOrderName);
	const appliedTemplateMode = resolveExcelTemplateMode(
		options.versionMode,
		detectedVersion,
	);
	const columnOffset = appliedTemplateMode === "v54plus" ? 2 : 0;
	const calculationSheet = workbook.worksheets.find(
		(sheet) => sheet.name === "Calculation",
	);
	const targetSheet = calculationSheet ?? workbook.worksheets[0];

	if (!targetSheet) {
		return {
			worksheetNames: [],
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
		worksheetNames: [targetSheet.name],
		rawPackages,
		packageCount: rawPackages.length,
		fileError: calculationSheet
			? null
			: '"Calculation" sheet not found. Using the first worksheet instead.',
		detectedVersion,
		appliedTemplateMode,
		columnOffset,
	};
};
