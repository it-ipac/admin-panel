import { useCallback, useEffect, useState } from "react";
import {
	applyThemePreference,
	getThemePreference,
	setThemePreference,
	type ThemePreference,
} from "../lib/theme";

type ResolvedTheme = "light" | "dark";

function resolveTheme(media: MediaQueryList): ResolvedTheme {
	const applied = document.documentElement.getAttribute("data-theme");
	if (applied === "dark") return "dark";
	if (applied === "light") return "light";
	return media.matches ? "dark" : "light";
}

/**
 * Single browser-side source for the resolved app theme.
 * Explicit light/dark preferences win; the OS preference is used only when
 * the saved preference is "system" and no data-theme attribute is present.
 */
export function useThemePreference() {
	const [preference, setPreferenceState] = useState<ThemePreference>("system");
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

	useEffect(() => {
		const root = document.documentElement;
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const storedPreference = getThemePreference();

		setPreferenceState(storedPreference);
		applyThemePreference(storedPreference);

		const syncResolvedTheme = () => {
			setResolvedTheme(resolveTheme(media));
		};

		syncResolvedTheme();
		media.addEventListener("change", syncResolvedTheme);
		const observer = new MutationObserver(syncResolvedTheme);
		observer.observe(root, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});

		return () => {
			media.removeEventListener("change", syncResolvedTheme);
			observer.disconnect();
		};
	}, []);

	const setPreference = useCallback((nextPreference: ThemePreference) => {
		setThemePreference(nextPreference);
		setPreferenceState(nextPreference);
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
