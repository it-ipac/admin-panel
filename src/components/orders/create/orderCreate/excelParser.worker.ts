import {
	parseExcelFile,
	type ParseExcelFileOptions,
	type ParseResult,
} from "./parseExcelFile";

interface ParseWorkerRequest {
	file: File;
	options: ParseExcelFileOptions;
}

type ParseWorkerResponse =
	| { ok: true; result: ParseResult }
	| { ok: false; error: string };

const workerScope = globalThis as unknown as {
	onmessage: ((event: MessageEvent<ParseWorkerRequest>) => void) | null;
	postMessage: (message: ParseWorkerResponse) => void;
};

workerScope.onmessage = async (event) => {
	try {
		const result = await parseExcelFile(event.data.file, event.data.options);
		workerScope.postMessage({ ok: true, result });
	} catch (error) {
		workerScope.postMessage({
			ok: false,
			error:
				error instanceof Error
					? error.message
					: "Unable to parse the Excel file.",
		});
	}
};

export {};
