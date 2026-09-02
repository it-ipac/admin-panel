/**
 * Supabase/PostgREST rejections are plain objects, not `Error` instances, so an
 * `instanceof Error` check silently degrades every backend failure to "Unknown
 * error". Pull the most useful text out of whatever shape actually arrived.
 */
export function errorMessage(error: unknown): string {
	if (!error) return "Unknown error.";
	if (typeof error === "string") return error;
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "object") {
		const e = error as Record<string, unknown>;
		const parts = [e.message, e.details, e.hint]
			.filter((p): p is string => typeof p === "string" && p.length > 0)
			.join(" — ");
		if (parts)
			return typeof e.code === "string" ? `${parts} (${e.code})` : parts;
		if (typeof e.code === "string") return `Request failed (${e.code}).`;
	}
	return "Unknown error.";
}
