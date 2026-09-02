import { describe, expect, it } from "vitest";
import { formatInstanceStatus, STATUS_FALLBACK } from "./statusDisplay";

describe("formatInstanceStatus", () => {
	it("maps the known lifecycle values to their existing labels", () => {
		expect(formatInstanceStatus("design")).toBe("design");
		expect(formatInstanceStatus("approved")).toBe("approved");
		expect(formatInstanceStatus("in_production")).toBe("in prod");
		expect(formatInstanceStatus("packed")).toBe("packed");
	});

	it("falls back honestly for null, undefined and blank", () => {
		expect(formatInstanceStatus(null)).toBe(STATUS_FALLBACK);
		expect(formatInstanceStatus(undefined)).toBe(STATUS_FALLBACK);
		expect(formatInstanceStatus("   ")).toBe(STATUS_FALLBACK);
	});

	it("surfaces an unknown value instead of hiding or renaming it", () => {
		expect(formatInstanceStatus("awaiting_qc")).toBe("awaiting qc");
	});
});
