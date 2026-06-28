import {
	type AppliedExcelTemplateMode,
	type ClientOption,
	type ExcelTemplateMode,
	type MaterialVariantOption,
	type RawPackageRow,
	WOOD_OUT_OF_RANGE_ID,
} from "./types";

export const stripExtension = (filename: string) =>
	filename.replace(/\.[^/.]+$/, "");

export const detectExcelTemplateVersion = (
	orderName: string | null | undefined,
) => {
	if (!orderName) return null;
	const normalized = orderName.trim();
	if (!normalized) return null;

	const segments = normalized
		.split(/[-_\s]+/)
		.map((segment) => segment.trim())
		.filter(Boolean);
	for (const segment of segments) {
		const segmentMatch = segment.match(/^V(\d+)$/i);
		if (!segmentMatch) continue;
		const parsed = Number(segmentMatch[1]);
		if (Number.isFinite(parsed)) return parsed;
	}

	const fallbackMatch = normalized.match(
		/(?:^|[^A-Z0-9])V(\d+)(?:[^A-Z0-9]|$)/i,
	);
	if (!fallbackMatch) return null;
	const version = Number(fallbackMatch[1]);
	return Number.isFinite(version) ? version : null;
};

export const resolveExcelTemplateMode = (
	mode: ExcelTemplateMode,
	detectedVersion: number | null,
): AppliedExcelTemplateMode => {
	if (mode === "legacy") return "legacy";
	if (mode === "v54plus") return "v54plus";
	if (detectedVersion !== null && detectedVersion >= 54) return "v54plus";
	return "legacy";
};

const normalizeClientMatchText = (value: string) =>
	value
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.replace(/\s+/g, " ");

const toCompactClientMatchText = (value: string) =>
	normalizeClientMatchText(value).replace(/\s+/g, "");

const escapeRegExp = (value: string) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractClientScopeFromOrderName = (orderName: string) => {
	const normalizedName = orderName.trim();
	if (!normalizedName) return "";

	const versionSuffixMatch = normalizedName.match(
		/(?:^|[-_\s])V\d+(?:[-_\s]+)(.+)$/i,
	);
	if (versionSuffixMatch?.[1]) {
		return versionSuffixMatch[1].trim();
	}

	const segments = normalizedName
		.split(/[-_]+/)
		.map((segment) => segment.trim())
		.filter(Boolean);
	if (segments.length > 3) {
		return segments.slice(3).join(" ");
	}

	return normalizedName;
};

export const findExistingClientIdFromOrderName = (
	orderName: string | null | undefined,
	clients: Pick<ClientOption, "id" | "name">[],
) => {
	if (!orderName || clients.length === 0) return "";

	const scope = extractClientScopeFromOrderName(orderName);
	const normalizedScope = normalizeClientMatchText(scope);
	const compactScope = toCompactClientMatchText(scope);
	if (!normalizedScope) return "";

	const matches = clients
		.map((client) => {
			const normalizedClientName = normalizeClientMatchText(client.name || "");
			if (!normalizedClientName) return null;

			const wholeWordPattern = new RegExp(
				`(?:^|\\s)${escapeRegExp(normalizedClientName).replace(/\s+/g, "\\s+")}(?:\\s|$)`,
			);
			const compactClientName = normalizedClientName.replace(/\s+/g, "");

			const phraseMatch = wholeWordPattern.test(normalizedScope);
			const compactMatch =
				compactClientName.length >= 5 &&
				compactScope.includes(compactClientName);
			if (!phraseMatch && !compactMatch) return null;

			const startsScope =
				normalizedScope === normalizedClientName ||
				normalizedScope.startsWith(`${normalizedClientName} `);
			const score =
				normalizedClientName.length * 2 +
				(startsScope ? 10 : 0) +
				(phraseMatch ? 5 : 0);

			return {
				id: client.id,
				score,
			};
		})
		.filter((item): item is { id: string; score: number } => item !== null)
		.sort((a, b) => b.score - a.score);

	if (matches.length === 0) return "";
	if (matches.length > 1 && matches[0].score === matches[1].score) {
		return "";
	}

	return matches[0].id;
};

export const normalizePackingTypeCode = (raw: string | null) => {
	if (!raw) return null;
	const cleaned = raw
		.toUpperCase()
		.replace(/SEI/gi, "")
		.replace(/[.\s]+/g, "")
		.replace(/[^0-9A-Z]/g, "");

	const match = cleaned.match(/\d+[A-Z]/);
	return match ? match[0] : null;
};

