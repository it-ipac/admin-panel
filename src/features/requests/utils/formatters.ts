// ─── Time formatting ──────────────────────────────────────────────────────────

export function formatRelativeTime(isoString: string): string {
	const now = Date.now();
	const then = new Date(isoString).getTime();
	const diffMs = now - then;
	const diffSeconds = Math.floor(diffMs / 1000);

	if (diffSeconds < 60) return "just now";
	if (diffSeconds < 3600) {
		const m = Math.floor(diffSeconds / 60);
		return `${m}m ago`;
	}
	if (diffSeconds < 86_400) {
		const h = Math.floor(diffSeconds / 3600);
		return `${h}h ago`;
	}
	if (diffSeconds < 2_592_000) {
		const d = Math.floor(diffSeconds / 86_400);
		return `${d}d ago`;
	}
	return new Date(isoString).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export function formatDateTime(isoString: string): string {
	return new Date(isoString).toLocaleString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// ─── Context label builders ───────────────────────────────────────────────────

interface OrderPackageContext {
	package_number: number;
	order: { order_name: string } | null;
}

export function buildContextLabel(
	orderPackage: OrderPackageContext | null,
): string {
	if (!orderPackage) return "—";
	const orderName = orderPackage.order?.order_name ?? "Unknown order";
	return `${orderName} / Pkg #${orderPackage.package_number}`;
}
