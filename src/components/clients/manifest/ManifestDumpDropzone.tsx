// Compact dropzone for the TAQA items file: upload target + filename + a short
// status with a "Review items" button. The full review lives in ManifestReviewModal.
// Presentational only — file handling is passed in via props.

import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useRef } from "react";

interface ManifestDumpDropzoneProps {
	fileName: string | null;
	parsing: boolean;
	error: string | null;
	/** Number of distinct items parsed (0 when nothing parsed yet). */
	itemCount: number;
	hasResult: boolean;
	onFile: (file: File) => void;
	onReview: () => void;
}

export function ManifestDumpDropzone({
	fileName,
	parsing,
	error,
	itemCount,
	hasResult,
	onFile,
	onReview,
}: ManifestDumpDropzoneProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	return (
		<div className="space-y-3">
			<div
				role="button"
				tabIndex={0}
				onClick={() => fileInputRef.current?.click()}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
				}}
				onDragOver={(e) => e.preventDefault()}
				onDrop={(e) => {
					e.preventDefault();
					const file = e.dataTransfer.files?.[0];
					if (file) onFile(file);
				}}
				className="cursor-pointer rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-4 text-center transition-colors hover:border-primary-500"
			>
				<FileUp className="mx-auto mb-2 h-6 w-6 text-neutral-400" />
				{fileName ? (
					<div className="font-medium text-primary-700">{fileName}</div>
				) : (
					<div className="text-sm text-neutral-600">
						<span className="font-medium text-primary-600">
							Click to upload
						</span>{" "}
						or drop the TAQA items file (.xlsx / .csv)
					</div>
				)}
				<input
					ref={fileInputRef}
					type="file"
					className="hidden"
					accept=".xlsx,.xlsm,.xls,.xlsb,.csv"
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) onFile(file);
					}}
				/>
			</div>

			{parsing && (
				<div className="flex items-center gap-2 text-sm text-neutral-600">
					<Loader2 className="h-4 w-4 animate-spin" /> Parsing…
				</div>
			)}

			{error && (
				<div className="flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
					<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
				</div>
			)}

			{hasResult && !error && (
				<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success-200 bg-success-50 p-3 text-sm">
					<span className="flex items-center gap-2 font-medium text-success-700">
						<CheckCircle2 className="h-4 w-4" />
						{itemCount} items parsed
					</span>
					<button
						type="button"
						onClick={onReview}
						className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
					>
						Review items
					</button>
				</div>
			)}
		</div>
	);
}
