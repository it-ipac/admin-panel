export type ReportDisplaySettings = {
	_v: number;
	show_qr_codes: boolean;
	show_company_logo: boolean;
	theme_color: string;
	header_layout: "compact" | "standard" | "expanded";
	footer_text: string | null;
	include_signatures: boolean;
};

export const DEFAULT_DISPLAY_SETTINGS: ReportDisplaySettings = {
	_v: 1,
	show_qr_codes: true,
	show_company_logo: true,
	theme_color: "#000000",
	header_layout: "standard",
	footer_text: null,
	include_signatures: true,
};

export type ReportPkgDetailsSettings = {
	_v: number;
	show_dimensions: boolean;
	show_weights: boolean;
	show_materials: boolean;
	show_items: boolean;
	items_detail_level: "summary" | "full";
};

export const DEFAULT_PKG_DETAILS_SETTINGS: ReportPkgDetailsSettings = {
	_v: 1,
	show_dimensions: true,
	show_weights: true,
	show_materials: false,
	show_items: true,
	items_detail_level: "full",
};

export function resolveDisplaySettings(
	savedSettings: any,
): ReportDisplaySettings {
	if (!savedSettings) return DEFAULT_DISPLAY_SETTINGS;
	return { ...DEFAULT_DISPLAY_SETTINGS, ...savedSettings };
}

export function resolvePkgDetailsSettings(
	savedSettings: any,
): ReportPkgDetailsSettings {
	if (!savedSettings) return DEFAULT_PKG_DETAILS_SETTINGS;
	return { ...DEFAULT_PKG_DETAILS_SETTINGS, ...savedSettings };
}
