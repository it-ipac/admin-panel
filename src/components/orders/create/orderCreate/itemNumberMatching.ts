export interface ClientItemLookupRow {
	id: unknown;
	item_num: unknown;
	reference?: unknown;
}

export interface ClientItemLookupEntry {
	itemId: string;
	itemNumber: string;
}

export interface PackageDesignationCandidate {
	packageNumber: number;
	designation: string | null | undefined;
}

export interface MatchedPackageItem {
	packageNumber: number;
	searchedItemNumber: string;
	matchedItemId: string;
	matchedItemNumber: string;
}

export interface UnmatchedPackageItem {
	packageNumber: number;
	searchedItemNumber: string;
}

export const normalizeItemNumberKey = (value: unknown) =>
	String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "");

const normalizeCompactItemKey = (value: unknown) =>
	String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");

export const buildItemNumberLookupKeys = (value: unknown) => {
	const raw = String(value ?? "").trim();
	if (!raw) return [];

	const keys = new Set<string>();
	const normalized = normalizeItemNumberKey(raw);
	if (normalized) keys.add(normalized);

	const compact = normalizeCompactItemKey(raw);
	if (compact) keys.add(compact);

	const commaStripped = raw.replace(/,/g, "").trim();
	if (commaStripped && commaStripped !== raw) {
		const commaStrippedNormalized = normalizeItemNumberKey(commaStripped);
		if (commaStrippedNormalized) keys.add(commaStrippedNormalized);

		const commaStrippedCompact = normalizeCompactItemKey(commaStripped);
		if (commaStrippedCompact) keys.add(commaStrippedCompact);
	}

	if (/^\d+$/.test(raw)) {
		keys.add(String(Number(raw)));
	}

	const numeric = Number(commaStripped);
	if (Number.isFinite(numeric)) {
		keys.add(String(numeric));
	}

	if (/^\d+$/.test(compact)) {
		keys.add(String(Number(compact)));
	}

	return Array.from(keys);
};

export const buildClientItemLookup = (rows: ClientItemLookupRow[]) => {
	const lookup = new Map<string, ClientItemLookupEntry>();

	for (const row of rows) {
		const itemId = String((row as any)?.id || "").trim();
		if (!itemId) continue;

		const rawItemNumber = String((row as any)?.item_num ?? "").trim();
		const rawReference = String((row as any)?.reference ?? "").trim();
		const itemNumber = rawItemNumber || rawReference || itemId;

		for (const key of buildItemNumberLookupKeys(rawItemNumber)) {
			if (!lookup.has(key)) {
				lookup.set(key, { itemId, itemNumber });
			}
		}

		for (const key of buildItemNumberLookupKeys(rawReference)) {
			if (!lookup.has(key)) {
				lookup.set(key, { itemId, itemNumber });
			}
		}
	}

	return lookup;
};

export const matchPackageDesignations = (
	packages: PackageDesignationCandidate[],
	lookup: Map<string, ClientItemLookupEntry>,
	preferredMatchesByPackage?: Map<number, ClientItemLookupEntry>,
) => {
	const matches: MatchedPackageItem[] = [];
	const unmatched: UnmatchedPackageItem[] = [];
	const matchedByPackage = new Map<number, MatchedPackageItem>();

	for (const pkg of packages) {
		const designation = String(pkg.designation ?? "").trim();
		if (!designation) continue;

		const preferred = preferredMatchesByPackage?.get(pkg.packageNumber);
		if (preferred?.itemId) {
			const match: MatchedPackageItem = {
				packageNumber: pkg.packageNumber,
				searchedItemNumber: designation,
				matchedItemId: preferred.itemId,
				matchedItemNumber: preferred.itemNumber,
			};
			matches.push(match);
			matchedByPackage.set(pkg.packageNumber, match);
			continue;
		}

		let found: ClientItemLookupEntry | undefined;
		for (const key of buildItemNumberLookupKeys(designation)) {
			const candidate = lookup.get(key);
			if (candidate) {
				found = candidate;
				break;
			}
		}

		if (found?.itemId) {
			const match: MatchedPackageItem = {
				packageNumber: pkg.packageNumber,
				searchedItemNumber: designation,
				matchedItemId: found.itemId,
				matchedItemNumber: found.itemNumber,
			};
			matches.push(match);
			matchedByPackage.set(pkg.packageNumber, match);
		} else {
			unmatched.push({
				packageNumber: pkg.packageNumber,
				searchedItemNumber: designation,
			});
		}
	}

	return {
		matches,
		unmatched,
		matchedByPackage,
	};
};
