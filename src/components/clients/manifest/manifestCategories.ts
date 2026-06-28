// Pure category mapping for the TAQA items manifest.
// Maps the raw category string (column W) to an existing pkg_category, or flags
// a recognized-but-missing category for the "ask before create" prompt.
// No UI / no Supabase imports.

export interface ExistingCategory {
	id: string;
	label: string | null;
	tags: string[];
}

export interface TagDefinition {
	name: string;
	abbreviation: string;
}

export interface CanonicalCategory {
	key: string;
	label: string;
	/** Ordered tags (level 1, level 2, ...) — abbreviations follow the client's codes. */
	tags: TagDefinition[];
}

export interface CategoryResolution {
	raw: string;
	rowCount: number;
	canonicalKey: string | null;
	/** Resolved existing pkg_category id, or null when missing/unknown. */
	categoryId: string | null;
	/** Recognized canonical category but no matching pkg_category exists yet. */
	needsCreate: boolean;
	/** Not recognized at all — surfaced so the user can skip it. */
	unknown: boolean;
}

export interface ManifestCategoryPlan {
	resolutions: CategoryResolution[];
	byRaw: Record<string, CategoryResolution>;
	/** Distinct canonical categories that must be created (deduped). */
	toCreate: CanonicalCategory[];
	/** Raw values not recognized as any category. */
	unknownRaws: string[];
}

// Canonical categories. The first four already exist for TAQA; the last three
// are created on confirmation. Abbreviations mirror the client's label codes
// (P / W / AC / NAC, and Y = Yard, DG = Hazards).
export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
	{
		key: "power-ac",
		label: "Power + AC",
		tags: [
			{ name: "Power", abbreviation: "P" },
			{ name: "AC", abbreviation: "AC" },
		],
	},
	{
		key: "power-non-ac",
		label: "Power + Non-AC",
		tags: [
			{ name: "Power", abbreviation: "P" },
			{ name: "Non-AC", abbreviation: "NAC" },
		],
	},
	{
		key: "water-ac",
		label: "Water + AC",
		tags: [
			{ name: "Water", abbreviation: "W" },
			{ name: "AC", abbreviation: "AC" },
		],
	},
	{
		key: "water-non-ac",
		label: "Water + Non-AC",
		tags: [
			{ name: "Water", abbreviation: "W" },
			{ name: "Non-AC", abbreviation: "NAC" },
		],
	},
	{
		key: "power-yard",
		label: "Power + Yard",
		tags: [
			{ name: "Power", abbreviation: "P" },
			{ name: "Yard", abbreviation: "Y" },
		],
	},
	{ key: "yard", label: "Yard", tags: [{ name: "Yard", abbreviation: "Y" }] },
	{
		key: "hazards",
		label: "Hazards",
		tags: [{ name: "Hazards", abbreviation: "DG" }],
	},
];

const CANONICAL_BY_KEY = new Map(CANONICAL_CATEGORIES.map((c) => [c.key, c]));

const tokenize = (value: string): string[] =>
	(value || "")
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean);

/** Classify a raw category string to a canonical key, or null if unrecognized. */
export const classifyManifestCategory = (raw: string): string | null => {
	const tokens = tokenize(raw);
	if (!tokens.length) return null;
	const joined = tokens.join("");
	const has = (token: string) => tokens.includes(token);

	const power = has("power");
	const water = has("water");
	const yard = has("yard") || has("y");
	const hazard = has("hazard") || has("hazards") || has("dg");
	const non = has("non") || joined.includes("nonac");
	const ac = has("ac");

	if (hazard) return "hazards";
	if (power && yard) return "power-yard";
	if (yard && !power && !water) return "yard";
	if (power && non) return "power-non-ac";
	if (power && ac) return "power-ac";
	if (water && non) return "water-non-ac";
	if (water && ac) return "water-ac";
	return null;
};

const normalizeLabel = (value: string | null | undefined): string =>
	(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const tagSetKey = (tags: string[]): string =>
	tags
		.map((t) => t.toLowerCase().trim())
		.sort()
		.join("|");

/** Find an existing pkg_category that matches a canonical category by tag set or label. */
const matchExisting = (
	canonical: CanonicalCategory,
	existing: ExistingCategory[],
): string | null => {
	const wantTags = tagSetKey(canonical.tags.map((t) => t.name));
	const wantLabel = normalizeLabel(canonical.label);
	const hit = existing.find((category) => {
		if (category.tags.length && tagSetKey(category.tags) === wantTags)
			return true;
		return normalizeLabel(category.label) === wantLabel;
	});
	return hit?.id ?? null;
};

/**
 * Build the full category plan for a set of raw category values:
 * which resolve to existing categories, which need creating, which are unknown.
 */
export const buildManifestCategoryPlan = (
	rawCounts: Array<{ raw: string; rowCount: number }>,
	existing: ExistingCategory[],
): ManifestCategoryPlan => {
	const resolutions: CategoryResolution[] = [];
	const byRaw: Record<string, CategoryResolution> = {};
	const toCreateKeys = new Set<string>();

	for (const { raw, rowCount } of rawCounts) {
		const canonicalKey = classifyManifestCategory(raw);
		const canonical = canonicalKey
			? CANONICAL_BY_KEY.get(canonicalKey)
			: undefined;
		const categoryId = canonical ? matchExisting(canonical, existing) : null;

		const resolution: CategoryResolution = {
			raw,
			rowCount,
			canonicalKey,
			categoryId,
			needsCreate: Boolean(canonical) && !categoryId,
			unknown: !canonical,
		};
		if (resolution.needsCreate && canonicalKey) toCreateKeys.add(canonicalKey);

		resolutions.push(resolution);
		byRaw[raw] = resolution;
	}

	const toCreate = Array.from(toCreateKeys)
		.map((key) => CANONICAL_BY_KEY.get(key))
		.filter((c): c is CanonicalCategory => Boolean(c));
	const unknownRaws = resolutions.filter((r) => r.unknown).map((r) => r.raw);

	return { resolutions, byRaw, toCreate, unknownRaws };
};
