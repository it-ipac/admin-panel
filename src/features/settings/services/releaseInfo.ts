export interface ReleaseInfo {
	version: string;
	updatedAt: string;
	commitSha: string;
	releaseType: "major" | "minor" | "patch";
	features: string[];
}

function normalizeReleaseType(
	value: string,
): "major" | "minor" | "patch" {
	if (value === "major" || value === "minor" || value === "patch") {
		return value;
	}
	return "patch";
}

function splitFeatures(input: string): string[] {
	if (!input.trim()) {
		return [];
	}

	return input
		.split(/\n|\|/g)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

function normalizeIsoDate(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return new Date().toISOString();
	}
	return parsed.toISOString();
}

export const releaseInfo: ReleaseInfo = {
	version: __APP_VERSION__ || "0.0.0",
	updatedAt: normalizeIsoDate(__APP_DEPLOYED_AT__),
	commitSha: __APP_COMMIT_SHA__ || "",
	releaseType: normalizeReleaseType(__APP_RELEASE_TYPE__ || "patch"),
	features: splitFeatures(__APP_RELEASE_FEATURES__ || __APP_COMMIT_MESSAGE__ || ""),
};

export function formatReleaseDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return "Unknown";
	}
	return date.toLocaleString();
}

export function getShortSha(sha: string): string {
	if (!sha) {
		return "Unknown";
	}
	return sha.slice(0, 8);
}
