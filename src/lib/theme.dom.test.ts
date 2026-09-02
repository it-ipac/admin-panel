// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	applyThemePreference,
	getThemePreference,
	setThemePreference,
	startThemeSync,
	type ThemePreference,
} from "./theme";

/** Controllable prefers-color-scheme, so System can be driven both ways. */
function mockMatchMedia(prefersDark: boolean) {
	const listeners = new Set<() => void>();
	const mql = {
		matches: prefersDark,
		media: "(prefers-color-scheme: dark)",
		addEventListener: (_: string, cb: () => void) => listeners.add(cb),
		removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
	};
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => mql),
	);
	return {
		set(next: boolean) {
			mql.matches = next;
			for (const cb of listeners) cb();
		},
		get listenerCount() {
			return listeners.size;
		},
	};
}

beforeEach(() => {
	localStorage.clear();
	document.documentElement.removeAttribute("data-theme");
	document.documentElement.style.colorScheme = "";
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
		document.cookie = "ipac-theme-preference=dark; path=/";
		expect(getThemePreference()).toBe("dark");
	});
});

describe("startThemeSync", () => {
	it("applies the stored preference on start — the bug was that nothing did", () => {
		mockMatchMedia(true);
		localStorage.setItem("ipac-theme-preference", "light");
		const stop = startThemeSync();
		expect(document.documentElement.getAttribute("data-theme")).toBe("light");
		stop();
	});

	it("in system mode it re-applies when the OS preference changes", () => {
		const mq = mockMatchMedia(false);
		localStorage.setItem("ipac-theme-preference", "system");
		const stop = startThemeSync();
		expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
		expect(mq.listenerCount).toBe(1);
		mq.set(true);
		// system stays attribute-less; CSS light-dark() follows color-scheme
		expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
		stop();
		expect(mq.listenerCount).toBe(0);
	});

	it("an OS change does not disturb an explicit preference", () => {
		const mq = mockMatchMedia(false);
		localStorage.setItem("ipac-theme-preference", "light");
		const stop = startThemeSync();
		mq.set(true);
		expect(document.documentElement.getAttribute("data-theme")).toBe("light");
		stop();
	});

	it("unsubscribes cleanly", () => {
		const mq = mockMatchMedia(false);
		const stop = startThemeSync();
		stop();
		expect(mq.listenerCount).toBe(0);
	});
});
