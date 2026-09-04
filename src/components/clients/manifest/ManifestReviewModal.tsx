// Side-by-side review of a parsed TAQA items file. Opens to the right of the
// order-create dialog as a separate Radix Dialog: summary, destinations,
// rejected-rows breakdown, and the "ask before create" category prompt.
// Presentational only — all state/handlers come from ManifestDumpPanel.

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { ManifestRejectedRows } from "./ManifestRejectedRows";
import type { ManifestCategoryPlan } from "./manifestCategories";
import type { ManifestParseResult } from "./manifestParser";

interface ManifestReviewSummary {
	rows: number;
	items: number;
	destinations: string[];
	sb: number;
}

interface ManifestReviewModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fileName: string | null;
	parseResult: ManifestParseResult;
	categoryPlan: ManifestCategoryPlan | null;
	summary: ManifestReviewSummary;
	approvedKeys: Set<string>;
	onToggleKey: (key: string) => void;
	/** When set, the modal can import directly into this order (Way 2). */
	showImport: boolean;
	importPending: boolean;
	importDisabled: boolean;
	onImport: () => void;
}

export function ManifestReviewModal({
	open,
	onOpenChange,
	fileName,
	parseResult,
	categoryPlan,
	summary,
	approvedKeys,
	onToggleKey,
	showImport,
	importPending,
	importDisabled,
	onImport,
}: ManifestReviewModalProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-[var(--z-modal-overlay)] bg-black/40" />
				<Dialog.Content className="fixed inset-y-0 right-0 z-[var(--z-modal)] flex w-full max-w-md flex-col bg-white shadow-2xl">
					<div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-4">
						<div>
							<Dialog.Title className="text-base font-semibold text-neutral-900">
								Review items file
							</Dialog.Title>
							<Dialog.Description className="text-xs text-neutral-500">
								{fileName || "Parsed manifest"}
							</Dialog.Description>
						</div>
						<Dialog.Close asChild>
							<button
								type="button"
								className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100"
								aria-label="Close review"
							>
								<X className="h-5 w-5" />
							</button>
						</Dialog.Close>
					</div>

					<div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
						<div className="flex items-center gap-2 font-semibold text-success-700">
							<CheckCircle2 className="h-4 w-4" /> {summary.items} items ·{" "}
							{summary.rows} rows · {summary.sb} standard-box rows
						</div>
						<div className="text-neutral-600">
							Destinations: {summary.destinations.join(", ")}
						</div>

						{categoryPlan && categoryPlan.toCreate.length > 0 && (
							<div className="rounded-lg border border-warning-200 bg-warning-50 p-3">
								<p className="font-semibold text-warning-900">
									New categories detected — create these?
								</p>
								<div className="mt-2 space-y-1">
									{categoryPlan.toCreate.map((category) => (
										<label
											key={category.key}
											className="flex items-center gap-2 text-warning-900"
										>
											<input
												type="checkbox"
												checked={approvedKeys.has(category.key)}
												onChange={() => onToggleKey(category.key)}
											/>
											<span>
												{category.label}{" "}
												<span className="text-warning-700">
													({category.tags.map((t) => t.abbreviation).join("-")})
												</span>
											</span>
										</label>
									))}
								</div>
							</div>
						)}

						<ManifestRejectedRows
							parseResult={parseResult}
							categoryPlan={categoryPlan}
						/>
					</div>

					<div className="flex justify-end gap-2 border-t border-neutral-200 p-4">
						{showImport && (
							<button
								type="button"
								onClick={onImport}
								disabled={importPending || importDisabled}
								className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
							>
								{importPending ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : (
									`Import ${summary.items} items to this order`
								)}
							</button>
						)}
						<Dialog.Close asChild>
							<button
								type="button"
								className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
							>
								Done
							</button>
						</Dialog.Close>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
