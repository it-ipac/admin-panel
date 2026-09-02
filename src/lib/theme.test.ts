import { describe, expect, it } from "vitest";
import { resolveTheme, type ThemePreference } from "./theme";

describe("resolveTheme — the full OS x preference matrix", () => {
	const cases: Array<[ThemePreference, boolean, "light" | "dark"]> = [
		// preference,  osPrefersDark, expected
		["light", false, "light"],
		["light", true, "light"], // an explicit choice always wins over the OS
		["dark", false, "dark"],
		["dark", true, "dark"],
		["system", false, "light"],
		["system", true, "dark"],
	];

	for (const [pref, osDark, expected] of cases) {
		it(`OS ${osDark ? "dark" : "light"} + "${pref}" -> ${expected}`, () => {
			expect(resolveTheme(pref, osDark)).toBe(expected);
		});
	}

	it("never returns dark for an explicit light preference", () => {
		expect(resolveTheme("light", true)).not.toBe("dark");
	});

	it("never returns light for an explicit dark preference", () => {
		expect(resolveTheme("dark", false)).not.toBe("light");
	});

	it("follows the OS both ways in system mode", () => {
		expect(resolveTheme("system", true)).toBe("dark");
		expect(resolveTheme("system", false)).toBe("light");
	});
});
