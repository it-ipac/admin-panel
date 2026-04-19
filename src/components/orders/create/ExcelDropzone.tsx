import { FileSpreadsheet, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface ExcelDropzoneProps {
	file: File | null;
	onFileSelected: (file: File) => void;
	onClear: () => void;
	onInvalidFile?: (file: File) => void;
	error?: string | null;
	helperText?: string;
}

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".xlsm", ".xlsb"];

function isExcelFile(file: File) {
	return ACCEPTED_EXTENSIONS.some((ext) =>
		file.name.toLowerCase().endsWith(ext),
	);
}

/**
 * ExcelDropzone
 *
 * WHY a dedicated component?
 * - Isolates drag/drop logic from business logic so the dialog stays readable.
 * - Easier to extend later (validation hints, preview, multiple files).
 */
export function ExcelDropzone({
	file,
	onFileSelected,
	onClear,
	onInvalidFile,
	error,
	helperText,
}: ExcelDropzoneProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	const handleFiles = (files: FileList | null) => {
		const candidate = files?.[0];
		if (!candidate) return;

		if (!isExcelFile(candidate)) {
			onInvalidFile?.(candidate);
			onClear();
			return;
		}

		onFileSelected(candidate);
	};

	return (
		<div>
			<input
				ref={inputRef}
				type="file"
				accept={ACCEPTED_EXTENSIONS.join(",")}
				className="hidden"
				onChange={(event) => handleFiles(event.target.files)}
			/>
			<div
				role="button"
				tabIndex={0}
				aria-label="Upload Excel file"
				onClick={() => inputRef.current?.click()}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						inputRef.current?.click();
					}
				}}
				onDragOver={(event) => {
					event.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={(event) => {
					event.preventDefault();
					setIsDragging(false);
					handleFiles(event.dataTransfer.files);
				}}
				className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
					isDragging
						? "border-blue-500 bg-blue-50"
						: "border-gray-200 bg-gray-50"
				}`}
			>
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
							<FileSpreadsheet className="w-5 h-5 text-blue-600" />
						</div>
						<div>
							<p className="text-sm font-medium text-gray-900">
								{file ? file.name : "Drop Excel file here"}
							</p>
							<p className="text-xs text-gray-500">
								{helperText || "Excel .xlsx, .xlsm, .xls, or .xlsb"}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{file ? (
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									onClear();
								}}
								className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-white"
							>
								<X className="w-3 h-3" />
								Clear
							</button>
						) : (
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									inputRef.current?.click();
								}}
								className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100"
							>
								<Upload className="w-3 h-3" />
								Browse
							</button>
						)}
					</div>
				</div>
			</div>
			{error && <p className="mt-2 text-xs text-red-600">{error}</p>}
		</div>
	);
}
