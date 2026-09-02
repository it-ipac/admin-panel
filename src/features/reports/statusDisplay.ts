/**
 * Box-instance status presentation.
 *
 * The palette and labels were previously inlined in PackingListPage as
 * STATUS_CHIP; they live here so the interactive preview chip and the printable
 * "Status" field both read one mapping. Values come from
 * `order_pkg_instance.status` — nothing is renamed here.
 *
 * Note on colour: the report surface normalises all of its text through
 * `table td, th { color: … !important }` and
 * `.report-preview-container strong { color: inherit !important }` in
 * styles.css, so an inline colour on a status cell would be dead code. The
 * printable status is therefore plain text, consistent with the Dest / Order
 * fields beside it — the value carries the meaning, not the colour.
 */
export const STATUS_CHIP: Record<
	string,
	{ label: string; bg: string; fg: string }
> = {
	design: { label: "design", bg: "#f3f4f6", fg: "#4b5563" },
	approved: { label: "approved", bg: "#e0e7ff", fg: "#4338ca" },
	in_production: { label: "in prod", bg: "#ffedd5", fg: "#9a3412" },
	packed: { label: "packed", bg: "#dcfce7", fg: "#166534" },
};

export const STATUS_OPTIONS = [
	"design",
	"approved",
	"in_production",
	"packed",
] as const;

export type InstanceStatus = (typeof STATUS_OPTIONS)[number];

/** Shown when a box carries no status at all. */
export const STATUS_FALLBACK = "—";

/**
 * Human label for a box status.
 *
 * Known values use the mapping above. An unrecognised value is surfaced as-is
 * (underscores spaced out) rather than hidden or renamed, so unexpected data
 * stays visible. Null/empty yields an explicit dash.
 */
export function formatInstanceStatus(
	status: string | null | undefined,
): string {
	if (!status || !status.trim()) return STATUS_FALLBACK;
	const known = STATUS_CHIP[status];
	if (known) return known.label;
	return status.replace(/_/g, " ");
}
