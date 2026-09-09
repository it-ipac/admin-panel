import { describe, expect, it } from "vitest";
import type { ReportInstanceData } from "./types";
import { buildSelectionOrderTotals } from "./reportBoxSelectionTotals";

const instance = (
	id: string,
	orderId: string,
	overrides: Partial<ReportInstanceData> = {},
) =>
	({
		id,
		order_id: orderId,
		net_weight: 10,
		gross_weight: 12,
		external_length: 1000,
		external_width: 500,
		external_height: 400,
		...overrides,
	}) as ReportInstanceData;

describe("buildSelectionOrderTotals", () => {
	it("sums only selected boxes and keeps totals grouped by order", () => {
		const totals = buildSelectionOrderTotals(
			[
				instance("box-1", "order-a"),
				instance("box-2", "order-a", { net_weight: 20, gross_weight: 24 }),
				instance("box-3", "order-b", {
					net_weight: 5,
					gross_weight: 6,
					external_length: 500,
					external_width: 500,
					external_height: 500,
				}),
			],
			new Set(["box-2"]),
		);

		expect(totals.get("order-a")).toEqual({
			totalNW: 10,
			totalGW: 12,
			totalVolume: 0.2,
			boxCount: 1,
		});
		expect(totals.get("order-b")).toEqual({
			totalNW: 5,
			totalGW: 6,
			totalVolume: 0.125,
			boxCount: 1,
		});
	});

	it("keeps a zero-total entry when every box in an order is excluded", () => {
		const totals = buildSelectionOrderTotals(
			[instance("box-1", "order-a")],
			new Set(["box-1"]),
		);

		expect(totals.get("order-a")).toEqual({
			totalNW: 0,
			totalGW: 0,
			totalVolume: 0,
			boxCount: 0,
		});
	});

	it("treats missing measurements as zero without producing NaN", () => {
		const totals = buildSelectionOrderTotals(
			[
				instance("box-1", "order-a", {
					net_weight: null,
					gross_weight: null,
					external_length: null,
				}),
			],
			new Set(),
		);

		expect(totals.get("order-a")).toEqual({
			totalNW: 0,
			totalGW: 0,
			totalVolume: 0,
			boxCount: 1,
		});
	});
});
