import type { ReportPkgDetailsSettings } from "./settings-defaults";

/**
 * The "Line 1 Options (Compact & Detailed)" fields of the Box Card, in the order
 * they appear in the Appearance panel. Declared once so the Select-all control
 * and its tests cannot drift from the rendered list.
 */
export const BOX_LINE1_FIELDS = [
	"show_line_number",
	"show_box_number",
	"show_quantity",
	"show_internal_dims",
	"show_external_dims",
	"show_tare",
	"show_net_weight",
	"show_gross_weight",
	"show_unit_m3",
	"show_total_m3",
	"show_unit_m2",
	"show_total_m2",
	"show_sei",
	"show_ipac_reference",
	"show_qr_code",
	"show_client_reference",
	"show_order_name",
	"show_destination",
	"show_status",
] as const satisfies ReadonlyArray<keyof ReportPkgDetailsSettings>;

export type BoxLine1Field = (typeof BOX_LINE1_FIELDS)[number];

export type SelectAllState = "all" | "none" | "some";

/**
 * Fields a business rule pins on (or off). Toggling "Select all" must leave
 * these untouched and must not count them when deciding the master state.
 * Empty today — the Box Card line-1 fields are all optional — but the control
 * and its tests honour it so a future locked field behaves correctly.
 */
export type LockedFields = Partial<Record<BoxLine1Field, boolean>>;

function selectable(
	fields: readonly BoxLine1Field[],
	locked: LockedFields,
): BoxLine1Field[] {
	return fields.filter((f) => locked[f] !== true);
}

/**
 * Master checkbox state: `all` when every selectable field is on, `none` when
 * every one is off, `some` (indeterminate) in between.
 */
export function getSelectAllState(
	settings: Pick<ReportPkgDetailsSettings, BoxLine1Field>,
	fields: readonly BoxLine1Field[] = BOX_LINE1_FIELDS,
	locked: LockedFields = {},
): SelectAllState {
	const open = selectable(fields, locked);
	if (open.length === 0) return "none";
	let on = 0;
	for (const f of open) if (settings[f]) on++;
	if (on === 0) return "none";
	if (on === open.length) return "all";
	return "some";
}

/**
 * Turn every selectable field on or off, leaving locked fields as they are.
 * Returns a new object; the caller's state stays immutable.
 */
export function applySelectAll<
	T extends Pick<ReportPkgDetailsSettings, BoxLine1Field>,
>(
	settings: T,
	checked: boolean,
	fields: readonly BoxLine1Field[] = BOX_LINE1_FIELDS,
	locked: LockedFields = {},
): T {
	const next = { ...settings };
	for (const f of selectable(fields, locked)) {
		(next as Record<string, unknown>)[f] = checked;
	}
	return next;
}

/**
 * What clicking the master checkbox should do. An indeterminate box selects
 * everything (rather than clearing), which is the behaviour users expect.
 */
export function nextSelectAllValue(state: SelectAllState): boolean {
	return state !== "all";
}
