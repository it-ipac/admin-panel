import {
	parseExcelFileCore,
	type ParseExcelFileOptions,
	type ParseResult,
} from "./parseExcelFileCore";

interface WorkerRequest {
	file: File;
	options: ParseExcelFileOptions;
}

type WorkerResponse =
	| { ok: true; result: ParseResult }
	| { ok: false; error: string };

const workerScope = globalThis as unknown as {
	onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
	postMessage: (message: WorkerResponse) => void;
};

workerScope.onmessage = (event) => {
	void (async () => {
		try {
			const result = await parseExcelFileCore(
				event.data.file,
				event.data.options,
			);
			workerScope.postMessage({ ok: true, result });
		} catch (error) {
			workerScope.postMessage({
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "Unable to parse Excel file.",
			});
		}
	})();
};
