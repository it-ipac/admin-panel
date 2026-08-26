(() => {
	const key = "ipac-theme-preference";
	const root = document.documentElement;
	let preference = null;

	try {
		preference = window.localStorage.getItem(key);
	} catch {
		preference = null;
	}

	if (preference !== "light" && preference !== "dark" && preference !== "system") {
		const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
		preference = match ? decodeURIComponent(match[1]) : "system";
	}

	if (preference === "light" || preference === "dark") {
		root.setAttribute("data-theme", preference);
		root.style.colorScheme = preference;
		return;
	}

	root.removeAttribute("data-theme");
	root.style.colorScheme = "";
})();
