/**
 * Helpers tying the leveled Tag picker to the package category, so that a box's
 * `tag` (sort tokens), `category_id` and `ipac_reference` stay consistent.
 *
 * A category IS a set of project tags (one per level). Picking tags in the
 * dropdown therefore resolves back to the matching category, which is what the
 * IPAC reference's tag segment is derived from (see references.ts).
 */
import type { TagTaxonomy } from "../types";

/** The tag ids that make up a given category (for seeding the picker). */
export function tagIdsFromCategory(
	taxonomy: TagTaxonomy | undefined,
	categoryId: string | null,
): string[] {
	if (!taxonomy || !categoryId) return [];
	return taxonomy.categories.find((c) => c.id === categoryId)?.tagIds ?? [];
}

/** Finds the category whose tag set exactly matches the chosen tag ids. */
export function resolveCategoryFromTags(
	taxonomy: TagTaxonomy | undefined,
	selectedTagIds: string[],
): string | null {
	if (!taxonomy || selectedTagIds.length === 0) return null;
	const wanted = [...selectedTagIds].sort().join("|");
	return (
		taxonomy.categories.find((c) => [...c.tagIds].sort().join("|") === wanted)
			?.id ?? null
	);
}

/** Human tag tokens (e.g. "power ac") for the sort column, ordered by level. */
export function tagTokensFromSelection(
	taxonomy: TagTaxonomy | undefined,
	selectedTagIds: string[],
): string {
	if (!taxonomy || selectedTagIds.length === 0) return "";
	const selected = new Set(selectedTagIds);
	const tokens: string[] = [];
	for (const level of taxonomy.levels) {
		for (const tag of level.tags) {
			if (selected.has(tag.id)) tokens.push(tag.name.trim().toLowerCase());
		}
	}
	return tokens.join(" ");
}
