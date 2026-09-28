import {
	parseExcelFile,
	type ParseExcelFileOptions,
	type ParseResult,
} from "./parseExcelFile";

type ParseWorkerResponse =
	| { ok: true; result: ParseResult }
	| { ok: false; error: string };

/**
 * XLSB parsing is CPU-heavy and SheetJS reads synchronously. Run only XLSB files
 * in a dedicated worker so the browser UI remains responsive. Other formats keep
 * the existing parsing path to minimize behavioral change.
 */
export const parseExcelFileResponsive = (
	file: File,
	options: ParseExcelFileOptions,
): Promise<ParseResult> => {
	const isXlsb = file.name.toLowerCase().endsWith(".xlsb");
	if (!isXlsb || typeof Worker === "undefined") {
		return parseExcelFile(file, options);
	}

	return new Promise<ParseResult>((resolve, reject) => {
		const worker = new Worker(
			new URL("./excelParser.worker.ts", import.meta.url),
			{ type: "module", name: "ipac-excel-parser" },
		);

		const cleanup = () => {
			worker.onmessage = null;
			worker.onerror = null;
			worker.onmessageerror = null;
			worker.terminate();
		};

		worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
			cleanup();
			if (event.data.ok) {
				resolve(event.data.result);
				return;
			}
			reject(new Error(event.data.error));
		};

		worker.onerror = (event) => {
			const message = event.message || "Excel parser worker failed.";
			cleanup();
			reject(new Error(message));
		};

		worker.onmessageerror = () => {
			cleanup();
			reject(new Error("Excel parser worker returned an unreadable response."));
		};

		worker.postMessage({ file, options });
	});
};
