/**
 * Preview pagination maths, kept pure so every edge case is unit-testable.
 * Page indexes are 0-based internally; the UI shows 1-based numbers.
 */

/** Clamp a 0-based index into [0, totalPages - 1]. Empty documents give 0. */
export function clampPageIndex(index: number, totalPages: number): number {
	if (!Number.isFinite(index) || totalPages <= 0) return 0;
	return Math.min(Math.max(Math.trunc(index), 0), totalPages - 1);
}

export type PageInputResult =
	| { ok: true; index: number; clamped: boolean }
	| { ok: false; reason: "empty" | "not-a-number" };

/**
 * Interpret what a user typed into the page box.
 *
 * - blank / whitespace            -> rejected as "empty" (caller keeps the current page)
 * - non-numeric or decimal text   -> rejected as "not-a-number"
 * - below 1                       -> clamped to the first page
 * - above totalPages              -> clamped to the last page
 *
 * Decimals are rejected rather than truncated: "2.5" is a typo, not an
 * instruction, and silently jumping to page 2 hides the mistake.
 */
export function parsePageInput(
	raw: string,
	totalPages: number,
): PageInputResult {
	const trimmed = raw.trim();
	if (trimmed === "") return { ok: false, reason: "empty" };
	// Optional sign, digits only — rejects "2.5", "1e3", "abc", "12px".
	if (!/^[+-]?\d+$/.test(trimmed)) return { ok: false, reason: "not-a-number" };

	const asNumber = Number(trimmed);
	if (!Number.isFinite(asNumber)) return { ok: false, reason: "not-a-number" };

	const requested = asNumber - 1; // 1-based -> 0-based
	const index = clampPageIndex(requested, totalPages);
	return { ok: true, index, clamped: index !== requested };
}
