import type ExcelJS from "exceljs";
import type { RawPackageRow } from "./types";
import { normalizePackingTypeCode, parseNumberText } from "./utils";

/**
 * Safely extracts a plain string from any ExcelJS cell value type.
 * Handles rich text objects, formula results, hyperlinks, and primitives.
 * Prevents the "[object Object]" issue caused by cells with bold/coloured
 * header text being stored as RichText rather than plain strings.
 */
function extractCellText(cell: ExcelJS.Cell): string {
	const extractRichText = (value: unknown): string => {
		if (!value || typeof value !== "object" || !("richText" in value))
			return "";
		const richTextValue = (
			value as { richText?: Array<{ text?: string | null }> }
		).richText;
		if (!Array.isArray(richTextValue)) return "";
		return richTextValue
			.map((part) => part.text ?? "")
			.join("")
			.trim();
	};

	const v = cell.value;
	if (v === null || v === undefined) return "";
	if (typeof v === "string") return v.trim();
	if (typeof v === "number" || typeof v === "boolean") return String(v).trim();
	if (v instanceof Date) return "";
	if (typeof v === "object") {
		// CellRichTextValue: { richText: [{text, font, ...}] }
		if (
			"richText" in v &&
			Array.isArray((v as ExcelJS.CellRichTextValue).richText)
		) {
			return extractRichText(v);
		}
		// CellFormulaValue: { formula, result }
		if ("result" in v) {
			const r = (v as ExcelJS.CellFormulaValue).result;
			if (typeof r === "string") return r.trim();
			if (typeof r === "number" || typeof r === "boolean")
				return String(r).trim();
			// formula result can itself be a rich text object
			if (r && typeof r === "object" && "richText" in r) {
				return extractRichText(r);
			}
			return "";
		}
		// CellHyperlinkValue: { text, hyperlink }
		if ("hyperlink" in v) {
			const linked = v as ExcelJS.CellHyperlinkValue;
			if (typeof linked.text === "string") return linked.text.trim();
			// text can also be a rich text object
			if (
				linked.text &&
				typeof linked.text === "object" &&
				"richText" in linked.text
			) {
				return extractRichText(linked.text);
			}
		}
	}
	return "";
}

function normalizeDefensorText(text: string): string {
	if (!text) return text;
	if (/defen[sd][eo]r\s+only/i.test(text)) {
		return text.replace(/defen[sd][eo]r\s+only/gi, "DFS Only");
	}
	return text.replace(/defen[sd][eo]r/gi, "DFS");
}

