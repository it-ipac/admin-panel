import { describe, expect, it } from "vitest";
import { clampPageIndex, parsePageInput } from "./pageNavigation";

describe("clampPageIndex", () => {
	it("keeps an in-range index", () => {
		expect(clampPageIndex(5, 81)).toBe(5);
	});
	it("clamps below the first page and above the last", () => {
		expect(clampPageIndex(-3, 81)).toBe(0);
		expect(clampPageIndex(999, 81)).toBe(80);
	});
	it("returns 0 for an empty document or a non-finite index", () => {
		expect(clampPageIndex(4, 0)).toBe(0);
		expect(clampPageIndex(Number.NaN, 81)).toBe(0);
	});
	// totalPages shrinking under a page that is now out of range
	it("clamps when totalPages shrinks", () => {
		expect(clampPageIndex(80, 3)).toBe(2);
	});
});

describe("parsePageInput", () => {
	const total = 81;

	it("navigates to a valid page (1-based in, 0-based out)", () => {
		expect(parsePageInput("42", total)).toEqual({
			ok: true,
			index: 41,
			clamped: false,
		});
	});

	it("handles the first and last page", () => {
		expect(parsePageInput("1", total)).toEqual({
			ok: true,
			index: 0,
			clamped: false,
		});
		expect(parsePageInput("81", total)).toEqual({
			ok: true,
			index: 80,
			clamped: false,
		});
	});

	it("resolves below-range values to the first page", () => {
		expect(parsePageInput("0", total)).toEqual({
			ok: true,
			index: 0,
			clamped: true,
		});
		expect(parsePageInput("-7", total)).toEqual({
			ok: true,
			index: 0,
			clamped: true,
		});
	});

	it("resolves above-range values to the last page", () => {
		expect(parsePageInput("500", total)).toEqual({
			ok: true,
			index: 80,
			clamped: true,
		});
	});

	it("rejects empty and whitespace input", () => {
		expect(parsePageInput("", total)).toEqual({ ok: false, reason: "empty" });
		expect(parsePageInput("   ", total)).toEqual({
			ok: false,
			reason: "empty",
		});
	});

	it("rejects decimals, text and pasted junk rather than guessing", () => {
		for (const bad of ["2.5", "abc", "1e3", "12px", "٣", "1 2", "--4", "NaN"]) {
			expect(parsePageInput(bad, total)).toEqual({
				ok: false,
				reason: "not-a-number",
			});
		}
	});

	it("tolerates a leading plus", () => {
		expect(parsePageInput("+3", total)).toEqual({
			ok: true,
			index: 2,
			clamped: false,
		});
	});

	it("is safe when there are no pages at all", () => {
		expect(parsePageInput("5", 0)).toEqual({
			ok: true,
			index: 0,
			clamped: true,
		});
	});
});
