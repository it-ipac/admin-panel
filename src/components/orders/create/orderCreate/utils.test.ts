import { describe, expect, it } from "vitest";
import {
	detectExcelTemplateVersion,
	extractSeiTokensFromCombined,
	findExistingClientIdFromOrderName,
	normalizeSeiCategoryValue,
	normalizeSeiProtectionValue,
	resolveExcelTemplateMode,
} from "./utils";

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

describe("SEI parsing helpers", () => {
	it("normalizes SEI category values", () => {
		expect(normalizeSeiCategoryValue("SEI.4")).toBe("4");
		expect(normalizeSeiCategoryValue(" 4 ")).toBe("4");
		expect(normalizeSeiCategoryValue("Yes")).toBe("0");
		expect(normalizeSeiCategoryValue("No")).toBe("-1");
	});

	it("normalizes SEI protection values", () => {
		expect(normalizeSeiProtectionValue("b -")).toBe("b");
		expect(normalizeSeiProtectionValue("CDI")).toBe("cdi");
		expect(normalizeSeiProtectionValue(" c  ")).toBe("c");
	});

	it("extracts category and protection from combined SEI raw text", () => {
		expect(extractSeiTokensFromCombined("SEI.4b -")).toEqual({
			categoryToken: "4",
			protectionToken: "b",
		});

		expect(extractSeiTokensFromCombined("SEI.3 cdi")).toEqual({
			categoryToken: "3",
			protectionToken: "cdi",
		});
	});
});

describe("findExistingClientIdFromOrderName", () => {
	const clients = [
		{ id: "1", name: "ACME" },
		{ id: "2", name: "United Arab Shipping Co" },
		{ id: "3", name: "Global Pumps LLC" },
	];

	it("matches existing client from year-date-version order format", () => {
		expect(
			findExistingClientIdFromOrderName(
				"2026-0419-V54-United Arab Shipping Co-RevA",
				clients,
			),
		).toBe("2");
	});

	it("matches client when separators vary", () => {
		expect(
			findExistingClientIdFromOrderName(
				"ORD_2026_04_19_v62_Global Pumps LLC_Alpha",
				clients,
			),
		).toBe("3");
	});

	it("returns empty when no unique match can be found", () => {
		expect(
			findExistingClientIdFromOrderName(
				"2026-0419-V54-Unknown Client-RevA",
				clients,
			),
		).toBe("");
		expect(
			findExistingClientIdFromOrderName("2026-0419-V54-ACME-RevA", [
				{ id: "1", name: "ACME" },
				{ id: "4", name: "ACME" },
			]),
		).toBe("");
	});
});
