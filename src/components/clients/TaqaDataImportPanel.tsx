import { useMutation, useQuery } from "@tanstack/react-query";
import ExcelJS from "exceljs";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase";
import { useToastContext } from "../ui/ToastProvider";

type SheetKey = "power-ac" | "power-non-ac" | "water-non-ac" | "water-ac";

type ParsedImportRow = {
	_row_id: string;
	client_id: string;
	category_id: string;
	item_num: string;
	reference: string;
	description: string;
	expected_qty: number;
	packed_qty: number;
	warehouse_location: string;
	length: number | null;
	width: number | null;
	height: number | null;
	ipac_comments: string;
	_source_sheet: string;
	_source_row_number: number;
};

type CategoryRow = {
	id: string;
	label: string | null;
	tags: string[];
};

type MatchedSheet = {
	expected: string;
	actual: string | null;
};

type ParsedWorksheet = {
	name: string;
	rowCount: number;
	getCellText: (rowNumber: number, columnNumber: number) => string;
};

const TAQA_ALL_TOTAL_SHEET_NAME = "TAQA ALL TOTAL Full";
const TAQA_ALL_TOTAL_START_ROW = 3;

const CATEGORY_LABEL_BY_KEY: Record<SheetKey, string> = {
	"power-ac": "Power-AC",
	"power-non-ac": "Power-Non AC",
	"water-ac": "Water-AC",
	"water-non-ac": "Water-Non AC",
};

