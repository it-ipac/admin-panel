import { supabase } from "@/lib/supabase";

/** Builds the category tag abbreviation by querying category_tag_map → project_tags.
 *  Mirrors the ops-app buildCategoryTagAbbreviation logic. e.g. "P-NAC", "W-AC" */
export async function buildTagAbbreviation(
	categoryId: string | null,
): Promise<string> {
	if (!categoryId) return "TAG";
	const { data, error } = await supabase
		.from("category_tag_map")
		.select("tag_order, tag:project_tags(name, abbreviation)")
		.eq("category_id", categoryId)
		.order("tag_order", { ascending: true });

	if (error || !data?.length) return "TAG";

	const parts = (data as any[]).map((row) => {
		const tag = Array.isArray(row.tag) ? row.tag[0] : row.tag;
		if (tag?.abbreviation) return String(tag.abbreviation).trim();
		const name = String(tag?.name || "").trim();
		if (/^[A-Z0-9-]{1,5}$/.test(name)) return name;
		return name.charAt(0).toUpperCase();
	});

	return parts.filter(Boolean).join("-") || "TAG";
}

/** Builds the human tag tokens (space-separated, e.g. "power ac") for the
 *  `order_pkg_instance.tag` sort column — derived from the SAME category source
 *  the IPAC reference uses, so the report's sort columns can never drift from
 *  the generated reference. Returns "" when the category has no tags. */
export async function buildTagTokens(
	categoryId: string | null,
): Promise<string> {
	if (!categoryId) return "";
	const { data, error } = await supabase
		.from("category_tag_map")
		.select("tag_order, tag:project_tags(name)")
		.eq("category_id", categoryId)
		.order("tag_order", { ascending: true });

	if (error || !data?.length) return "";

	const parts = (data as any[]).map((row) => {
		const tag = Array.isArray(row.tag) ? row.tag[0] : row.tag;
		return String(tag?.name || "")
			.trim()
			.toLowerCase();
	});

	return parts.filter(Boolean).join(" ");
}
