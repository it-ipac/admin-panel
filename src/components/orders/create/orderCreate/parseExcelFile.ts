import {
	parseExcelFileCore,
	type ParseExcelFileOptions,
	type ParseResult,
} from "./parseExcelFileCore";

export type { ParseExcelFileOptions, ParseResult } from "./parseExcelFileCore";

type WorkerResponse =
	| { ok: true; result: ParseResult }
	| { ok: false; error: string };

const parseExcelFileInWorker = (
	file: File,
	options: ParseExcelFileOptions,
): Promise<ParseResult> =>
	new Promise((resolve, reject) => {
		const worker = new Worker(
			new URL("./excelParser.worker.ts", import.meta.url),
			{ type: "module" },
		);

		const cleanup = () => {
			worker.onmessage = null;
			worker.onerror = null;
			worker.terminate();
		};

		worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
			cleanup();
			if (event.data.ok) {
				resolve(event.data.result);
				return;
			}
			reject(new Error(event.data.error));
		};

		worker.onerror = (event) => {
			cleanup();
			reject(
				new Error(
					event.message || "Excel parsing worker failed unexpectedly.",
				),
			);
		};

		worker.postMessage({ file, options });
	});

export const parseExcelFile = async (
	file: File,
	options: ParseExcelFileOptions,
): Promise<ParseResult> => {
	// Keep the old direct parser as a compatibility fallback for SSR/tests or
	// older environments without Worker support. In normal browser usage the
	// expensive workbook parsing runs off the main UI thread.
	if (typeof Worker === "undefined") {
		return parseExcelFileCore(file, options);
	}

	try {
		return await parseExcelFileInWorker(file, options);
	} catch (error) {
		// Do not silently fall back to main-thread parsing here: a worker failure
		// should surface as an import error rather than freezing the UI again.
		throw error;
	}
};
