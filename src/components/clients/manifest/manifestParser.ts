// Pure parsing for the new order-manifest workbook format.
// No UI and no Supabase imports — safe to unit test in isolation.
//
// Column layout (1-indexed, headers are mislabeled vs content):
//   A      Total            -> expected_qty (authoritative per-row qty)
//   B..E   "<from> to <to>" -> lane quantities; fallback for expected_qty when A is blank
//   F      ITEMNUM          -> item_num
//   G      DESCRIPTION      -> ignored (short code e.g. "N-03")
//   H      "Reference"      -> description (the real long text)
//   J      "Location 03"    -> reference (client bin/ref code, e.g. 02G02B029)
//   N      Destination      -> destination code
//   S/T/U  L/W/H            -> length/width/height
//   V      (blank header)   -> packing (SB family vs m2m method/status, kept raw)
//   W      (blank header)   -> category tag string (e.g. "Power AC")
//   AE     (blank header)   -> composite label; holds annotation markers

export interface ManifestWorksheet {
	name: string;
	rowCount: number;
	getCellText: (rowNumber: number, columnNumber: number) => string;
}

export interface ManifestRow {
	_row_id: string;
	_source_row_number: number;
	item_num: string;
	description: string;
	reference: string;
	/** Normalized destination code (uppercased, CR/LF stripped); "" = unassigned. */
	destination: string;
	/** Per-row quantity from column A (Total); falls back to the B:E lane sum when A is blank. */
	expected_qty: number;
	length: number | null;
	width: number | null;
	height: number | null;
	/** Raw packing value from column V (preserved verbatim, incl. statuses). */
	packing_raw: string;
	/** True when packing is a standard-box family value (SB / xSB / X). */
	is_standard_box: boolean;
	/** Raw category string from column W. */
	category_raw: string;
}

/** A source row that was NOT turned into an item, with a human-readable reason. */
export interface RejectedRow {
	/** 1-based source row number in the worksheet. */
	rowNumber: number;
	/** The item number found on the row, or null when the row had none. */
	itemNum: string | null;
	/** Why the row was rejected (grouping key, kept human-readable). */
	reason: string;
}

/** Stable reason strings — grouped on these in the UI. */
export const REJECTION_REASON = {
	noItemNum: "blank/no item number",
	annotation: "annotation row (e.g. 'Garder ces dimensions…')",
} as const;

export interface ManifestParseResult {
	rows: ManifestRow[];
	/** Every row that was dropped, with its reason. Counts below are derived from this. */
	rejectedRows: RejectedRow[];
	/** Count of annotation rows dropped (derived from rejectedRows; kept for back-compat). */
	excludedAnnotationRows: number;
	/** Count of rows dropped for having no item number (derived; kept for back-compat). */
	skippedNoItemNum: number;
	/** 1-based source rows where more than one lane was filled (surfaced as a warning). */
	multiLaneRows: number[];
}

const COL = {
	total: 1, // A — authoritative per-row quantity (client fills the real total here)
	laneStart: 2, // B
	laneEnd: 5, // E
	itemNum: 6, // F
	description: 8, // H
	reference: 10, // J
	destination: 14, // N
	length: 19, // S
	width: 20, // T
	height: 21, // U
	packing: 22, // V
	category: 23, // W
	composite: 31, // AE
} as const;

export const MANIFEST_HEADER_ROW = 1;
export const MANIFEST_START_ROW = 2;

const SB_FAMILY = new Set(["sb", "xsb", "x"]);
const ANNOTATION_MARKER = "garder ces dimensions";

const cleanCode = (value: string): string =>
	(value || "").replace(/[\r\n\t]+/g, "").trim();

const toNumberOrNull = (value: string): number | null => {
	const parsed = Number.parseFloat((value || "").replace(/,/g, "").trim());
	return Number.isFinite(parsed) ? parsed : null;
};

const sumLanes = (
	worksheet: ManifestWorksheet,
	rowNumber: number,
): { total: number; filledLanes: number } => {
	let total = 0;
	let filledLanes = 0;
	for (let col = COL.laneStart; col <= COL.laneEnd; col += 1) {
		const value = toNumberOrNull(worksheet.getCellText(rowNumber, col));
		if (value && value !== 0) {
			total += value;
			filledLanes += 1;
		}
	}
	return { total, filledLanes };
};