export const normalizePackingTypeValue = (value: string | null | undefined) => {
	if (!value) return null;
	return value
		.toUpperCase()
		.replace(/SEI/gi, "")
		.replace(/[.\s]+/g, "")
		.replace(/[^0-9A-Z]/g, "");
};

export const normalizeSeiCategoryValue = (
	value: string | number | null | undefined,
) => {
	if (value === null || value === undefined) return null;
	const raw = String(value).trim();
	if (!raw) return null;

	const normalized = raw.toUpperCase().replace(/\s+/g, "");

	if (normalized === "NO" || normalized === "SEI.NO" || normalized === "-")
		return "-1";
	if (normalized === "YES" || normalized === "SEI.YES") return "0";

	const seiMatch = normalized.match(/SEI\.?(-?\d+)/i);
	if (seiMatch) {
		const parsed = Number(seiMatch[1]);
		return Number.isFinite(parsed) && parsed >= -1 && parsed <= 9
			? String(parsed)
			: null;
	}

	if (/^-?\d+$/.test(normalized)) {
		const parsed = Number(normalized);
		return Number.isFinite(parsed) && parsed >= -1 && parsed <= 9
			? String(parsed)
			: null;
	}

	const parts = raw.split(/[-–—]+/);
	const potentialCode = parts[0].trim();
	const cleanCode = potentialCode.toUpperCase().replace(/\s+/g, "");
	if (cleanCode === "NO" || cleanCode === "SEI.NO" || cleanCode === "-")
		return "-1";
	if (cleanCode === "YES" || cleanCode === "SEI.YES") return "0";

	const subSeiMatch = cleanCode.match(/SEI\.?(-?\d+)/i);
	if (subSeiMatch) {
		const parsed = Number(subSeiMatch[1]);
		return Number.isFinite(parsed) && parsed >= -1 && parsed <= 9
			? String(parsed)
			: null;
	}
	if (/^-?\d+$/.test(cleanCode)) {
		const parsed = Number(cleanCode);
		return Number.isFinite(parsed) && parsed >= -1 && parsed <= 9
			? String(parsed)
			: null;
	}

	return null;
};

export const normalizeSeiProtectionValue = (
	value: string | null | undefined,
) => {
	if (!value) return null;
	const raw = String(value).trim();
	if (!raw) return null;

	const normalized = raw.trim();
	const upper = normalized.toUpperCase();
	if (
		upper === "NO" ||
		upper === "-" ||
		upper === "NO PROTECTION" ||
		upper === "NO SEI PROTECTION"
	) {
		return "no";
	}
	if (upper === "YES") {
		return "yes";
	}

	const parts = normalized.split(/[-–—]+/);
	const potentialCode = parts[0].trim().toLowerCase();

	if (potentialCode === "no" || potentialCode === "yes") {
		return potentialCode;
	}

	const match = potentialCode.match(/^[a-z]+[0-9]*$/);
	if (match) {
		return match[0];
	}

	const compact = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
	if (!compact) return null;

	const prefix = compact.match(/^[a-z]+[0-9]*/);
	return prefix ? prefix[0] : null;
};

export const extractSeiTokensFromCombined = (
	value: string | null | undefined,
) => {
	if (!value) {
		return {
			categoryToken: null,
			protectionToken: null,
		};
	}

	const compact = String(value).trim().replace(/\s+/g, "");
	if (!compact) {
		return {
			categoryToken: null,
			protectionToken: null,
		};
	}

	const seiMatch = compact.match(/SEI\.?(-?\d+)(.*)/i);
	if (seiMatch) {
		return {
			categoryToken: normalizeSeiCategoryValue(seiMatch[1]),
			protectionToken: normalizeSeiProtectionValue(seiMatch[2]),
		};
	}

	return {
		categoryToken: normalizeSeiCategoryValue(compact),
		protectionToken: normalizeSeiProtectionValue(compact),
	};
};

export const parseNumberText = (text: string | null | undefined) => {
	if (!text) return null;
	const normalized = text.replace(/,/g, "").replace(/[^0-9.-]/g, "");
	if (!normalized) return null;
	const value = Number(normalized);
	if (!Number.isFinite(value)) return null;
	const fixedVal = Number(value.toFixed(8));
	return Math.floor(fixedVal * 100) / 100;
};

