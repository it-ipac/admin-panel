// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	applyThemePreference,
	getThemePreference,
	setThemePreference,
	type ThemePreference,
} from "./theme";

beforeEach(() => {
	localStorage.clear();
	document.documentElement.removeAttribute("data-theme");
	document.documentElement.style.colorScheme = "";
	// biome-ignore lint/suspicious/noDocumentCookie: exercising the cookie fallback
	document.cookie = "ipac-theme-preference=; path=/; max-age=0";
});
afterEach(() => vi.unstubAllGlobals());

describe("applyThemePreference — data-theme and color-scheme", () => {
	it("light writes data-theme=light and color-scheme:light", () => {
		applyThemePreference("light");
		expect(document.documentElement.getAttribute("data-theme")).toBe("light");
		expect(document.documentElement.style.colorScheme).toBe("light");
	});

	it("dark writes data-theme=dark and color-scheme:dark", () => {
		applyThemePreference("dark");
		expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
		expect(document.documentElement.style.colorScheme).toBe("dark");
	});

	it("system removes data-theme so CSS follows the OS", () => {
		applyThemePreference("dark");
		applyThemePreference("system");
		expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
		expect(document.documentElement.style.colorScheme).toBe("");
	});

	// the reported bug: Light selected, app rendered dark
	it("selecting light never leaves a dark attribute behind", () => {
		applyThemePreference("dark");
		applyThemePreference("light");
		expect(document.documentElement.getAttribute("data-theme")).not.toBe(
			"dark",
		);
		expect(document.documentElement.style.colorScheme).not.toBe("dark");
	});

	it("selecting dark never leaves a light attribute behind", () => {
		applyThemePreference("light");
		applyThemePreference("dark");
		expect(document.documentElement.getAttribute("data-theme")).not.toBe(
			"light",
		);
		expect(document.documentElement.style.colorScheme).not.toBe("light");
	});
});

describe("persistence", () => {
	for (const pref of ["light", "dark", "system"] as ThemePreference[]) {
		it(`saving "${pref}" persists it and applies it in one step`, () => {
			setThemePreference(pref);
			expect(localStorage.getItem("ipac-theme-preference")).toBe(pref);
			expect(getThemePreference()).toBe(pref);
		});
	}

	it("restores the stored value on a fresh read (reload)", () => {
		setThemePreference("dark");
		expect(getThemePreference()).toBe("dark");
	});

	it("falls back to system for a missing or corrupt value", () => {
		expect(getThemePreference()).toBe("system");
		localStorage.setItem("ipac-theme-preference", "chartreuse");
		expect(getThemePreference()).toBe("system");
	});

	it("reads the cookie when localStorage holds nothing", () => {
		// biome-ignore lint/suspicious/noDocumentCookie: exercising the cookie fallback
		document.cookie = "ipac-theme-preference=dark; path=/";
		expect(getThemePreference()).toBe("dark");
	});
});