/** Detect the manifest layout by its header row, to distinguish it from the catalog sheet. */
export const isManifestWorksheet = (worksheet: ManifestWorksheet): boolean => {
	const header = (col: number) =>
		cleanCode(worksheet.getCellText(MANIFEST_HEADER_ROW, col)).toLowerCase();
	return (
		header(COL.itemNum).includes("itemnum") &&
		header(COL.destination).includes("destination")
	);
};

export const parseManifestWorksheet = (
	worksheet: ManifestWorksheet,
): ManifestParseResult => {
	const rows: ManifestRow[] = [];
	const rejectedRows: RejectedRow[] = [];
	const multiLaneRows: number[] = [];

	// The sheet is padded with many empty rows past the data, so stop scanning after a
	// long run of item-less rows — ~100 consecutive item-less rows means "no more items".
	const MAX_EMPTY_RUN = 100;
	let consecutiveEmpty = 0;
	let pendingNoItem: RejectedRow[] = [];

	for (
		let rowNumber = MANIFEST_START_ROW;
		rowNumber <= worksheet.rowCount;
		rowNumber += 1
	) {
		const itemNum = cleanCode(worksheet.getCellText(rowNumber, COL.itemNum));
		if (!itemNum) {
			// Buffer item-less rows: they only count as real gaps if a later item
			// appears. A run of MAX_EMPTY_RUN ends the scan, and the trailing buffer
			// is discarded (padding past the end of the data, not real rejections).
			consecutiveEmpty += 1;
			pendingNoItem.push({
				rowNumber,
				itemNum: null,
				reason: REJECTION_REASON.noItemNum,
			});
			if (consecutiveEmpty >= MAX_EMPTY_RUN) break;
			continue;
		}

		// A real item row: any buffered item-less rows were genuine in-data gaps.
		consecutiveEmpty = 0;
		if (pendingNoItem.length > 0) {
			rejectedRows.push(...pendingNoItem);
			pendingNoItem = [];
		}

		// Drop annotation rows (e.g. "Garder ces dimensions ... puis efface").
		const composite = worksheet
			.getCellText(rowNumber, COL.composite)
			.toLowerCase();
		if (composite.includes(ANNOTATION_MARKER)) {
			rejectedRows.push({
				rowNumber,
				itemNum,
				reason: REJECTION_REASON.annotation,
			});
			continue;
		}

		const { total: laneTotal, filledLanes } = sumLanes(worksheet, rowNumber);
		if (filledLanes > 1) multiLaneRows.push(rowNumber);
		// Quantity comes from column A (Total) — the client's authoritative per-row amount.
		// Fall back to the lane sum only when A is blank (legacy lane-style files).
		const totalA = toNumberOrNull(worksheet.getCellText(rowNumber, COL.total));
		const expectedQty = totalA !== null && totalA !== 0 ? totalA : laneTotal;

		const packingRaw = cleanCode(worksheet.getCellText(rowNumber, COL.packing));

		rows.push({
			_row_id: `${worksheet.name}-${rowNumber}-${rows.length}`,
			_source_row_number: rowNumber,
			item_num: itemNum,
			description: (
				worksheet.getCellText(rowNumber, COL.description) || ""
			).trim(),
			reference: cleanCode(worksheet.getCellText(rowNumber, COL.reference)),
			destination: cleanCode(
				worksheet.getCellText(rowNumber, COL.destination),
			).toUpperCase(),
			expected_qty: expectedQty,
			length: toNumberOrNull(worksheet.getCellText(rowNumber, COL.length)),
			width: toNumberOrNull(worksheet.getCellText(rowNumber, COL.width)),
			height: toNumberOrNull(worksheet.getCellText(rowNumber, COL.height)),
			packing_raw: packingRaw,
			is_standard_box: SB_FAMILY.has(packingRaw.toLowerCase()),
			category_raw: (
				worksheet.getCellText(rowNumber, COL.category) || ""
			).trim(),
		});
	}

	const excludedAnnotationRows = rejectedRows.filter(
		(row) => row.reason === REJECTION_REASON.annotation,
	).length;
	const skippedNoItemNum = rejectedRows.filter(
		(row) => row.reason === REJECTION_REASON.noItemNum,
	).length;

	return {
		rows,
		rejectedRows,
		excludedAnnotationRows,
		skippedNoItemNum,
		multiLaneRows,
	};
};
