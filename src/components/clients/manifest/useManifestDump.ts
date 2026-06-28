// Shared state for ingesting a TAQA items dump: parse the file, detect categories,
// and build the import payload once the user approves any new categories.
// Used by both the order-create modal (Way 1) and the order page (Way 2).

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
	buildManifestCategoryPlan,
	type CanonicalCategory,
	type ExistingCategory,
	type ManifestCategoryPlan,
} from "./manifestCategories";
import {
	type ManifestParseResult,
	type ManifestRow,
	parseManifestWorksheet,
} from "./manifestParser";
import { loadManifestWorksheet } from "./manifestWorkbook";

export interface ManifestDumpPayload {
	rows: ManifestRow[];
	categoriesToCreate: CanonicalCategory[];
	categoryIdByRaw: Record<string, string | null>;
	keyByRaw: Record<string, string | null>;
}

const useExistingCategories = (clientId: string) =>
	useQuery({
		queryKey: ["manifest-existing-categories", clientId],
		queryFn: async (): Promise<ExistingCategory[]> => {
			const { data, error } = await supabase
				.from("pkg_category")
				.select(`id, label, category_tag_map ( project_tags ( name ) )`)
				.eq("client_id", clientId);
			if (error) throw error;
			return ((data || []) as any[]).map((row) => {
				const tags = ((row.category_tag_map || []) as any[])
					.flatMap((mapRow) => {
						const related = mapRow?.project_tags;
						if (Array.isArray(related)) {
							return related.map((t) => String(t?.name || "").trim());
						}
						return related?.name ? [String(related.name).trim()] : [];
					})
					.filter(Boolean);
				return {
					id: String(row.id),
					label: (row.label as string | null) ?? null,
					tags: Array.from(new Set(tags)),
				};
			});
		},
		enabled: !!clientId,
	});

export const useManifestDump = (clientId: string) => {
	const { data: existingCategories = [] } = useExistingCategories(clientId);
	const [fileName, setFileName] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [parsing, setParsing] = useState(false);
	const [parseResult, setParseResult] = useState<ManifestParseResult | null>(
		null,
	);

	const reset = useCallback(() => {
		setFileName(null);
		setError(null);
		setParseResult(null);
	}, []);

	const processFile = useCallback(async (file: File) => {
		setParsing(true);
		setError(null);
		setParseResult(null);
		setFileName(file.name);
		try {
			const worksheet = await loadManifestWorksheet(file);
			if (!worksheet) {
				setError("Could not read any worksheet from this file.");
				return;
			}
			const result = parseManifestWorksheet(worksheet);
			if (!result.rows.length) {
				setError("No item rows were found. Check that this is the items file.");
				return;
			}
			setParseResult(result);
		} catch (e: any) {
			setError(`Failed to parse file: ${e?.message || "unknown error"}`);
		} finally {
			setParsing(false);
		}
	}, []);

	// Derive the category plan from the parsed rows AND the latest existing categories, so
	// it is recomputed once the categories query resolves — a file dropped before the query
	// settles would otherwise be planned against an empty list (duplicate categories).
	const categoryPlan = useMemo<ManifestCategoryPlan | null>(() => {
		if (!parseResult) return null;
		const counts = new Map<string, number>();
		for (const row of parseResult.rows) {
			counts.set(row.category_raw, (counts.get(row.category_raw) || 0) + 1);
		}
		return buildManifestCategoryPlan(
			Array.from(counts, ([raw, rowCount]) => ({ raw, rowCount })),
			existingCategories,
		);
	}, [parseResult, existingCategories]);

	const buildPayload = useCallback(
		(approvedKeys: Set<string>): ManifestDumpPayload | null => {
			if (!parseResult || !categoryPlan) return null;
			const categoryIdByRaw: Record<string, string | null> = {};
			const keyByRaw: Record<string, string | null> = {};
			for (const resolution of categoryPlan.resolutions) {
				categoryIdByRaw[resolution.raw] = resolution.categoryId;
				keyByRaw[resolution.raw] = resolution.canonicalKey;
			}
			return {
				rows: parseResult.rows,
				categoriesToCreate: categoryPlan.toCreate.filter((category) =>
					approvedKeys.has(category.key),
				),
				categoryIdByRaw,
				keyByRaw,
			};
		},
		[parseResult, categoryPlan],
	);

	return {
		fileName,
		error,
		parsing,
		parseResult,
		categoryPlan,
		processFile,
		reset,
		buildPayload,
	};
};
