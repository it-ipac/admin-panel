export type ThemePreference = "light" | "dark" | "system";

const COOKIE_NAME = "ipac-theme-preference";

export const getThemePreference = (): ThemePreference => {
	if (typeof window === "undefined") {
		return "system";
	}

	const match = document.cookie.match(
		new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
	);
	if (match) {
		const value = match[1];
		if (value === "light" || value === "dark" || value === "system") {
			return value as ThemePreference;
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
	if (typeof document !== "undefined") {
		// Set cookie valid for 1 year
		// biome-ignore lint/suspicious/noDocumentCookie: intentional cookie usage
		document.cookie = `${COOKIE_NAME}=${preference}; path=/; max-age=31536000; SameSite=Lax`;
		applyThemePreference(preference);
	}
};
