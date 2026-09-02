import { describe, expect, it } from "vitest";
import { errorMessage } from "./errorMessage";

describe("errorMessage", () => {
	it("reads a real Error", () => {
		expect(errorMessage(new Error("boom"))).toBe("boom");
	});

	// Regression: Supabase rejects with a plain object, which an
	// `instanceof Error` check degraded to "Unknown error".
	it("reads a PostgREST error object and keeps the code", () => {
		expect(
			errorMessage({
				code: "PGRST301",
				message: "JWSError",
				details: null,
				hint: null,
			}),
		).toBe("JWSError (PGRST301)");
	});

	it("joins message, details and hint when present", () => {
		expect(
			errorMessage({ message: "denied", details: "row 3", hint: "check RLS" }),
		).toBe("denied — row 3 — check RLS");
	});

	it("falls back to the code alone, then to a generic string", () => {
		expect(errorMessage({ code: "42501" })).toBe("Request failed (42501).");
		expect(errorMessage(null)).toBe("Unknown error.");
		expect(errorMessage({})).toBe("Unknown error.");
	});

	it("passes a plain string through", () => {
		expect(errorMessage("timeout")).toBe("timeout");
	});
});
