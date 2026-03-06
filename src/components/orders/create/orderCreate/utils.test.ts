import { describe, expect, it } from "vitest";
import { detectExcelTemplateVersion, resolveExcelTemplateMode } from "./utils";

describe("detectExcelTemplateVersion", () => {
	it("extracts version from the 3rd order name segment", () => {
		expect(detectExcelTemplateVersion("2026-0219-V54-ABC123")).toBe(54);
		expect(detectExcelTemplateVersion("2026-0219-v71-ABC123")).toBe(71);
	});

	it("extracts version even when segment position varies", () => {
		expect(detectExcelTemplateVersion("2026-02-19-V54-ABC123")).toBe(54);
		expect(detectExcelTemplateVersion("ORD_2026_02_19_v62_client")).toBe(62);
		expect(detectExcelTemplateVersion("Order V58 RevB")).toBe(58);
	});

	it("returns null when format does not match", () => {
		expect(detectExcelTemplateVersion("2026-0219-ABC123")).toBeNull();
		expect(detectExcelTemplateVersion("2026-0219-VX-ABC123")).toBeNull();
		expect(detectExcelTemplateVersion("")).toBeNull();
		expect(detectExcelTemplateVersion(null)).toBeNull();
	});
});

describe("resolveExcelTemplateMode", () => {
	it("uses auto detection with v54+ threshold", () => {
		expect(resolveExcelTemplateMode("auto", 53)).toBe("legacy");
		expect(resolveExcelTemplateMode("auto", 54)).toBe("v54plus");
		expect(resolveExcelTemplateMode("auto", null)).toBe("legacy");
	});

	it("prioritizes manual override over detected version", () => {
		expect(resolveExcelTemplateMode("legacy", 99)).toBe("legacy");
		expect(resolveExcelTemplateMode("v54plus", 12)).toBe("v54plus");
	});
});
