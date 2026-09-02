import { describe, expect, it } from "vitest";
import {
	applySelectAll,
	BOX_LINE1_FIELDS,
	type BoxLine1Field,
	getSelectAllState,
	nextSelectAllValue,
} from "./lineOptions";
import { DEFAULT_PKG_DETAILS_SETTINGS } from "./settings-defaults";

const base = DEFAULT_PKG_DETAILS_SETTINGS;
const withAll = (v: boolean) =>
	Object.fromEntries(BOX_LINE1_FIELDS.map((f) => [f, v])) as Record<
		BoxLine1Field,
		boolean
	>;

describe("getSelectAllState", () => {
	it("is 'all' when every field is on", () => {
		expect(getSelectAllState({ ...base, ...withAll(true) })).toBe("all");
	});
	it("is 'none' when every field is off", () => {
		expect(getSelectAllState({ ...base, ...withAll(false) })).toBe("none");
	});
	it("is 'some' when only part of the set is on (indeterminate)", () => {
		const partial = { ...base, ...withAll(false), show_box_number: true };
		expect(getSelectAllState(partial)).toBe("some");
	});
	it("ignores locked fields when deciding the state", () => {
		// every unlocked field is on; the locked one is off and must not matter
		const s = { ...base, ...withAll(true), show_status: false };
		expect(getSelectAllState(s, BOX_LINE1_FIELDS, { show_status: true })).toBe(
			"all",
		);
		expect(getSelectAllState(s)).toBe("some");
	});
	it("reports 'none' when nothing is selectable", () => {
		const locked = Object.fromEntries(BOX_LINE1_FIELDS.map((f) => [f, true]));
		expect(
			getSelectAllState(
				{ ...base, ...withAll(true) },
				BOX_LINE1_FIELDS,
				locked,
			),
		).toBe("none");
	});
});

describe("applySelectAll", () => {
	it("turns every field on", () => {
		const next = applySelectAll({ ...base, ...withAll(false) }, true);
		for (const f of BOX_LINE1_FIELDS) expect(next[f]).toBe(true);
		expect(getSelectAllState(next)).toBe("all");
	});

	it("turns every optional field off", () => {
		const next = applySelectAll({ ...base, ...withAll(true) }, false);
		for (const f of BOX_LINE1_FIELDS) expect(next[f]).toBe(false);
		expect(getSelectAllState(next)).toBe("none");
	});

	it("leaves locked fields untouched in both directions", () => {
		const locked = { show_line_number: true } as const;
		const on = applySelectAll(
			{ ...base, ...withAll(false), show_line_number: true },
			true,
			BOX_LINE1_FIELDS,
			locked,
		);
		expect(on.show_line_number).toBe(true);
		const off = applySelectAll(
			{ ...base, ...withAll(true), show_line_number: true },
			false,
			BOX_LINE1_FIELDS,
			locked,
		);
		expect(off.show_line_number).toBe(true); // locked, preserved
		expect(off.show_box_number).toBe(false); // unlocked, cleared
	});

	it("does not mutate the input and leaves unrelated settings alone", () => {
		const input = { ...base, ...withAll(false) };
		const snapshot = { ...input };
		const next = applySelectAll(input, true);
		expect(input).toEqual(snapshot);
		expect(next.box_display_mode).toBe(input.box_display_mode);
		expect(next.show_total_qty_items).toBe(input.show_total_qty_items);
	});

	it("covers every checkbox rendered in the Box Card line-1 panel", () => {
		// guards against the list drifting from the UI
		expect(BOX_LINE1_FIELDS).toContain("show_status");
		expect(BOX_LINE1_FIELDS).toContain("show_qr_code");
		expect(new Set(BOX_LINE1_FIELDS).size).toBe(BOX_LINE1_FIELDS.length);
		expect(BOX_LINE1_FIELDS).toHaveLength(19);
	});
});

describe("nextSelectAllValue", () => {
	it("selects everything from none and from indeterminate", () => {
		expect(nextSelectAllValue("none")).toBe(true);
		expect(nextSelectAllValue("some")).toBe(true);
	});
	it("clears everything when currently all", () => {
		expect(nextSelectAllValue("all")).toBe(false);
	});
});
