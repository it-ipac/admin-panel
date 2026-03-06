import {
	type AppliedExcelTemplateMode,
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

export const parseNumberText = (text: string | null | undefined) => {
	if (!text) return null;
	const normalized = text.replace(/,/g, "").replace(/[^0-9.-]/g, "");
	if (!normalized) return null;
	const value = Number(normalized);
	return Number.isFinite(value) ? value : null;
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
