import { describe, expect, it } from "vitest";
import {
	buildActivitySeries,
	comparePeriods,
	countByStatus,
	type DashboardOrder,
	hasActivity,
} from "./deriveDashboardMetrics";

const order = (over: Partial<DashboardOrder> = {}): DashboardOrder => ({
	id: crypto.randomUUID(),
	order_name: "O",
	client_name: "C",
	production_status: "pending",
	created_at: "2026-09-01T10:00:00.000Z",
	completion_date: null,
	...over,
});

describe("countByStatus", () => {
	it("counts each production status and ignores unknown values", () => {
		const counts = countByStatus([
			order({ production_status: "pending" }),
			order({ production_status: "in_progress" }),
			order({ production_status: "in_progress" }),
			order({ production_status: "completed" }),
			order({ production_status: "on_hold" }),
			order({ production_status: "cancelled" }),
			order({ production_status: "something_else" }),
			order({ production_status: null }),
		]);
		expect(counts).toEqual({
			total: 8,
			pending: 1,
			inProgress: 2,
			completed: 1,
			onHold: 1,
			cancelled: 1,
		});
	});
});

describe("buildActivitySeries", () => {
	const now = new Date("2026-09-07T12:00:00.000Z");

	it("returns one bucket per day in the window, oldest first", () => {
		const series = buildActivitySeries([], 7, now);
		expect(series).toHaveLength(7);
		expect(series[0].date).toBe("2026-09-01");
		expect(series[6].date).toBe("2026-09-07");
	});

	it("buckets created and completed orders on their own dates", () => {
		const series = buildActivitySeries(
			[
				order({ created_at: "2026-09-05T08:00:00.000Z" }),
				order({ created_at: "2026-09-05T23:00:00.000Z" }),
				order({
					created_at: "2026-09-02T08:00:00.000Z",
					completion_date: "2026-09-06T09:00:00.000Z",
				}),
			],
			7,
			now,
		);
		const byDate = Object.fromEntries(series.map((p) => [p.date, p]));
		expect(byDate["2026-09-05"].created).toBe(2);
		expect(byDate["2026-09-02"].created).toBe(1);
		expect(byDate["2026-09-06"].completed).toBe(1);
	});

	it("ignores rows outside the window and unparseable dates", () => {
		const series = buildActivitySeries(
			[
				order({ created_at: "2020-01-01T00:00:00.000Z" }),
				order({ created_at: "not a date" }),
			],
			7,
			now,
		);
		expect(hasActivity(series)).toBe(false);
	});
});

describe("comparePeriods", () => {
	const now = new Date("2026-09-07T12:00:00.000Z");

	it("compares the trailing window with the one before it", () => {
		const change = comparePeriods(
			[
				order({ created_at: "2026-09-06T00:00:00.000Z" }),
				order({ created_at: "2026-09-05T00:00:00.000Z" }),
				order({ created_at: "2026-09-04T00:00:00.000Z" }),
				order({ created_at: "2026-08-30T00:00:00.000Z" }),
				order({ created_at: "2026-08-29T00:00:00.000Z" }),
			],
			7,
			now,
		);
		expect(change.current).toBe(3);
		expect(change.previous).toBe(2);
		expect(change.percent).toBe(50);
	});

	it("returns a null percent when the prior window is empty", () => {
		const change = comparePeriods(
			[order({ created_at: "2026-09-06T00:00:00.000Z" })],
			7,
			now,
		);
		expect(change.previous).toBe(0);
		expect(change.percent).toBeNull();
	});

	it("reports a negative change honestly", () => {
		const change = comparePeriods(
			[
				order({ created_at: "2026-09-06T00:00:00.000Z" }),
				order({ created_at: "2026-08-31T00:00:00.000Z" }),
				order({ created_at: "2026-08-31T00:00:00.000Z" }),
				order({ created_at: "2026-08-31T00:00:00.000Z" }),
				order({ created_at: "2026-08-31T00:00:00.000Z" }),
			],
			7,
			now,
		);
		expect(change.percent).toBe(-75);
	});
});