export const normalizeVariantName = (value: string | null | undefined) => {
	if (!value) return "";
	return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
};

export const isGenericWood = (value: string | null | undefined) => {
	return normalizeVariantName(value).includes("WOOD");
};

export const isWoodVariantOption = (variant: MaterialVariantOption) => {
	const normalized = normalizeVariantName(variant.variant_name);
	return normalized.includes("WOOD") || variant.id === WOOD_OUT_OF_RANGE_ID;
};

export const nearlyEqual = (
	a: number | null | undefined,
	b: number | null | undefined,
	epsilon = 0.001,
) => {
	if (a == null || b == null) return false;
	return Math.abs(a - b) <= epsilon;
};

export const updateRawPackageByNumber = (
	rows: RawPackageRow[],
	packageNumber: number,
	updater: (pkg: RawPackageRow) => RawPackageRow,
) =>
	rows.map((pkg) => (pkg.packageNumber === packageNumber ? updater(pkg) : pkg));

export const mapCategoryToTag = (
	categoryLabel: string | null | undefined,
): string => {
	if (!categoryLabel) return "TAG";
	const normalized = categoryLabel.toLowerCase();
	if (
		normalized.includes("power") &&
		(normalized.includes("non") || normalized.includes("without"))
	)
		return "P-NAC";
	if (normalized.includes("power")) return "P-AC";
	if (
		normalized.includes("water") &&
		(normalized.includes("non") || normalized.includes("without"))
	)
		return "W-NAC";
	if (normalized.includes("water")) return "W-AC";
	return "TAG";
};

export const mapTagsToIpacTag = (tags: string[]): string => {
	const joined = tags.join(" ").toLowerCase();
	const isPower = joined.includes("power");
	const isWater = joined.includes("water");
	const isNonAc = joined.includes("non") || joined.includes("without");

	if (isPower && isNonAc) return "P-NAC";
	if (isPower) return "P-AC";
	if (isWater && isNonAc) return "W-NAC";
	if (isWater) return "W-AC";
	return "TAG";
};

/**
 * Build the expected pkg_category label for a box instance from its Extended-info
 * tags (BMV/BMW) and box type. Standard boxes get the 3-tag "+ SB" variant.
 * Returns null when the tags are absent/unrecognized (category left unset).
 */
export const buildInstanceCategoryLabel = (
	tagL1: string | null | undefined,
	tagL2: string | null | undefined,
	isStandardBox: boolean,
): string | null => {
	const l1 = (tagL1 || "").trim().toUpperCase();
	const l2raw = (tagL2 || "").trim().toUpperCase();
	if (!l1 && !l2raw) return null;

	const l1full = l1 === "P" ? "Power" : l1 === "W" ? "Water" : null;
	const l2code = l2raw.replace(/-?SB$/, "").replace(/[^A-Z]/g, "");
	const l2full =
		l2code === "AC"
			? "AC"
			: l2code === "NAC" || l2code === "NONAC"
				? "Non-AC"
				: l2code === "Y" || l2code === "YARD"
					? "Yard"
					: l2code === "DG" || l2code === "HAZARDS"
						? "Hazards"
						: null;
	if (!l1full || !l2full) return null;

	return `${l1full} + ${l2full}${isStandardBox ? " + SB" : ""}`;
};

export const generateIpacReference = (params: {
	destination: string | null;
	tag: string;
	isCustom: boolean;
	boxNumber: number;
	itemNumber?: string | null;
	quantity?: number | null;
	generateRandomId?: boolean;
	randomSuffix?: string;
}) => {
	if (params.generateRandomId) {
		const dateObj = new Date();
		const dd = String(dateObj.getDate()).padStart(2, "0");
		const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
		const yyyy = dateObj.getFullYear();
		const suffix =
			params.randomSuffix ||
			Math.random().toString(36).substring(2, 10).toUpperCase();
		return `${dd}${mm}${yyyy}-${suffix}`;
	}

	const dest = (params.destination || "XXX").toUpperCase().slice(0, 3);
	const tag = params.tag;

	if (!params.isCustom) {
		return `${dest}-${tag}-${String(params.boxNumber).padStart(2, "0")}`;
	}

	const itemNum = params.itemNumber || "ITEM";
	const qty = String(params.quantity || 1).padStart(2, "0");
	return `${dest}-${tag}-${itemNum}-${qty}`;
};
