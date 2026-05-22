export type SignatureField = { label: string; image_id?: string | null };

export type ReportDisplaySettings = {
	_v: number;
	// Layout
	orientation: "portrait" | "landscape";
	font_size: "small" | "medium" | "large";
	header_layout: "compact" | "standard" | "expanded";
	logo_size?: number;
	font_size_px?: number;
	header_top_margin?: number;
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
	enable_formatting: boolean;
	// Body
	show_qr_codes: boolean;
	// Footer
	footer_text: string | null;
	show_page_numbers: boolean;
	include_signatures: boolean;
	signature_fields: SignatureField[];
	footer_height_px?: number;
	signature_height_px?: number;
	signature_width_pct?: number;
	signature_align?: "left" | "center" | "right";
	footer_body_gap_px?: number;
	header_show_mode: "all_pages" | "first_page_only";
	signatures_scope: "project" | "box";
};

export const DEFAULT_DISPLAY_SETTINGS: ReportDisplaySettings = {
	_v: 2,
	orientation: "portrait",
	font_size: "medium",
	header_layout: "standard",
	logo_size: 90,
	font_size_px: 12,
	header_top_margin: 20,
	show_company_logo: true,
	show_company_name: true,
	theme_color: "#d9e4f2",
	accent_color: "#dbeafe",
	show_report_number: true,
	show_report_date: true,
	show_project_reference: true,
	show_destination_country: true,
	enable_formatting: true,
	show_qr_codes: true,
	footer_text: null,
	show_page_numbers: true,
	include_signatures: true,
	signature_fields: [
		{ label: "Prepared By" },
		{ label: "Checked By" },
		{ label: "Approved By" },
	],
	footer_height_px: 40,
	signature_height_px: 30,
	signature_width_pct: 80,
	signature_align: "center",
	footer_body_gap_px: 0,
	header_show_mode: "all_pages",
	signatures_scope: "project",
};

export type ReportPkgDetailsSettings = {
	_v: number;
	// Box header info
	box_header_style: "compact" | "detailed";
	box_display_mode: "compact" | "detailed";
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

	// New granular display settings
	show_box_number: boolean;
	show_line_number: boolean;
	show_quantity: boolean;
	show_internal_dims: boolean;
	show_external_dims: boolean;
	show_net_weight: boolean;
	show_gross_weight: boolean;
	show_tare: boolean;
	show_box_type: boolean;
	show_total_qty_items: boolean;
	show_unit_m3: boolean;
	show_total_m3: boolean;
	show_unit_m2: boolean;
	show_total_m2: boolean;
	show_sei: boolean;
	show_qr_code: boolean;

	// Items table
	show_items: boolean;
	items_detail_level: "summary" | "compact" | "detailed";
	items_sort: "item_num" | "description";
	table_alternating_rows: boolean;
	table_alternating_color: string;
	table_show_border: boolean;
	show_item_num_col: boolean;
	show_description_col: boolean;
	show_qty_col: boolean;
	show_line_num_col: boolean;
	show_item_additional_info: boolean;
	show_item_qr_code: boolean;
	include_item_photos_in_box_photos: boolean;
	// Box sorting
	boxes_sort: "number" | "packed_date";
	// Photos
	show_box_photos: boolean;
	show_item_photos: boolean;
};

export const DEFAULT_PKG_DETAILS_SETTINGS: ReportPkgDetailsSettings = {
	_v: 2,
	box_header_style: "detailed",
	box_display_mode: "detailed",
	show_ipac_reference: true,
	show_client_reference: false,
	show_order_name: true,
	show_destination: true,
	show_status: false,
	show_last_packed_date: true,
	show_item_count_summary: true,
	show_dimensions: true,
	show_weights: true,

	show_box_number: true,
	show_line_number: false,
	show_quantity: true,
	show_internal_dims: false,
	show_external_dims: true,
	show_net_weight: true,
	show_gross_weight: true,
	show_tare: false,
	show_box_type: false,
	show_total_qty_items: true,
	show_unit_m3: false,
	show_total_m3: false,
	show_unit_m2: false,
	show_total_m2: false,
	show_sei: false,
	show_qr_code: true,

	show_items: true,
	items_detail_level: "detailed",
	items_sort: "item_num",
	table_alternating_rows: true,
	table_alternating_color: "#eef4ff",
	table_show_border: false,
	show_item_num_col: true,
	show_description_col: true,
	show_qty_col: true,
	show_line_num_col: false,
	show_item_additional_info: true,
	show_item_qr_code: true,
	include_item_photos_in_box_photos: false,
	boxes_sort: "number",
	show_box_photos: false,
	show_item_photos: false,
};

export function resolveDisplaySettings(saved: any): ReportDisplaySettings {
	if (!saved) return DEFAULT_DISPLAY_SETTINGS;
	return {
		...DEFAULT_DISPLAY_SETTINGS,
		...saved,
		logo_size: saved.logo_size ?? DEFAULT_DISPLAY_SETTINGS.logo_size,
		font_size_px: saved.font_size_px ?? DEFAULT_DISPLAY_SETTINGS.font_size_px,
		header_top_margin:
			saved.header_top_margin ?? DEFAULT_DISPLAY_SETTINGS.header_top_margin,
		footer_height_px:
			saved.footer_height_px ?? DEFAULT_DISPLAY_SETTINGS.footer_height_px,
		signature_height_px:
			saved.signature_height_px ?? DEFAULT_DISPLAY_SETTINGS.signature_height_px,
		footer_body_gap_px:
			saved.footer_body_gap_px ?? DEFAULT_DISPLAY_SETTINGS.footer_body_gap_px,
		signature_width_pct:
			saved.signature_width_pct ?? DEFAULT_DISPLAY_SETTINGS.signature_width_pct,
		signature_align:
			saved.signature_align ?? DEFAULT_DISPLAY_SETTINGS.signature_align,
	};
}

export function resolvePkgDetailsSettings(
	saved: any,
): ReportPkgDetailsSettings {
	if (!saved) return DEFAULT_PKG_DETAILS_SETTINGS;
	const resolved = { ...DEFAULT_PKG_DETAILS_SETTINGS, ...saved };

	// Map old full value to detailed
	if (saved.items_detail_level === "full") {
		resolved.items_detail_level = "detailed";
	}

	if (saved.show_qr_codes !== undefined && saved.show_qr_code === undefined) {
		resolved.show_qr_code = saved.show_qr_codes;
	}

	if (
		saved.show_dimensions !== undefined &&
		saved.show_external_dims === undefined
	) {
		resolved.show_external_dims = saved.show_dimensions;
	}
	if (saved.show_weights !== undefined && saved.show_net_weight === undefined) {
		resolved.show_net_weight = saved.show_weights;
	}
	if (
		saved.box_header_style !== undefined &&
		saved.box_display_mode === undefined
	) {
		resolved.box_display_mode = saved.box_header_style;
	}

	// Default new properties if not defined in saved object
	resolved.show_tare = saved.show_tare ?? false;
	resolved.show_box_type = saved.show_box_type ?? false;
	resolved.show_total_qty_items =
		saved.show_total_qty_items ?? saved.show_item_count_summary ?? true;
	resolved.show_item_additional_info = saved.show_item_additional_info ?? true;
	resolved.show_item_qr_code = saved.show_item_qr_code ?? true;
	resolved.include_item_photos_in_box_photos =
		saved.include_item_photos_in_box_photos ?? false;

	return resolved;
}
