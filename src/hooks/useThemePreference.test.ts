// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useThemePreference } from "./useThemePreference";

/** Controllable prefers-color-scheme, so the hook can be driven both ways. */
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
	};
}

beforeEach(() => {
	localStorage.clear();
	document.documentElement.removeAttribute("data-theme");
	document.documentElement.style.colorScheme = "";
});
afterEach(() => vi.unstubAllGlobals());

describe("useThemePreference", () => {
	// This is the behaviour that used to live in the now-retired startThemeSync:
	// applying the stored preference is this hook's job now, not a second
	// mechanism running in parallel at the app root.
	it("applies the stored preference on mount", () => {
		mockMatchMedia(false);
		localStorage.setItem("ipac-theme-preference", "dark");
		renderHook(() => useThemePreference());
		expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
	});

	it("resolves via the shared resolveTheme matrix (system + OS dark -> dark)", () => {
		mockMatchMedia(true);
		localStorage.setItem("ipac-theme-preference", "system");
		const { result } = renderHook(() => useThemePreference());
		expect(result.current.preference).toBe("system");
		expect(result.current.resolvedTheme).toBe("dark");
		expect(result.current.isDark).toBe(true);
	});

	it("an explicit preference is never overridden by the OS", () => {
		mockMatchMedia(false);
		localStorage.setItem("ipac-theme-preference", "dark");
		const { result } = renderHook(() => useThemePreference());
		expect(result.current.resolvedTheme).toBe("dark");
	});

	it("tracks a live OS change while on system", () => {
		const mq = mockMatchMedia(false);
		localStorage.setItem("ipac-theme-preference", "system");
		const { result } = renderHook(() => useThemePreference());
		expect(result.current.resolvedTheme).toBe("light");
		act(() => mq.set(true));
		expect(result.current.resolvedTheme).toBe("dark");
	});

	it("setPreference persists and applies immediately", () => {
		mockMatchMedia(false);
		const { result } = renderHook(() => useThemePreference());
		act(() => result.current.setPreference("dark"));
		expect(localStorage.getItem("ipac-theme-preference")).toBe("dark");
		expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
		expect(result.current.preference).toBe("dark");
	});

	it("toggleTheme flips between light and dark", () => {
		mockMatchMedia(false);
		localStorage.setItem("ipac-theme-preference", "light");
		const { result } = renderHook(() => useThemePreference());
		expect(result.current.isDark).toBe(false);
		act(() => result.current.toggleTheme());
		expect(result.current.isDark).toBe(true);
		expect(result.current.preference).toBe("dark");
	});
});
