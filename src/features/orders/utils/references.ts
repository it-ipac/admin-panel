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