const normalizeCompact = (value: string | null | undefined) =>
	(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeWords = (value: string | null | undefined) =>
	(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

const hasTaqaMarker = (value: string | null | undefined) => {
	const source = normalizeWords(value);
	if (!source) return false;
	return /\b(?:taqa|taka)\b/i.test(source);
};

const parseFloatOrNull = (value: string) => {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const parseExpectedQty = (value: string) => {
	const normalized = (value || "").replace(/,/g, "").trim();
	if (!normalized) return 0;
	const parsed = Number.parseFloat(normalized);
	if (!Number.isFinite(parsed)) return 0;
	return Math.trunc(parsed);
};

const classifyUnifiedCategory = (value: string): SheetKey | null => {
	const normalized = normalizeCompact(value);
	if (!normalized) return null;

	const hasPower = normalized.includes("power");
	const hasWater = normalized.includes("water");
	const hasNon =
		normalized.includes("non") ||
		normalized.includes("without") ||
		normalized.includes("noac");
	const hasAc = normalized.includes("ac");

	if (hasPower && hasNon) return "power-non-ac";
	if (hasPower && hasAc) return "power-ac";

	if (hasWater && hasNon) return "water-non-ac";
	if (hasWater && hasAc) return "water-ac";

	return null;
};

const findTaqaAllTotalSheet = (worksheets: ParsedWorksheet[]) => {
	const targetNormalized = normalizeCompact(TAQA_ALL_TOTAL_SHEET_NAME);

	const exact = worksheets.find(
		(worksheet) => normalizeCompact(worksheet.name) === targetNormalized,
	);
	if (exact) return exact;

	return (
		worksheets.find((worksheet) => {
			const normalized = normalizeCompact(worksheet.name);
			return (
				normalized.includes("taqa") &&
				normalized.includes("all") &&
				normalized.includes("total") &&
				normalized.includes("full")
			);
		}) || null
	);
};

const workbookContainsTaqa = (
	worksheets: ParsedWorksheet[],
	fileName: string,
) => {
	if (hasTaqaMarker(fileName)) return true;

	for (const sheet of worksheets) {
		if (hasTaqaMarker(sheet.name)) return true;

		const maxRowsToScan = Math.min(sheet.rowCount || 20, 20);
		for (let row = 1; row <= maxRowsToScan; row += 1) {
			for (let col = 1; col <= 10; col += 1) {
				const text = sheet.getCellText(row, col);
				if (hasTaqaMarker(text)) return true;
			}
		}
	}

	return false;
};

const getFileExtension = (fileName: string) => {
	const lastDot = fileName.lastIndexOf(".");
	if (lastDot < 0) return "";
	return fileName.slice(lastDot + 1).toLowerCase();
};

const buildExcelJsWorksheets = (
	workbook: ExcelJS.Workbook,
): ParsedWorksheet[] => {
	return workbook.worksheets.map((worksheet) => ({
		name: worksheet.name,
		rowCount: worksheet.rowCount || 0,
		getCellText: (rowNumber: number, columnNumber: number) =>
			worksheet.getCell(rowNumber, columnNumber).text?.trim() || "",
	}));
};

const buildXlsxWorksheets = (workbook: XLSX.WorkBook): ParsedWorksheet[] => {
	return workbook.SheetNames.map((sheetName) => {
		const worksheet = workbook.Sheets[sheetName] as XLSX.WorkSheet;
		const ref = worksheet["!ref"];
		const decodedRange = ref ? XLSX.utils.decode_range(ref) : null;
		const rowCount = decodedRange ? decodedRange.e.r + 1 : 0;

		return {
			name: sheetName,
			rowCount,
			getCellText: (rowNumber: number, columnNumber: number) => {
				const address = XLSX.utils.encode_cell({
					r: rowNumber - 1,
					c: columnNumber - 1,
				});
				const cell = worksheet[address] as XLSX.CellObject | undefined;
				if (!cell) return "";
				const value = cell.w ?? cell.v ?? "";
				return String(value).trim();
			},
		};
	});
};

const loadParsedWorksheets = async (
	selectedFile: File,
): Promise<ParsedWorksheet[]> => {
	const buffer = await selectedFile.arrayBuffer();
	const extension = getFileExtension(selectedFile.name);

	// XLS/XLSB are best handled by SheetJS.
	if (extension === "xls" || extension === "xlsb") {
		const workbook = XLSX.read(buffer, {
			type: "array",
			cellText: true,
			cellFormula: false,
			cellDates: false,
		});
		return buildXlsxWorksheets(workbook);
	}

	// Primary parser for xlsx/xlsm.
	try {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer);
		const worksheets = buildExcelJsWorksheets(workbook);
		if (worksheets.length > 0) {
			return worksheets;
		}
	} catch {
		// If ExcelJS fails, we'll fall back to SheetJS below.
	}

	const fallbackWorkbook = XLSX.read(buffer, {
		type: "array",
		cellText: true,
		cellFormula: false,
		cellDates: false,
	});
	return buildXlsxWorksheets(fallbackWorkbook);
};

const containsWord = (label: string, word: string) =>
	new RegExp(`\\b${word}\\b`, "i").test(label);

const hasNonAcMarker = (source: string) =>
	containsWord(source, "non") ||
	source.includes("without ac") ||
	source.includes("no ac");

const hasAcOnlyMarker = (source: string) =>
	containsWord(source, "ac") && !hasNonAcMarker(source);

const buildCategorySearchText = (category: CategoryRow) =>
	normalizeWords([category.label || "", ...category.tags].join(" "));

const resolveCategoryId = (categories: CategoryRow[], sheetKey: SheetKey) => {
	const find = (matcher: (searchText: string) => boolean) => {
		const hit = categories.find((category) => {
			const searchText = buildCategorySearchText(category);
			return matcher(searchText);
		});
		return hit?.id || null;
	};

	if (sheetKey === "power-ac") {
		return find(
			(searchText) =>
				containsWord(searchText, "power") && hasAcOnlyMarker(searchText),
		);
	}

	if (sheetKey === "power-non-ac") {
		return find(
			(searchText) =>
				containsWord(searchText, "power") &&
				(hasNonAcMarker(searchText) || !containsWord(searchText, "ac")),
		);
	}

	if (sheetKey === "water-ac") {
		return find(
			(searchText) =>
				containsWord(searchText, "water") && hasAcOnlyMarker(searchText),
		);
	}

	return find(
		(searchText) =>
			containsWord(searchText, "water") &&
			(hasNonAcMarker(searchText) || !containsWord(searchText, "ac")),
	);
};

interface TaqaDataImportPanelProps {
	clientId: string;
	clientName: string;
}

export function TaqaDataImportPanel({
	clientId,
	clientName,
}: TaqaDataImportPanelProps) {
	const { toast } = useToastContext();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [file, setFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [parsingError, setParsingError] = useState("");
	const [parseWarnings, setParseWarnings] = useState<string[]>([]);
	const [detectedSheetNames, setDetectedSheetNames] = useState<string[]>([]);
	const [matchedSheets, setMatchedSheets] = useState<MatchedSheet[]>([]);
	const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
	const [activeSheetName, setActiveSheetName] = useState<string | null>(null);

	const groupedParsedRows = useMemo(() => {
		const grouped = new Map<string, ParsedImportRow[]>();
		for (const row of parsedRows) {
			const existing = grouped.get(row._source_sheet);
			if (existing) {
				existing.push(row);
			} else {
				grouped.set(row._source_sheet, [row]);
			}
		}

		return Array.from(grouped.entries()).map(([sheetName, rows]) => ({
			sheetName,
			rows,
		}));
	}, [parsedRows]);

	const activeGroup = useMemo(() => {
		if (!groupedParsedRows.length) return null;
		if (!activeSheetName) return groupedParsedRows[0];
		return (
			groupedParsedRows.find((group) => group.sheetName === activeSheetName) ||
			groupedParsedRows[0]
		);
	}, [groupedParsedRows, activeSheetName]);

	const invalidExpectedQtyRows = useMemo(
		() =>
			parsedRows.filter(
				(row) => !(Number.isFinite(row.expected_qty) && row.expected_qty >= 0),
			),
		[parsedRows],
	);

	useEffect(() => {
		if (!groupedParsedRows.length) {
			if (activeSheetName !== null) {
				setActiveSheetName(null);
			}
			return;
		}

		if (
			!activeSheetName ||
			!groupedParsedRows.some((group) => group.sheetName === activeSheetName)
		) {
			setActiveSheetName(groupedParsedRows[0].sheetName);
		}
	}, [groupedParsedRows, activeSheetName]);

	const { data: categories } = useQuery({
		queryKey: ["maintenance-import-categories", clientId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("pkg_category")
				.select(`id, label, category_tag_map ( project_tags ( name ) )`)
				.eq("client_id", clientId)
				.order("label");
			if (error) throw error;

			const rows = ((data || []) as any[]).map((row) => {
				const tags = ((row.category_tag_map || []) as any[])
					.flatMap((mapRow) => {
						const related = mapRow?.project_tags;
						if (Array.isArray(related)) {
							return related
								.map((tag) => String(tag?.name || "").trim())
								.filter(Boolean);
						}
						const single = String(related?.name || "").trim();
						return single ? [single] : [];
					})
					.filter(Boolean);

				return {
					id: String(row.id),
					label: (row.label as string | null) || null,
					tags: Array.from(new Set(tags)),
				} as CategoryRow;
			});

			return rows;
		},
		enabled: !!clientId,
	});

	const processFile = async (selectedFile: File) => {
		setFile(selectedFile);
		setParsedRows([]);
		setActiveSheetName(null);
		setParsingError("");
		setParseWarnings([]);
		setDetectedSheetNames([]);
		setMatchedSheets([]);

		try {
			const worksheets = await loadParsedWorksheets(selectedFile);
			const workbookSheets = worksheets.map((sheet) => sheet.name);
			setDetectedSheetNames(workbookSheets);
			console.info("[TAQA Import] Worksheets found:", workbookSheets);

			if (!workbookSheets.length) {
				setParsingError(
					"No worksheets could be read from this workbook. If this is an XLSB file, try re-saving it as XLSX and upload again.",
				);
				return;
			}

			if (!workbookContainsTaqa(worksheets, selectedFile.name)) {
				setParsingError(
					'This importer only runs when the workbook contains a "TAQA" or "TAKA" marker (filename, sheet name, or sheet content).',
				);
				return;
			}

			if (!categories || categories.length === 0) {
				setParsingError(
					"No maintenance categories were found for this client. Configure categories first.",
				);
				return;
			}

			const worksheet = findTaqaAllTotalSheet(worksheets);
			if (!worksheet) {
				setParsingError(
					`Could not find worksheet "${TAQA_ALL_TOTAL_SHEET_NAME}". Please upload the updated TAQA workbook format.`,
				);
				return;
			}

			const nextWarnings: string[] = [];
			const rows: ParsedImportRow[] = [];
			const categoryKeys: SheetKey[] = [
				"power-ac",
				"power-non-ac",
				"water-ac",
				"water-non-ac",
			];

			const categoryIdByKey = new Map<SheetKey, string>();
			for (const key of categoryKeys) {
				const categoryId = resolveCategoryId(categories, key);
				if (categoryId) {
					categoryIdByKey.set(key, categoryId);
				}
			}

			const unknownCategoryExamples: string[] = [];
			let unknownCategoryRowCount = 0;
			const missingCategoryRowsByKey = new Map<SheetKey, number>();

			for (
				let rowNumber = TAQA_ALL_TOTAL_START_ROW;
				rowNumber <= worksheet.rowCount;
				rowNumber += 1
			) {
				// New unified TAQA format:
				// A=item number, B=reference/bin, C=description, E=expected, F=warehouse,
				// G/H/I=dimensions, J=comments, L=category label.
				const itemNum = worksheet.getCellText(rowNumber, 1);
				if (!itemNum) continue;

				const categoryText = worksheet.getCellText(rowNumber, 12);
				const categoryKey = classifyUnifiedCategory(categoryText);
				if (!categoryKey) {
					unknownCategoryRowCount += 1;
					if (unknownCategoryExamples.length < 5) {
						unknownCategoryExamples.push(
							`row ${rowNumber}: ${categoryText || "(empty)"}`,
						);
					}
					continue;
				}

				const categoryId = categoryIdByKey.get(categoryKey);
				if (!categoryId) {
					const currentCount = missingCategoryRowsByKey.get(categoryKey) || 0;
					missingCategoryRowsByKey.set(categoryKey, currentCount + 1);
					continue;
				}

				rows.push({
					_row_id: `${worksheet.name}-${rowNumber}-${rows.length}`,
					client_id: clientId,
					category_id: categoryId,
					item_num: itemNum,
					reference: worksheet.getCellText(rowNumber, 2),
					description: worksheet.getCellText(rowNumber, 3),
					expected_qty: parseExpectedQty(worksheet.getCellText(rowNumber, 5)),
					packed_qty: 0,
					warehouse_location: worksheet.getCellText(rowNumber, 6),
					length: parseFloatOrNull(worksheet.getCellText(rowNumber, 7)),
					width: parseFloatOrNull(worksheet.getCellText(rowNumber, 8)),
					height: parseFloatOrNull(worksheet.getCellText(rowNumber, 9)),
					ipac_comments: worksheet.getCellText(rowNumber, 10),
					_source_sheet: worksheet.name,
					_source_row_number: rowNumber,
				});
			}

			if (unknownCategoryRowCount > 0) {
				nextWarnings.push(
					`Skipped ${unknownCategoryRowCount} row(s) because column L category was not recognized. Examples: ${unknownCategoryExamples.join(", ")}.`,
				);
			}

			for (const [key, count] of missingCategoryRowsByKey) {
				nextWarnings.push(
					`Skipped ${count} row(s) for category ${CATEGORY_LABEL_BY_KEY[key]} because it is not mapped in pkg_category/category_tag_map for this client.`,
				);
			}

			setMatchedSheets([
				{
					expected: TAQA_ALL_TOTAL_SHEET_NAME,
					actual: worksheet.name,
				},
			]);
			setParseWarnings(nextWarnings);

			if (!rows.length) {
				setParsingError(
					"No valid rows were extracted. Check TAQA ALL TOTAL Full row layout (A/B/C/E/F/G/H/I/J/L) and category mappings.",
				);
				return;
			}

			setParsedRows(rows);
		} catch (error: any) {
			setParsingError(
				`Failed to parse workbook: ${error?.message || "Unknown error"}`,
			);
		}
	};

	const handleFileChange = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const selectedFile = event.target.files?.[0];
		if (!selectedFile) return;
		await processFile(selectedFile);
	};

	const uploadMutation = useMutation({
		mutationFn: async () => {
			if (!parsedRows.length) throw new Error("No parsed data available.");

			const invalidRows = parsedRows.filter(
				(row) => !(Number.isFinite(row.expected_qty) && row.expected_qty >= 0),
			);
			if (invalidRows.length > 0) {
				const sample = invalidRows
					.slice(0, 5)
					.map(
						(row) =>
							`${row._source_sheet} row ${row._source_row_number} (item ${row.item_num || "N/A"}, qty ${row.expected_qty})`,
					)
					.join("; ");
				throw new Error(
					`Cannot import ${invalidRows.length} row(s): expected_qty must be >= 0. Remove invalid rows first. Examples: ${sample}`,
				);
			}

			const CHUNK_SIZE = 500;
			let upsertedCount = 0;
			for (let i = 0; i < parsedRows.length; i += CHUNK_SIZE) {
				const chunk = parsedRows.slice(i, i + CHUNK_SIZE).map((row) => {
					// Strip internal tracking fields AND packed_qty — never overwrite
					// real packing progress with 0 from a fresh Excel import.
					const {
						_source_sheet,
						_row_id,
						_source_row_number,
						packed_qty: _packed_qty,
						...payload
					} = row;
					return payload;
				});

				const { error } = await supabase
					.from("items_db")
					.upsert(chunk, {
						onConflict: "client_id,item_num",
						ignoredDuplicates: false,
					});
				if (error) {
					throw new Error(
						`${error.message} (Upserted ${upsertedCount} rows before failure.)`,
					);
				}
				upsertedCount += chunk.length;
			}
		},
		onSuccess: () => {
			toast({
				title: "Import completed",
				description: `Upserted ${parsedRows.length} rows into items_db for ${clientName}.`,
				variant: "success",
			});
			setFile(null);
			setParsedRows([]);
			setParsingError("");
			setParseWarnings([]);
			setDetectedSheetNames([]);
			setMatchedSheets([]);
			if (fileInputRef.current) fileInputRef.current.value = "";
		},
		onError: (error: any) => {
			setParsingError(error?.message || "Failed to upload parsed rows.");
		},
	});

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragging(false);

		if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
			await processFile(event.dataTransfer.files[0]);
		}
	};

	const handleRemoveRow = (rowId: string) => {
		setParsedRows((prev) => prev.filter((row) => row._row_id !== rowId));
	};

	const handleRemoveSheetRows = (sheetName: string) => {
		setParsedRows((prev) =>
			prev.filter((row) => row._source_sheet !== sheetName),
		);
	};

	const handleRemoveInvalidQtyRows = () => {
		setParsedRows((prev) =>
			prev.filter(
				(row) => Number.isFinite(row.expected_qty) && row.expected_qty >= 0,
			),
		);
	};

	return (
		<div className="space-y-5">
			<div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
				<p className="text-sm font-semibold text-blue-900">
					Client: {clientName}
				</p>
				<p className="mt-1 text-xs text-blue-700">
					TAQA parser mode is enabled only when workbook contains TAQA/TAKA
					marker text.
				</p>
			</div>

			<div
				role="button"
				tabIndex={0}
				className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
					isDragging
						? "scale-[1.01] border-blue-500 bg-blue-100"
						: file
							? "border-blue-400 bg-blue-50"
							: "cursor-pointer border-gray-300 bg-gray-50 hover:border-blue-500"
				}`}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						fileInputRef.current?.click();
					}
				}}
				onClick={() => fileInputRef.current?.click()}
			>
				<FileUp
					className={`mx-auto mb-3 h-8 w-8 transition-colors ${
						isDragging ? "text-blue-600" : "text-gray-400"
					}`}
				/>
				{file ? (
					<div className="font-medium text-blue-700">{file.name}</div>
				) : (
					<div>
						<span className="font-medium text-blue-600">Click to upload</span>{" "}
						or drag and drop
						<p className="mt-1 text-xs text-gray-500">
							Upload .xlsx/.xlsm/.xls TAQA sheet for this client.
						</p>
					</div>
				)}
				<input
					type="file"
					ref={fileInputRef}
					onChange={handleFileChange}
					className="hidden"
					accept=".xlsx,.xls,.xlsm,.xlsb,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
				/>
			</div>

			{detectedSheetNames.length > 0 && (
				<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
						Detected worksheets
					</p>
					<div className="mt-2 flex flex-wrap gap-2">
						{detectedSheetNames.map((sheetName) => (
							<span
								key={sheetName}
								className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
							>
								{sheetName}
							</span>
						))}
					</div>
				</div>
			)}

			{matchedSheets.length > 0 && (
				<div className="rounded-xl border border-gray-200 bg-white p-4">
					<p className="text-sm font-semibold text-gray-800">Sheet mapping</p>
					<div className="mt-3 grid gap-2 md:grid-cols-2">
						{matchedSheets.map((sheet) => (
							<div
								key={sheet.expected}
								className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-sm"
							>
								<p className="text-gray-500">Expected: {sheet.expected}</p>
								<p className="font-medium text-gray-800">
									Actual: {sheet.actual || "Not found"}
								</p>
							</div>
						))}
					</div>
				</div>
			)}

			{parseWarnings.length > 0 && (
				<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
					<p className="text-sm font-semibold">Parse warnings</p>
					<ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
						{parseWarnings.map((warning) => (
							<li key={warning}>{warning}</li>
						))}
					</ul>
				</div>
			)}

			{parsingError && (
				<div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
					<AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
					<p className="text-sm font-medium">{parsingError}</p>
				</div>
			)}

			{parsedRows.length > 0 && !parsingError && (
				<div className="rounded-xl border border-gray-200 bg-white p-4">
					<div className="mb-3 flex items-center justify-between">
						<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 font-bold text-green-700">
							<CheckCircle2 className="h-5 w-5" />
							Validated {parsedRows.length} rows
						</div>
						<div className="flex items-center gap-2">
							{invalidExpectedQtyRows.length > 0 && (
								<button
									onClick={handleRemoveInvalidQtyRows}
									className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
								>
									Remove negative qty rows ({invalidExpectedQtyRows.length})
								</button>
							)}
							<button
								onClick={() => setParsedRows([])}
								className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
							>
								Remove all rows
							</button>
							<button
								onClick={() => uploadMutation.mutate()}
								disabled={
									uploadMutation.isPending || invalidExpectedQtyRows.length > 0
								}
								className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
							>
								{uploadMutation.isPending ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : (
									"Confirm Import"
								)}
							</button>
						</div>
					</div>

					{invalidExpectedQtyRows.length > 0 && (
						<div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
							{invalidExpectedQtyRows.length} row(s) have expected quantity less
							than 0. Database constraint requires expected_qty &gt;= 0, so
							remove negative rows before confirming import.
						</div>
					)}

					<div className="mb-3 overflow-x-auto">
						<div className="flex min-w-max gap-2 pb-1">
							{groupedParsedRows.map((group) => {
								const isActive = activeGroup?.sheetName === group.sheetName;
								return (
									<button
										key={group.sheetName}
										onClick={() => setActiveSheetName(group.sheetName)}
										className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
											isActive
												? "border-blue-300 bg-blue-50 text-blue-800"
												: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
										}`}
									>
										{group.sheetName}
										<span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
											{group.rows.length}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{activeGroup && (
						<div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 text-sm">
							<div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-3 py-2">
								<div className="font-semibold text-gray-800">
									{activeGroup.sheetName} ({activeGroup.rows.length} rows)
								</div>
								<button
									onClick={() => handleRemoveSheetRows(activeGroup.sheetName)}
									className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
								>
									Remove sheet rows
								</button>
							</div>
							<div className="max-h-[60vh] overflow-auto">
								<table className="w-full text-left">
									<thead className="sticky top-0 bg-gray-100">
										<tr>
											<th className="p-3 font-semibold text-gray-700">
												Item Num
											</th>
											<th className="p-3 font-semibold text-gray-700">
												Reference
											</th>
											<th className="p-3 font-semibold text-gray-700">
												Description
											</th>
											<th className="p-3 font-semibold text-gray-700">
												Expected
											</th>
											<th className="p-3 font-semibold text-gray-700">
												Location
											</th>
											<th className="p-3 font-semibold text-gray-700">
												Sheet Row
											</th>
											<th className="p-3 font-semibold text-gray-700">
												Action
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{activeGroup.rows.map((row) => (
											<tr
												key={row._row_id}
												className={
													row.expected_qty >= 0
														? "hover:bg-gray-100"
														: "bg-amber-50 hover:bg-amber-100"
												}
											>
												<td className="p-3 font-medium text-gray-900">
													{row.item_num}
												</td>
												<td className="p-3 text-gray-600">{row.reference}</td>
												<td className="p-3 text-gray-600">{row.description}</td>
												<td className="p-3 text-gray-600">
													<div className="flex items-center gap-2">
														<span>{row.expected_qty}</span>
														{row.expected_qty < 0 && (
															<span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
																Invalid
															</span>
														)}
													</div>
												</td>
												<td className="p-3 text-gray-600">
													{row.warehouse_location}
												</td>
												<td className="p-3 text-gray-500">
													{row._source_row_number}
												</td>
												<td className="p-3">
													<button
														onClick={() => handleRemoveRow(row._row_id)}
														className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
													>
														Remove
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
					<p className="mt-2 text-right text-xs text-gray-500">
						Select a sheet tab to view its rows. The table is scrollable and
						supports row/sheet removal.
					</p>
				</div>
			)}
		</div>
	);
}