export const parsePackageRows = (
	sheet: ExcelJS.Worksheet,
	columnOffset = 0,
) => {
	const rows: RawPackageRow[] = [];
	let packageNumber = 1;
	const normalizeLabel = (value: string | null | undefined) =>
		(value || "")
			.toLowerCase()
			.replace(/\bpacking\b/g, "pkg")
			.replace(/\bpackage\b/g, "pkg")
			.replace(/[^a-z0-9]/g, "");
	const isGasPackingOnly = (value: string | null | undefined) =>
		normalizeLabel(value).includes("gaspkgonly");
	const hasTypeLabel = (value: string | null | undefined) =>
		(value || "").trim().length > 0;
	const clearBar = (
		bar: RawPackageRow["manufacturing"]["base"]["horizontal"],
	) => ({
		...bar,
		typeLabel: null,
		quantity: null,
		width: null,
		thickness: null,
		space: null,
	});
	const clearTemplate = (template: RawPackageRow["manufacturing"]["big"]) => ({
		...template,
		typeLabel: null,
		quantity: null,
		thickness: null,
		horizontal: clearBar(template.horizontal),
		vertical: clearBar(template.vertical),
	});
	const sanitizeGasBar = (
		bar: RawPackageRow["manufacturing"]["base"]["horizontal"],
	) => {
		const shouldKeep =
			hasTypeLabel(bar.typeLabel) &&
			bar.width !== null &&
			bar.thickness !== null;
		return shouldKeep ? bar : clearBar(bar);
	};
	const sanitizeGasTemplate = (
		template: RawPackageRow["manufacturing"]["big"],
	) => {
		if (!hasTypeLabel(template.typeLabel)) return clearTemplate(template);
		return {
			...template,
			horizontal: sanitizeGasBar(template.horizontal),
			vertical: sanitizeGasBar(template.vertical),
		};
	};
	const columnToNumber = (label: string) => {
		let result = 0;
		for (let i = 0; i < label.length; i += 1) {
			result = result * 26 + (label.charCodeAt(i) - 64);
		}
		return result;
	};
	const numberToColumn = (value: number) => {
		let remainder = value;
		let columnLabel = "";
		while (remainder > 0) {
			const current = (remainder - 1) % 26;
			columnLabel = String.fromCharCode(65 + current) + columnLabel;
			remainder = Math.floor((remainder - 1) / 26);
		}
		return columnLabel;
	};
	const shiftColumn = (label: string) => {
		const numeric = columnToNumber(label);
		if (numeric <= 2) return label;
		if (columnOffset === 2) {
			const equipmentDimensionsStart = columnToNumber("M");
			const effectiveOffset = numeric >= equipmentDimensionsStart ? -1 : 2;
			return numberToColumn(numeric + effectiveOffset);
		}
		return numberToColumn(numeric + columnOffset);
	};
	const getText = (column: string, rowNumber: number) =>
		normalizeDefensorText(
			extractCellText(sheet.getCell(`${shiftColumn(column)}${rowNumber}`)),
		);
	const getLiteralText = (column: string, rowNumber: number) =>
		normalizeDefensorText(
			extractCellText(sheet.getCell(`${column}${rowNumber}`)),
		);

	for (let row = 4; row < 1000; row += 1) {
		const currentLabel = getText("B", row);
		const quantity = parseNumberText(getText("A", row));
		const hasDesignation = currentLabel.trim().length > 0;
		const hasValidQuantity =
			quantity !== null && quantity > 0 && Number.isInteger(quantity);

		// Ignore header/noise rows. A package row is valid only when:
		// - Column A has a positive whole number
		// - Column B has a designation
		if (!hasDesignation || !hasValidQuantity) {
			continue;
		}

		const itemLength = parseNumberText(getText("M", row));
		const itemWidth = parseNumberText(getText("N", row));
		const itemHeight = parseNumberText(getText("O", row));
		const internalLength = parseNumberText(getText("V", row));
		const internalWidth = parseNumberText(getText("W", row));
		const internalHeight = parseNumberText(getText("X", row));
		const externalLength = parseNumberText(getText("Y", row));
		const externalWidth = parseNumberText(getText("Z", row));
		const externalHeight = parseNumberText(getText("AA", row));
		const netWeight = parseNumberText(getText("U", row));
		const tare = parseNumberText(getText("BAB", row));
		const grossWeight =
			netWeight !== null && tare !== null ? netWeight + tare : null;
		const boxTypeLabel = getText("C", row) || null;
		const packingTypeRaw = getText("AB", row) || null;
		const packingTypeCode = normalizePackingTypeCode(packingTypeRaw);
		const seiCategoryRaw =
			columnOffset === 2 ? getLiteralText("C", row) || null : null;
		const seiProtectionRaw =
			columnOffset === 2 ? getLiteralText("D", row) || null : null;

		const bigTypeLabel = getText("BK", row) || null;
		const bigQuantity = parseNumberText(getText("BM", row));
		const bigThickness = parseNumberText(getText("BP", row));
		const bigHorizQty = parseNumberText(getText("DS", row));
		const bigHorizType = getText("DQ", row) || null;
		const bigHorizWidth = parseNumberText(getText("DV", row));
		const bigHorizThickness = parseNumberText(getText("DW", row));
		const bigHorizSpace = parseNumberText(getText("DT", row));
		const bigVertQty = parseNumberText(getText("EC", row));
		const bigVertWidth = parseNumberText(getText("EF", row));
		const bigVertThickness = parseNumberText(getText("EG", row));
		const bigVertSpace = parseNumberText(getText("ED", row));

		const smallTypeLabel = getText("GB", row) || null;
		const smallQuantity = parseNumberText(getText("GC", row));
		const smallThickness = parseNumberText(getText("GF", row));
		const smallHorizQty = parseNumberText(getText("IJ", row));
		const smallHorizType = getText("IH", row) || null;
		const smallHorizWidth = parseNumberText(getText("IM", row));
		const smallHorizThickness = parseNumberText(getText("IN", row));
		const smallHorizSpace = parseNumberText(getText("IK", row));
		const smallVertQty = parseNumberText(getText("IT", row));
		const smallVertWidth = parseNumberText(getText("IW", row));
		const smallVertThickness = parseNumberText(getText("IX", row));
		const smallVertSpace = parseNumberText(getText("IU", row));

		const lidTypeLabel = getText("KS", row) || null;
		const lidQuantity = parseNumberText(getText("KT", row));
		const lidThickness = parseNumberText(getText("KW", row));
		const lidHorizQty = parseNumberText(getText("NA", row));
		const lidHorizType = getText("MY", row) || null;
		const lidHorizWidth = parseNumberText(getText("ND", row));
		const lidHorizThickness = parseNumberText(getText("NE", row));
		const lidHorizSpace = parseNumberText(getText("NB", row));
		const lidVertQty = parseNumberText(getText("NK", row));
		const lidVertWidth = parseNumberText(getText("NN", row));
		const lidVertThickness = parseNumberText(getText("NO", row));
		const lidVertSpace = parseNumberText(getText("NL", row));

		const baseTypeLabel = getText("PL", row) || null;
		const baseQuantity = parseNumberText(getText("PM", row));
		const baseThickness = parseNumberText(getText("PP", row));
		const baseHorizQty = parseNumberText(getText("RU", row));
		const baseHorizType = getText("RS", row) || null;
		const baseHorizWidth = parseNumberText(getText("RX", row));
		const baseHorizThickness = parseNumberText(getText("RY", row));
		const baseHorizSpace = parseNumberText(getText("RV", row));
		const baseVertQty = parseNumberText(getText("SB", row));
		const baseVertWidth = parseNumberText(getText("SE", row));
		const baseVertThickness = parseNumberText(getText("SF", row));
		const baseVertSpace = parseNumberText(getText("SC", row));
		const baseSkidQty = parseNumberText(getText("TY", row));
		const baseSkidType = getText("TW", row) || null;
		const baseSkidWidth = parseNumberText(getText("UB", row));
		const baseSkidThickness = parseNumberText(getText("UC", row));
		const baseSkidSpace = parseNumberText(getText("TZ", row));

		const accessories: RawPackageRow["accessories"] = [];
		const accessoryStart = columnToNumber(shiftColumn("BAD"));
		const accessoryEnd = columnToNumber(shiftColumn("BDA"));
		const getAccessoryHeader = (col: number) => {
			const headerRow2 = normalizeDefensorText(
				extractCellText(sheet.getCell(2, col)),
			);
			const headerRow3 = normalizeDefensorText(
				extractCellText(sheet.getCell(3, col)),
			);
			return headerRow3 || headerRow2;
		};
		// Skip quantity/metadata sub-header columns that aren't material names.
		// "Qty …" / "Quantity …" prefixes are sub-quantity columns.
		// Bare "Total" (alone) is a summary column.  "Total screws" is a valid material name.
		const SUB_HEADER_PATTERN =
			/^(?:qty\b|quantity\b|space\b|per loop)|^total$/i;
		for (let col = accessoryStart; col <= accessoryEnd; col += 1) {
			const typeLabel = getAccessoryHeader(col);
			const amount = parseNumberText(extractCellText(sheet.getCell(row, col)));
			if (typeLabel && !SUB_HEADER_PATTERN.test(typeLabel) && amount !== null) {
				accessories.push({ typeLabel, amount });
			}
		}

		const securingCandidates: RawPackageRow["securing"] = [
			{
				typeLabel: getText("WT", row) || null,
				quantity: parseNumberText(getText("WV", row)),
				width: parseNumberText(getText("WX", row)),
				thickness: parseNumberText(getText("WY", row)),
			},
			{
				typeLabel: getText("AAM", row) || null,
				quantity: parseNumberText(getText("AAO", row)),
				width: parseNumberText(getText("AAQ", row)),
				thickness: parseNumberText(getText("AAR", row)),
			},
			{
				typeLabel: getText("AEF", row) || null,
				quantity: parseNumberText(getText("AEH", row)),
				width: parseNumberText(getText("AEJ", row)),
				thickness: parseNumberText(getText("AEK", row)),
			},
			{
				typeLabel: getText("AHY", row) || null,
				quantity: parseNumberText(getText("AIA", row)),
				width: parseNumberText(getText("AIC", row)),
				thickness: parseNumberText(getText("AID", row)),
			},
			{
				typeLabel: getText("ALR", row) || null,
				quantity: parseNumberText(getText("ALT", row)),
				width: parseNumberText(getText("ALV", row)),
				thickness: parseNumberText(getText("ALW", row)),
			},
			{
				typeLabel: getText("APK", row) || null,
				quantity: parseNumberText(getText("APM", row)),
				width: parseNumberText(getText("APO", row)),
				thickness: parseNumberText(getText("APP", row)),
			},
			{
				typeLabel: getText("ATD", row) || null,
				quantity: parseNumberText(getText("ATF", row)),
				width: parseNumberText(getText("ATH", row)),
				thickness: parseNumberText(getText("ATI", row)),
			},
		];

		const securing = securingCandidates.filter(
			(part) =>
				part.quantity !== null ||
				part.width !== null ||
				part.thickness !== null,
		);

		const manufacturing: RawPackageRow["manufacturing"] = {
			big: {
				quantity: bigQuantity,
				typeLabel: bigTypeLabel,
				thickness: bigThickness !== null ? bigThickness * 10 : null,
				horizontal: {
					quantity: bigHorizQty,
					typeLabel: bigHorizType,
					width: bigHorizWidth,
					thickness: bigHorizThickness,
					space: bigHorizSpace,
				},
				vertical: {
					quantity: bigVertQty,
					typeLabel: bigHorizType,
					width: bigVertWidth,
					thickness: bigVertThickness,
					space: bigVertSpace,
				},
			},
			small: {
				quantity: smallQuantity,
				typeLabel: smallTypeLabel,
				thickness: smallThickness !== null ? smallThickness * 10 : null,
				horizontal: {
					quantity: smallHorizQty,
					typeLabel: smallHorizType,
					width: smallHorizWidth,
					thickness: smallHorizThickness,
					space: smallHorizSpace,
				},
				vertical: {
					quantity: smallVertQty,
					typeLabel: smallHorizType,
					width: smallVertWidth,
					thickness: smallVertThickness,
					space: smallVertSpace,
				},
			},
			lid: {
				quantity: lidQuantity,
				typeLabel: lidTypeLabel,
				thickness: lidThickness !== null ? lidThickness * 10 : null,
				horizontal: {
					quantity: lidHorizQty,
					typeLabel: lidHorizType,
					width: lidHorizWidth,
					thickness: lidHorizThickness,
					space: lidHorizSpace,
				},
				vertical: {
					quantity: lidVertQty,
					typeLabel: lidHorizType,
					width: lidVertWidth,
					thickness: lidVertThickness,
					space: lidVertSpace,
				},
			},
			base: {
				quantity: baseQuantity,
				typeLabel: baseTypeLabel,
				thickness: baseThickness !== null ? baseThickness * 10 : null,
				horizontal: {
					quantity: baseHorizQty,
					typeLabel: baseHorizType,
					width: baseHorizWidth,
					thickness: baseHorizThickness,
					space: baseHorizSpace,
				},
				vertical: {
					quantity: baseVertQty,
					typeLabel: baseHorizType,
					width: baseVertWidth,
					thickness: baseVertThickness,
					space: baseVertSpace,
				},
				skids: {
					quantity: baseSkidQty,
					typeLabel: baseSkidType,
					width: baseSkidWidth,
					thickness: baseSkidThickness,
					space: baseSkidSpace,
				},
			},
		};

		if (isGasPackingOnly(boxTypeLabel)) {
			manufacturing.big = sanitizeGasTemplate(manufacturing.big);
			manufacturing.small = sanitizeGasTemplate(manufacturing.small);
			manufacturing.lid = sanitizeGasTemplate(manufacturing.lid);
		}

		rows.push({
			rowIndex: row,
			packageNumber,
			designation: currentLabel,
			quantity,
			item_length: itemLength,
			item_width: itemWidth,
			item_height: itemHeight,
			internal_length: internalLength,
			internal_width: internalWidth,
			internal_height: internalHeight,
			external_length: externalLength,
			external_width: externalWidth,
			external_height: externalHeight,
			net_weight: netWeight,
			tare,
			gross_weight: grossWeight,
			boxTypeLabel,
			packingTypeRaw,
			packingTypeCode,
			seiCategoryRaw,
			seiProtectionRaw,
			manufacturing,
			securing,
			accessories,
		});

		packageNumber += 1;
	}

	return rows;
};
