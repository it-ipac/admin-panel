export type ThemePreference = "light" | "dark" | "system";

const COOKIE_NAME = "ipac-theme-preference";
const STORAGE_KEY = COOKIE_NAME;

const isThemePreference = (value: string | null): value is ThemePreference =>
	value === "light" || value === "dark" || value === "system";

export const getThemePreference = (): ThemePreference => {
	if (typeof window === "undefined") {
		return "system";
	}

	try {
		const storedValue = window.localStorage.getItem(STORAGE_KEY);
		if (isThemePreference(storedValue)) {
			return storedValue;
		}
	} catch {
		// Storage can be unavailable in hardened/private browsing contexts.
	}

	const match = document.cookie.match(
		new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
	);
	if (match) {
		const value = decodeURIComponent(match[1]);
		if (isThemePreference(value)) {
			return value;
		}
	}

	return "system";
};

export const applyThemePreference = (preference: ThemePreference) => {
	if (typeof document === "undefined") {
		return;
	}

	const root = document.documentElement;
	if (preference === "dark" || preference === "light") {
		root.setAttribute("data-theme", preference);
		root.style.colorScheme = preference;
	} else {
		root.removeAttribute("data-theme");
		root.style.colorScheme = "";
	}
};

export const setThemePreference = (preference: ThemePreference) => {
	if (typeof document === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(STORAGE_KEY, preference);
	} catch {
		// Keep the cookie fallback below when local storage is unavailable.
	}

	// Persist a cookie too so older sessions and restricted storage contexts keep working.
	// biome-ignore lint/suspicious/noDocumentCookie: intentional cookie usage
	document.cookie = `${COOKIE_NAME}=${encodeURIComponent(preference)}; path=/; max-age=31536000; SameSite=Lax`;
	applyThemePreference(preference);
};

export type ResolvedTheme = "light" | "dark";

/**
 * The theme a preference actually renders as. `light`/`dark` are absolute;
 * `system` defers to the OS. Pure, so the preference x OS matrix is testable.
 */
export const resolveTheme = (
	preference: ThemePreference,
	osPrefersDark: boolean,
): ResolvedTheme => {
	if (preference === "light") return "light";
	if (preference === "dark") return "dark";
	return osPrefersDark ? "dark" : "light";
};

/** True when the OS asks for a dark UI. False outside the browser. */
export const osPrefersDark = (): boolean => {
	if (typeof window === "undefined" || !window.matchMedia) return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

/**
 * Applies the stored preference and keeps following the OS while the preference
 * is "system". Returns an unsubscribe function.
 */
export const startThemeSync = (): (() => void) => {
	if (typeof window === "undefined") return () => {};
	const apply = () => applyThemePreference(getThemePreference());
	apply();
	const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
	if (!mq) return () => {};
	const onChange = () => {
		if (getThemePreference() === "system") apply();
	};
	mq.addEventListener("change", onChange);
	return () => mq.removeEventListener("change", onChange);
};
