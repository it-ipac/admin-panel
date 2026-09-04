import { useCallback, useEffect, useState } from "react";
import {
	applyThemePreference,
	getThemePreference,
	type ResolvedTheme,
	resolveTheme,
	setThemePreference,
	type ThemePreference,
} from "../lib/theme";

/**
 * Single browser-side source for the resolved app theme, and the setter/toggle
 * the UI needs to change it.
 *
 * Delegates the light/dark decision to `resolveTheme` in lib/theme.ts — the
 * same pure function the app root uses to apply the theme on mount — so there
 * is one definition of "what theme is this preference under this OS", not two
 * independently-maintained copies.
 */
export function useThemePreference() {
	const [preference, setPreferenceState] = useState<ThemePreference>("system");
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

	useEffect(() => {
		const root = document.documentElement;
		const media = window.matchMedia("(prefers-color-scheme: dark)");

		const sync = () => {
			const stored = getThemePreference();
			setPreferenceState(stored);
			setResolvedTheme(resolveTheme(stored, media.matches));
		};

		sync();
		applyThemePreference(getThemePreference());
		media.addEventListener("change", sync);

		// Catches a preference change made by another mounted instance of this
		// hook (or anything else calling applyThemePreference directly) so this
		// component's local state stays in sync without its own event bus.
		const observer = new MutationObserver(sync);
		observer.observe(root, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});

		return () => {
			media.removeEventListener("change", sync);
			observer.disconnect();
		};
	}, []);

	const setPreference = useCallback((nextPreference: ThemePreference) => {
		setThemePreference(nextPreference);
		setPreferenceState(nextPreference);
		// Resolve synchronously rather than waiting on the MutationObserver's
		// microtask — a user clicking this hook's own toggle should see the
		// icon flip immediately, not one tick later. The observer stays, for
		// picking up a change made by a different mounted instance.
		const osPrefersDark = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;
		setResolvedTheme(resolveTheme(nextPreference, osPrefersDark));
	}, []);

	const toggleTheme = useCallback(() => {
		setPreference(resolvedTheme === "dark" ? "light" : "dark");
	}, [resolvedTheme, setPreference]);

	return {
		preference,
		resolvedTheme,
		isDark: resolvedTheme === "dark",
		setPreference,
		toggleTheme,
	};
}
