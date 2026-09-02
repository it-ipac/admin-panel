/**
 * Dashboard metric derivation.
 *
 * Every number the dashboard renders is computed here from real order rows.
 * When the data needed for a claim is absent, these helpers return `null` so the
 * UI can show an explicit "not available" state instead of inventing a value.
 */

export interface DashboardOrder {
	id: string;
	order_name: string;
	client_name: string;
	production_status?: string | null;
	created_at: string;
	completion_date?: string | null;
}

export interface StatusCounts {
	total: number;
	pending: number;
	inProgress: number;
	completed: number;
	onHold: number;
	cancelled: number;
}

export function countByStatus(orders: readonly DashboardOrder[]): StatusCounts {
	const counts: StatusCounts = {
		total: orders.length,
		pending: 0,
		inProgress: 0,
		completed: 0,
		onHold: 0,
		cancelled: 0,
	};
	for (const order of orders) {
		switch (order.production_status) {
			case "pending":
				counts.pending++;
				break;
			case "in_progress":
				counts.inProgress++;
				break;
			case "completed":
				counts.completed++;
				break;
			case "on_hold":
				counts.onHold++;
				break;
			case "cancelled":
				counts.cancelled++;
				break;
			default:
				break;
		}
	}
	return counts;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight-aligned day key, so bucketing is stable regardless of clock time. */
function dayKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export interface ActivityPoint {
	/** ISO date (YYYY-MM-DD) — the bucket key. */
	date: string;
	/** Short axis label, e.g. "4 Sep". */
	label: string;
	created: number;
	completed: number;
}

/**
 * Orders created and completed per day over the trailing `days` window.
 * `created_at` and `completion_date` are both real columns on `orders`.
 */
export function buildActivitySeries(
	orders: readonly DashboardOrder[],
	days: number,
	now: Date = new Date(),
): ActivityPoint[] {
	const buckets = new Map<string, ActivityPoint>();
	const today = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	);

	for (let i = days - 1; i >= 0; i--) {
		const day = new Date(today.getTime() - i * DAY_MS);
		const key = dayKey(day);
		buckets.set(key, {
			date: key,
			label: day.toLocaleDateString(undefined, {
				day: "numeric",
				month: "short",
			}),
			created: 0,
			completed: 0,
		});
	}

	for (const order of orders) {
		const createdKey = safeDayKey(order.created_at);
		if (createdKey) {
			const bucket = buckets.get(createdKey);
			if (bucket) bucket.created++;
		}
		const completedKey = safeDayKey(order.completion_date);
		if (completedKey) {
			const bucket = buckets.get(completedKey);
			if (bucket) bucket.completed++;
		}
	}

	return [...buckets.values()];
}

function safeDayKey(value: string | null | undefined): string | null {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return dayKey(parsed);
}

export interface PeriodChange {
	current: number;
	previous: number;
	/** Percent change, or null when the prior period has nothing to compare to. */
	percent: number | null;
}

/**
 * Orders created in the trailing `days` window versus the window before it.
 * `percent` is null when the previous window is empty — there is no honest
 * percentage change from zero, so the caller renders a plain count instead.
 */
export function comparePeriods(
	orders: readonly DashboardOrder[],
	days: number,
	now: Date = new Date(),
): PeriodChange {
	const currentStart = now.getTime() - days * DAY_MS;
	const previousStart = now.getTime() - 2 * days * DAY_MS;
	let current = 0;
	let previous = 0;

	for (const order of orders) {
		const created = new Date(order.created_at).getTime();
		if (Number.isNaN(created)) continue;
		if (created >= currentStart) current++;
		else if (created >= previousStart) previous++;
	}

	return {
		current,
		previous,
		percent:
			previous === 0
				? null
				: Math.round(((current - previous) / previous) * 100),
	};
}

/** True when a series has at least one non-zero value worth charting. */
export function hasActivity(points: readonly ActivityPoint[]): boolean {
	return points.some((p) => p.created > 0 || p.completed > 0);
}
