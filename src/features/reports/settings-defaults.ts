export type SignatureField = { label: string };

export type ReportDisplaySettings = {
	_v: number;
	// Layout
	orientation: "portrait" | "landscape";
	font_size: "small" | "medium" | "large";
	header_layout: "compact" | "standard" | "expanded";
	// Branding
	show_company_logo: boolean;
	show_company_name: boolean;
	theme_color: string;
	accent_color: string;
	// Header fields
	show_report_number: boolean;
	show_report_date: boolean;
	show_project_reference: boolean;
	show_destination_country: boolean;
	// Body
	show_qr_codes: boolean;
	// Footer
	footer_text: string | null;
	show_page_numbers: boolean;
	include_signatures: boolean;
	signature_fields: SignatureField[];
};

export const DEFAULT_DISPLAY_SETTINGS: ReportDisplaySettings = {
	_v: 2,
	orientation: "portrait",
	font_size: "medium",
	header_layout: "standard",
	show_company_logo: true,
	show_company_name: true,
	theme_color: "#d9e4f2",
	accent_color: "#dbeafe",
	show_report_number: true,
	show_report_date: true,
	show_project_reference: true,
	show_destination_country: true,
	show_qr_codes: true,
	footer_text: null,
	show_page_numbers: true,
	include_signatures: true,
	signature_fields: [
		{ label: "Prepared By" },
		{ label: "Checked By" },
		{ label: "Approved By" },
	],
};

export type ReportPkgDetailsSettings = {
	_v: number;
	// Box header info
	box_header_style: "compact" | "detailed";
	show_ipac_reference: boolean;
	show_client_reference: boolean;
	show_order_name: boolean;
	show_destination: boolean;
	show_status: boolean;
	show_last_packed_date: boolean;
	show_item_count_summary: boolean;
	// Packaging info
	show_dimensions: boolean;
	show_weights: boolean;
	// Items table
	show_items: boolean;
	items_detail_level: "summary" | "full";
	items_sort: "item_num" | "description";
	table_alternating_rows: boolean;
	table_alternating_color: string;
	table_show_border: boolean;
	show_item_num_col: boolean;
	show_description_col: boolean;
	show_qty_col: boolean;
	show_line_num_col: boolean;
};

export const DEFAULT_PKG_DETAILS_SETTINGS: ReportPkgDetailsSettings = {
	_v: 2,
	box_header_style: "detailed",
	show_ipac_reference: true,
	show_client_reference: false,
	show_order_name: true,
	show_destination: true,
	show_status: false,
	show_last_packed_date: true,
	show_item_count_summary: true,
	show_dimensions: true,
	show_weights: true,
	show_items: true,
	items_detail_level: "full",
	items_sort: "item_num",
	table_alternating_rows: true,
	table_alternating_color: "#eef4ff",
	table_show_border: false,
	show_item_num_col: true,
	show_description_col: true,
	show_qty_col: true,
	show_line_num_col: false,
};

export function resolveDisplaySettings(saved: any): ReportDisplaySettings {
	if (!saved) return DEFAULT_DISPLAY_SETTINGS;
	return { ...DEFAULT_DISPLAY_SETTINGS, ...saved };
}

export function resolvePkgDetailsSettings(
	saved: any,
): ReportPkgDetailsSettings {
	if (!saved) return DEFAULT_PKG_DETAILS_SETTINGS;
	return { ...DEFAULT_PKG_DETAILS_SETTINGS, ...saved };
}
