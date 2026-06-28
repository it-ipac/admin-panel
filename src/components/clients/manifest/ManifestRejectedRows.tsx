// Breakdown of rows that were not accepted from the manifest, grouped by reason,
// plus the "imported without a category" note. Presentational only.

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { ManifestCategoryPlan } from "./manifestCategories";
import type { ManifestParseResult, RejectedRow } from "./manifestParser";

interface ManifestRejectedRowsProps {
	parseResult: ManifestParseResult;
	categoryPlan: ManifestCategoryPlan | null;
}

interface ReasonGroup {
	reason: string;
	rows: RejectedRow[];
}

/** Rows whose category is unrecognized — imported, but without a category id. */
const useUnknownCategoryRowCount = (
	categoryPlan: ManifestCategoryPlan | null,
): number =>
	useMemo(() => {
		if (!categoryPlan) return 0;
		return categoryPlan.resolutions
			.filter((resolution) => resolution.unknown)
			.reduce((total, resolution) => total + resolution.rowCount, 0);
	}, [categoryPlan]);

export function ManifestRejectedRows({
	parseResult,
	categoryPlan,
}: ManifestRejectedRowsProps) {
	const [expanded, setExpanded] = useState(false);
	const unknownCategoryRowCount = useUnknownCategoryRowCount(categoryPlan);

	const groups = useMemo<ReasonGroup[]>(() => {
		const byReason = new Map<string, RejectedRow[]>();
		for (const row of parseResult.rejectedRows) {
			const bucket = byReason.get(row.reason);
			if (bucket) bucket.push(row);
			else byReason.set(row.reason, [row]);
		}
		return Array.from(byReason, ([reason, rows]) => ({ reason, rows }));
	}, [parseResult.rejectedRows]);

	const totalRejected = parseResult.rejectedRows.length;
	const hasUnknownNote = unknownCategoryRowCount > 0 && !!categoryPlan;

	if (totalRejected === 0 && !hasUnknownNote) return null;

	return (
		<div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
			<p className="font-semibold text-neutral-800">
				Rows not imported as items
			</p>

			{totalRejected === 0 ? (
				<p className="text-neutral-500">
					All rows with an item number were kept.
				</p>
			) : (
				<>
					<ul className="space-y-1">
						{groups.map((group) => (
							<li
								key={group.reason}
								className="flex items-center justify-between text-neutral-700"
							>
								<span>{group.reason}</span>
								<span className="font-semibold text-neutral-900">
									{group.rows.length}
								</span>
							</li>
						))}
					</ul>

					<button
						type="button"
						onClick={() => setExpanded((prev) => !prev)}
						className="flex items-center gap-1 text-primary-700 hover:text-primary-800"
					>
						{expanded ? (
							<ChevronDown className="h-4 w-4" />
						) : (
							<ChevronRight className="h-4 w-4" />
						)}
						{expanded ? "Hide" : "Show"} {totalRejected} rejected row(s)
					</button>

					{expanded && (
						<div className="max-h-48 space-y-3 overflow-y-auto rounded-md border border-neutral-200 bg-white p-2">
							{groups.map((group) => (
								<div key={group.reason}>
									<p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
										{group.reason} ({group.rows.length})
									</p>
									<ul className="mt-1 space-y-0.5">
										{group.rows.map((row) => (
											<li
												key={`${row.reason}-${row.rowNumber}`}
												className="flex items-center justify-between gap-2 text-[12px] text-neutral-700"
											>
												<span>Row {row.rowNumber}</span>
												<span className="truncate text-neutral-500">
													{row.itemNum ? row.itemNum : "—"}
												</span>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					)}
				</>
			)}

			{hasUnknownNote && (
				<p className="text-neutral-500">
					{unknownCategoryRowCount} row(s) have an unrecognized category (
					{categoryPlan?.unknownRaws.join(", ")}) and will import without a
					category.
				</p>
			)}
		</div>
	);
}
