export type ThemePreference = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "ipac-theme-preference";
const THEME_EVENT = "ipac-theme-change";

export const getThemePreference = (): ThemePreference => {
	if (typeof window === "undefined") {
		return "system";
	}

	const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
	if (stored === "light" || stored === "dark" || stored === "system") {
		return stored;
	}

	return "system";
};

export const getResolvedTheme = (
	preference: ThemePreference,
): "light" | "dark" => {
	if (preference !== "system") {
		return preference;
	}

	if (typeof window === "undefined" || !window.matchMedia) {
		return "light";
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

export const applyThemePreference = (preference: ThemePreference) => {
	if (typeof document === "undefined") {
		return;
	}

	const resolved = getResolvedTheme(preference);
	const root = document.documentElement;
	root.setAttribute("data-theme", resolved);
	root.setAttribute("data-theme-preference", preference);
};

export const setThemePreference = (preference: ThemePreference) => {
	if (typeof window !== "undefined") {
		window.localStorage.setItem(THEME_STORAGE_KEY, preference);
		window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: preference }));
	}
	applyThemePreference(preference);
};

export const watchSystemTheme = (callback: () => void) => {
	if (typeof window === "undefined" || !window.matchMedia) {
		return () => {};
	}

	const media = window.matchMedia("(prefers-color-scheme: dark)");
	const listener = () => callback();

	if (media.addEventListener) {
		media.addEventListener("change", listener);
		return () => media.removeEventListener("change", listener);
	}

	media.addListener(listener);
	return () => media.removeListener(listener);
};

export const subscribeThemePreference = (
	handler: (preference: ThemePreference) => void,
) => {
	if (typeof window === "undefined") {
		return () => {};
	}

	const onCustomEvent = (event: Event) => {
		const detail = (event as CustomEvent).detail as ThemePreference | undefined;
		handler(detail ?? getThemePreference());
	};

	const onStorage = (event: StorageEvent) => {
		if (event.key === THEME_STORAGE_KEY) {
			handler(getThemePreference());
		}
	};

	window.addEventListener(THEME_EVENT, onCustomEvent as EventListener);
	window.addEventListener("storage", onStorage);

	return () => {
		window.removeEventListener(THEME_EVENT, onCustomEvent as EventListener);
		window.removeEventListener("storage", onStorage);
	};
};
