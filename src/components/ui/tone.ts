/**
 * Semantic tones — the single source of truth for status/intent colour.
 *
 * Every badge, pill and tinted panel in the app resolves its colours through
 * this module instead of hand-writing `bg-success-50 text-success-700 …` at the
 * call site. Adding a tone here makes it available everywhere; re-skinning a
 * tone is a one-line change.
 *
 * Colours come from the semantic scales in src/styles.css `@theme`, which are
 * theme-aware: the 50/100/200 tint steps carry their own light/dark values, and
 * the deep 700 text steps pair with a `dark:` counterpart for contrast.
 */

export type Tone =
	| "neutral"
	| "primary"
	| "success"
	| "warning"
	| "danger"
	| "info"
	| "accent"
	| "ember";

/** Tinted surface + border + text. Used by Badge, StatusPill and callouts. */
export const toneSubtle: Record<Tone, string> = {
	neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
	primary:
		"bg-primary-50 text-primary-700 dark:text-primary-300 border-primary-200",
	success:
		"bg-success-50 text-success-700 dark:text-success-300 border-success-200",
	warning:
		"bg-warning-50 text-warning-700 dark:text-warning-300 border-warning-200",
	danger: "bg-danger-50 text-danger-700 dark:text-danger-300 border-danger-200",
	info: "bg-iris-50 text-iris-700 dark:text-iris-300 border-iris-200",
	accent: "bg-accent-50 text-accent-700 dark:text-accent-300 border-accent-200",
	ember: "bg-ember-50 text-ember-700 dark:text-ember-300 border-ember-200",
};

/**
 * Filled treatment for emphasis. The chromatic tones keep white text; `neutral`
 * pairs two steps of the neutral ramp instead, because that ramp inverts under a
 * dark color-scheme and white-on-neutral-600 would invert into an unreadable
 * white-on-light.
 */
export const toneSolid: Record<Tone, string> = {
	neutral: "bg-neutral-800 text-neutral-100 border-transparent",
	primary: "bg-primary-600 text-white border-transparent",
	success: "bg-success-600 text-white border-transparent",
	warning: "bg-warning-600 text-white border-transparent",
	danger: "bg-danger-600 text-white border-transparent",
	info: "bg-iris-600 text-white border-transparent",
	accent: "bg-accent-600 text-white border-transparent",
	ember: "bg-ember-600 text-white border-transparent",
};

/** Solid dot, for the leading indicator on a pill. */
export const toneDot: Record<Tone, string> = {
	neutral: "bg-neutral-400",
	primary: "bg-primary-500",
	success: "bg-success-500",
	warning: "bg-warning-500",
	danger: "bg-danger-500",
	info: "bg-iris-500",
	accent: "bg-accent-500",
	ember: "bg-ember-500",
};

/**
 * Domain status → tone. Covers the values used by `orders.production_status`,
 * request review states and the generic active/inactive flags.
 */
const STATUS_TONES: Record<string, Tone> = {
	pending: "warning",
	in_progress: "primary",
	completed: "success",
	on_hold: "ember",
	cancelled: "neutral",
	approved: "success",
	rejected: "danger",
	draft: "neutral",
	active: "success",
	inactive: "neutral",
};

/** Tone for a domain status. Unknown statuses fall back to neutral. */
export function statusTone(status: string | null | undefined): Tone {
	if (!status) return "neutral";
	return STATUS_TONES[status] ?? "neutral";
}

/** `in_progress` → `In progress`. */
export function statusLabel(status: string | null | undefined): string {
	if (!status) return "Unknown";
	const spaced = status.replace(/_/g, " ");
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
