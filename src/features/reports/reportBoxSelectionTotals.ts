import type { ReportInstanceData } from "./types";

export type ReportSelectionOrderTotals = {
	totalNW: number;
	totalGW: number;
	totalVolume: number;
	boxCount: number;
};

const numericValue = (value: number | null | undefined) => {
	const numeric = Number(value ?? 0);
	return Number.isFinite(numeric) ? numeric : 0;
};

export function buildSelectionOrderTotals(
	instances: ReportInstanceData[],
	excludedBoxIds: ReadonlySet<string>,
): Map<string, ReportSelectionOrderTotals> {
	const totals = new Map<string, ReportSelectionOrderTotals>();

	for (const instance of instances) {
		if (!totals.has(instance.order_id)) {
			totals.set(instance.order_id, {
				totalNW: 0,
				totalGW: 0,
				totalVolume: 0,
				boxCount: 0,
			});
		}

		if (excludedBoxIds.has(instance.id)) continue;

		const current = totals.get(instance.order_id)!;
		current.totalNW += numericValue(instance.net_weight);
		current.totalGW += numericValue(instance.gross_weight);
		current.boxCount += 1;

		const lengthM = numericValue(instance.external_length) / 1000;
		const widthM = numericValue(instance.external_width) / 1000;
		const heightM = numericValue(instance.external_height) / 1000;
		if (lengthM > 0 && widthM > 0 && heightM > 0) {
			current.totalVolume += lengthM * widthM * heightM;
		}
	}

	for (const current of totals.values()) {
		current.totalNW = Math.round(current.totalNW * 10) / 10;
		current.totalGW = Math.round(current.totalGW * 10) / 10;
		current.totalVolume = Math.round(current.totalVolume * 1000) / 1000;
	}

	return totals;
}
