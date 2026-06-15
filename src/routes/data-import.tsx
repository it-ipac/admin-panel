import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ExcelJS from "exceljs";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { useToastContext } from "../components/ui/ToastProvider";
import { useRequirePageAccess } from "../hooks/usePageAccess";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/data-import")({
	component: DataImportPage,
});

function DataImportPage() {
	useRequirePageAccess();
	const [selectedClient, setSelectedClient] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [parsedData, setParsedData] = useState<any[]>([]);
	const [parsingError, setParsingError] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { toast } = useToastContext();
	const [isDragging, setIsDragging] = useState(false);

	// Fetch Clients
	const { data: clients } = useQuery({
		queryKey: ["clients"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("clients")
				.select("id, name")
				.order("name");
			if (error) throw error;
			return data;
		},
	});

	// Fetch Categories
	const { data: categories } = useQuery({
		queryKey: ["categories", selectedClient],
		queryFn: async () => {
			if (!selectedClient) return [];
			const { data, error } = await supabase
				.from("pkg_category")
				.select("id, label")
				.eq("client_id", selectedClient)
				.order("label");
			if (error) throw error;
			return data;
		},
		enabled: !!selectedClient,
	});

	// Parse Excel file and automatically extract the 4 target sheets
	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (!selectedFile) return;
		processFile(selectedFile);
	};

	const processFile = async (selectedFile: File) => {
		setFile(selectedFile);
		setParsedData([]);
		setParsingError("");

		try {
			const reader = new FileReader();
			reader.onload = async (event) => {
				try {
					const buffer = event.target?.result as ArrayBuffer;
					const wb = new ExcelJS.Workbook();
					await wb.xlsx.load(buffer);

					const targetSheets = [
						"Power-AC",
						"Power-Non-AC",
						"Water-Non AC",
						"Water-AC",
					];
					const structuredData: any[] = [];
					let foundAny = false;

					for (const sheetName of targetSheets) {
						const worksheet = wb.getWorksheet(sheetName);
						if (!worksheet) continue;
						foundAny = true;

						// Find the matching category ID from the DB
						const isWaterAC = sheetName === "Water-AC";
						const isPower = sheetName.startsWith("Power");

						// We use a loose match to find the category ID the user created
						let categoryObj = null;
						if (sheetName === "Power-AC") {
							categoryObj = categories?.find(
								(c) =>
									c.label?.toLowerCase().includes("power") &&
									c.label?.toLowerCase().includes("ac") &&
									!c.label?.toLowerCase().includes("non"),
							);
						} else if (sheetName === "Power-Non-AC") {
							categoryObj = categories?.find(
								(c) =>
									c.label?.toLowerCase().includes("power") &&
									(c.label?.toLowerCase().includes("non") ||
										c.label?.toLowerCase().includes("without")),
							);
						} else if (sheetName === "Water-AC") {
							categoryObj = categories?.find(
								(c) =>
									c.label?.toLowerCase().includes("water") &&
									c.label?.toLowerCase().includes("ac") &&
									!c.label?.toLowerCase().includes("non"),
							);
						} else if (sheetName === "Water-Non AC") {
							categoryObj = categories?.find(
								(c) =>
									c.label?.toLowerCase().includes("water") &&
									(c.label?.toLowerCase().includes("non") ||
										c.label?.toLowerCase().includes("without") ||
										c.label === "Water"),
							);
						}

						if (!categoryObj) {
							console.warn(
								`Could not find a matching category in DB for sheet ${sheetName}. Skipping sheet.`,
							);
							continue;
						}

						let startRow = 4;
						if (isWaterAC) startRow = 18;
						if (isPower) startRow = 3;

						worksheet.eachRow((row, rowNumber) => {
							if (rowNumber < startRow) return;

							const colB = row.getCell(2).text?.trim();

							if (!colB) {
								return;
							}

							// Valid row found

							let expectedQty = 0;
							let location = "";
							let length = null;
							let width = null;
							let height = null;
							let comments = "";

							if (isPower) {
								expectedQty = parseInt(row.getCell(6).text?.trim(), 10) || 0; // Col F
								location = row.getCell(7).text?.trim() || ""; // Col G
								length = parseFloat(row.getCell(8).text?.trim()) || null; // Col H
								width = parseFloat(row.getCell(9).text?.trim()) || null; // Col I
								height = parseFloat(row.getCell(10).text?.trim()) || null; // Col J
								comments = row.getCell(11).text?.trim() || ""; // Col K
							} else if (isWaterAC) {
								expectedQty = parseInt(row.getCell(6).text?.trim(), 10) || 0; // Col F
								location = row.getCell(7).text?.trim() || ""; // Col G
							} else {
								expectedQty = parseInt(row.getCell(5).text?.trim(), 10) || 0; // Col E
								location = row.getCell(6).text?.trim() || ""; // Col F
							}

							structuredData.push({
								client_id: selectedClient,
								category_id: categoryObj.id,
								item_num: colB,
								reference: row.getCell(3).text?.trim() || "", // Col C
								description: row.getCell(4).text?.trim() || "", // Col D
								expected_qty: expectedQty,
								packed_qty: 0,
								warehouse_location: location,
								length: length,
								width: width,
								height: height,
								ipac_comments: comments,
								// For debugging/preview purposes, adding the source sheet
								_source_sheet: sheetName,
							});
						});
					}

					if (!foundAny) {
						setParsingError(
							"Could not find any of the target sheets: Power-AC, Power-Non-AC, Water-Non AC, Water-AC.",
						);
					} else if (structuredData.length === 0) {
						setParsingError(
							"Sheets were found but no valid items could be extracted.",
						);
					} else {
						setParsedData(structuredData);
					}
				} catch (innerErr: any) {
					setParsingError(`Error parsing workbook: ${innerErr.message}`);
				}
			};
			reader.readAsArrayBuffer(selectedFile);
		} catch (err: any) {
			setParsingError(`Failed to read Excel file: ${err.message}`);
		}
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault(); // Prevents browser from opening/downloading the file!
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		if (!selectedClient) {
			toast({
				title: "Client Required",
				description: "Please select a Target Client before uploading a file.",
				variant: "warning",
			});
			return;
		}

		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			processFile(e.dataTransfer.files[0]);
		}
	};

	const uploadMutation = useMutation({
		mutationFn: async () => {
			if (!parsedData.length) throw new Error("No data to upload");

			const CHUNK_SIZE = 500;
			for (let i = 0; i < parsedData.length; i += CHUNK_SIZE) {
				const chunk = parsedData.slice(i, i + CHUNK_SIZE);
				// Strip _source_sheet and packed_qty — never overwrite
				// real packing progress with 0 from a fresh Excel import.
				const cleanChunk = chunk.map((item) => {
					const { _source_sheet, packed_qty: _packed_qty, ...pushData } = item;
					return pushData;
				});
				const { error } = await supabase.from("items_db").upsert(cleanChunk, {
					onConflict: "client_id,item_num",
					ignoreDuplicates: false,
				});
				if (error) throw error;
			}
		},
		onSuccess: () => {
			setFile(null);
			setParsedData([]);
			setParsingError("");
			if (fileInputRef.current) fileInputRef.current.value = "";
			alert(`Successfully upserted ${parsedData.length} items into items_db!`);
		},
		onError: (err: any) => {
			setParsingError(err.message || "Failed to upload to database");
		},
	});

	return (
		<div className="flex h-screen bg-neutral-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto p-8">
				<div className="max-w-4xl mx-auto">
					<div className="mb-8">
						<h1 className="text-2xl font-bold text-neutral-900">
							Legacy Data Import
						</h1>
						<p className="text-neutral-500 mt-1">
							Import legacy Excel maintenance sheets into the exact categories.
						</p>
					</div>

					<div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
						<div className="grid grid-cols-1 gap-6 mb-8">
							<div>
								<label
									htmlFor="import-client"
									className="block text-sm font-semibold text-neutral-700 mb-2"
								>
									1. Select Target Client
								</label>
								<select
									id="import-client"
									value={selectedClient}
									onChange={(e) => {
										setSelectedClient(e.target.value);
										setFile(null);
										setParsedData([]);
									}}
									className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500"
								>
									<option value="">-- Choose Client --</option>
									{clients?.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="border-t border-neutral-100 pt-8">
							<label
								htmlFor="import-file"
								className="block text-sm font-semibold text-neutral-700 mb-2"
							>
								2. Upload Excel File (.xlsx)
							</label>
							<div
								id="import-file"
								role="button"
								tabIndex={0}
								className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging ? "border-primary-500 bg-primary-100 scale-[1.02]" : file ? "border-primary-400 bg-primary-50" : "border-neutral-300 hover:border-primary-500 cursor-pointer bg-neutral-50"}`}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										if (!selectedClient) {
											toast({
												title: "Client Required",
												description:
													"Please select a Target Client before uploading a file.",
												variant: "warning",
											});
											return;
										}
										if (fileInputRef.current) fileInputRef.current.click();
									}
								}}
								onClick={() => {
									if (!selectedClient) {
										toast({
											title: "Client Required",
											description:
												"Please select a Target Client before uploading a file.",
											variant: "warning",
										});
										return;
									}
									if (fileInputRef.current) fileInputRef.current.click();
								}}
							>
								<FileUp
									className={`w-8 h-8 mx-auto mb-3 transition-colors ${isDragging ? "text-primary-600" : "text-neutral-400"}`}
								/>
								{file ? (
									<div className="font-medium text-primary-700">
										{file.name}
									</div>
								) : (
									<div>
										<span className="font-medium text-primary-600">
											Click to upload
										</span>{" "}
										or drag and drop
										<p className="text-xs text-neutral-500 mt-1">
											Upload the native .xlsx, .xlsm, or .xls TAQA manifest
										</p>
									</div>
								)}
								<input
									type="file"
									ref={fileInputRef}
									onChange={handleFileChange}
									className="hidden"
									accept=".xlsx, .xls, .xlsm, .xlsb, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
								/>
							</div>
						</div>

						{parsingError && (
							<div className="mt-6 flex items-start gap-3 bg-danger-50 text-danger-700 p-4 rounded-xl border border-danger-200">
								<AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
								<p className="text-sm font-medium">{parsingError}</p>
							</div>
						)}

						{parsedData.length > 0 && !parsingError && (
							<div className="mt-8 border-t border-neutral-100 pt-8">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-2 text-success-700 font-bold bg-success-50 px-4 py-2 rounded-lg border border-success-200">
										<CheckCircle2 className="w-5 h-5" />
										Validated {parsedData.length} items to import
									</div>
									<button
										onClick={() => uploadMutation.mutate()}
										disabled={uploadMutation.isPending}
										className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
									>
										{uploadMutation.isPending ? (
											<Loader2 className="w-5 h-5 animate-spin" />
										) : (
											"Confirm Import"
										)}
									</button>
								</div>

								{/* Preview */}
								<div className="bg-neutral-50 rounded-xl overflow-y-auto max-h-64 border border-neutral-200 text-sm">
									<table className="w-full text-left">
										<thead className="bg-neutral-100 sticky top-0 z-10">
											<tr>
												<th className="p-3 font-semibold text-neutral-700">
													Source Sheet
												</th>
												<th className="p-3 font-semibold text-neutral-700">
													Item Num
												</th>
												<th className="p-3 font-semibold text-neutral-700">
													Reference
												</th>
												<th className="p-3 font-semibold text-neutral-700">
													Expected
												</th>
												<th className="p-3 font-semibold text-neutral-700">
													Location
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-neutral-200">
											{parsedData.slice(0, 100).map((row, idx) => (
												<tr
													key={`${row.item_num}-${idx}`}
													className="hover:bg-neutral-100"
												>
													<td className="p-3 text-neutral-500">
														<span className="bg-neutral-200 px-2 py-1 rounded text-xs">
															{row._source_sheet}
														</span>
													</td>
													<td className="p-3 font-medium text-neutral-900">
														{row.item_num}
													</td>
													<td className="p-3 text-neutral-600">
														{row.reference}
													</td>
													<td className="p-3 text-neutral-600">
														{row.expected_qty}
													</td>
													<td className="p-3 text-neutral-600">
														{row.warehouse_location}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								<p className="text-xs text-neutral-500 mt-2 text-right">
									Showing top 100 preview rows only.
								</p>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
