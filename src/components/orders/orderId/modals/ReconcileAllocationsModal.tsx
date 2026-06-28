import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import {
	CANONICAL_CATEGORIES,
	classifyManifestCategory,
} from "@/components/clients/manifest/manifestCategories";
import { parseManifestWorksheet } from "@/components/clients/manifest/manifestParser";
import { loadManifestWorksheet } from "@/components/clients/manifest/manifestWorkbook";
import {
	buildReconcileDiff,
	type ReconcileDiff,
} from "@/features/orders/allocations/reconcileAllocations";
import type {
	AllocationRow,
	CatalogItemOption,
	CategoryOption,
	DestinationOption,
} from "@/features/orders/hooks/useOrderAllocations";
import { db } from "@/lib/supabase";

interface ReconcileAllocationsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orderId: string;
	clientId: string | null | undefined;
	allocations: AllocationRow[];
	destinations: DestinationOption[];
	categories: CategoryOption[];
	catalog: CatalogItemOption[];
	onApplied: () => void;
}

const normLabel = (v: string | null | undefined): string =>
	(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const APPLY_CONCURRENCY = 15;

/** Reconcile an order's allocations against a re-dropped items file (qty from column A). */
export function ReconcileAllocationsModal({
	open,
	onOpenChange,
	orderId,
	clientId,
	allocations,
	destinations,
	categories,
	catalog,
	onApplied,
}: ReconcileAllocationsModalProps) {
	const [fileName, setFileName] = useState<string | null>(null);
	const [parsing, setParsing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [diff, setDiff] = useState<ReconcileDiff | null>(null);
	const [applying, setApplying] = useState(false);
	const [resultMsg, setResultMsg] = useState<string | null>(null);

	const reset = () => {
		setFileName(null);
		setParsing(false);
		setError(null);
		setDiff(null);
		setApplying(false);
		setResultMsg(null);
	};

	const handleFile = async (file: File) => {
		reset();
		setFileName(file.name);
		setParsing(true);
		try {
			const worksheet = await loadManifestWorksheet(file);
			if (!worksheet) {
				setError("Could not read any worksheet from this file.");
				return;
			}
			const parsed = parseManifestWorksheet(worksheet);
			if (!parsed.rows.length) {
				setError("No item rows found. Is this the items file?");
				return;
			}
			setDiff(
				buildReconcileDiff(parsed.rows, allocations, catalog, destinations),
			);
		} catch (e) {
			setError(
				`Failed to parse: ${(e as { message?: string })?.message || "error"}`,
			);
		} finally {
			setParsing(false);
		}
	};

	// Best-effort category for a brand-new item: classify the raw label, then match an
	// existing pkg_category by its canonical label. Null when unmatched (no creation).
	const resolveCategoryId = (raw: string): string | null => {
		const key = classifyManifestCategory(raw);
		if (!key) return null;
		const canonical = CANONICAL_CATEGORIES.find((c) => c.key === key);
		if (!canonical) return null;
		const want = normLabel(canonical.label);
		return categories.find((c) => normLabel(c.label) === want)?.id ?? null;
	};

	const runChunked = async <T,>(
		items: T[],
		task: (item: T) => Promise<"ok" | "skip">,
	): Promise<{ ok: number; skipped: number; failed: number }> => {
		let ok = 0;
		let skipped = 0;
		let failed = 0;
		for (let i = 0; i < items.length; i += APPLY_CONCURRENCY) {
			const chunk = items.slice(i, i + APPLY_CONCURRENCY);
			const results = await Promise.all(
				chunk.map((item) => task(item).catch(() => "fail" as const)),
			);
			for (const r of results) {
				if (r === "ok") ok += 1;
				else if (r === "skip") skipped += 1;
				else failed += 1;
			}
		}
		return { ok, skipped, failed };
	};

	const handleApply = async () => {
		if (!diff || !clientId) return;
		setApplying(true);
		setError(null);
		try {
			// 1. Create brand-new catalog items ONCE per item number (sequential, so the
			// same new item going to two destinations can't double-insert / hit the
			// (client_id, item_num) unique constraint).
			const newItemNums = Array.from(
				new Set(
					diff.toAdd
						.filter((r) => r.destinationId && !r.itemId)
						.map((r) => r.itemNum),
				),
			);
			const createdIdByItem = new Map<string, string>();
			for (const itemNum of newItemNums) {
				const sample = diff.toAdd.find((r) => r.itemNum === itemNum);
				try {
					const { data, error: e } = await db.createCatalogItem({
						clientId,
						itemNum,
						description: sample?.description || "",
						categoryId: resolveCategoryId(sample?.categoryRaw || ""),
					});
					if (e) throw e;
					const id = (data as { id?: string } | null)?.id;
					if (id) createdIdByItem.set(itemNum, id);
				} catch {
					// Tolerant: one bad item must not abort the whole reconcile. The dependent
					// add row gets counted as failed below.
				}
			}

			// 2. Apply quantity changes + adds (items now all exist) — concurrent in chunks.
			const changes = await runChunked(diff.toChange, async (row) => {
				const { error: e } = await db.upsertOrderItemAllocation({
					orderId,
					itemsDbId: row.itemsDbId,
					destinationId: row.destinationId,
					expected: row.newQty,
					isStandardBox: row.isStandardBox,
				});
				if (e) throw e;
				return "ok";
			});

			const adds = await runChunked(diff.toAdd, async (row) => {
				if (!row.destinationId) return "skip"; // unknown destination — cannot allocate
				const itemId = row.itemId ?? createdIdByItem.get(row.itemNum) ?? null;
				if (!itemId) throw new Error("item could not be created"); // → counted as failed
				const { error: e2 } = await db.upsertOrderItemAllocation({
					orderId,
					itemsDbId: itemId,
					destinationId: row.destinationId,
					expected: row.qty,
					isStandardBox: row.isStandardBox,
				});
				if (e2) throw e2;
				return "ok";
			});

			onApplied();
			const failedTotal = changes.failed + adds.failed;
			const parts = [
				`${changes.ok} updated`,
				`${adds.ok} added`,
				adds.skipped > 0
					? `${adds.skipped} skipped (unknown destination)`
					: null,
				failedTotal > 0 ? `${failedTotal} failed` : null,
			].filter(Boolean);
			setResultMsg(
				failedTotal > 0
					? `${parts.join(" · ")} — re-drop the file to retry the failed rows.`
					: parts.join(" · "),
			);
			setDiff(null);
		} catch (e) {
			setError((e as { message?: string })?.message || "Reconcile failed.");
		} finally {
			setApplying(false);
		}
	};

	const unresolvedDest = diff
		? diff.toAdd.filter((r) => !r.destinationId).length
		: 0;

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(o) => {
				if (!o) reset();
				onOpenChange(o);
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
					<Dialog.Title className="text-lg font-semibold text-neutral-900 mb-1">
						Reconcile items from Excel
					</Dialog.Title>
					<Dialog.Description className="text-xs text-neutral-500 mb-4">
						Drop the corrected items file — quantity is read from column A.
						Matching items have their expected updated; new items are added;
						nothing is deleted.
					</Dialog.Description>

					<label className="flex items-center justify-center gap-2 border-2 border-dashed border-neutral-300 rounded-lg py-6 cursor-pointer hover:border-primary-400 text-sm text-neutral-600">
						<Upload className="w-4 h-4" />
						{fileName
							? `Re-pick file (${fileName})`
							: "Choose items Excel (.xlsx / .csv)"}
						<input
							type="file"
							accept=".xlsx,.xlsm,.xls,.xlsb,.csv"
							className="hidden"
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) void handleFile(f);
								e.target.value = "";
							}}
						/>
					</label>

					{parsing && (
						<p className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
							<Loader2 className="w-4 h-4 animate-spin" /> Parsing…
						</p>
					)}
					{error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
					{resultMsg && (
						<p className="mt-3 text-sm text-success-700">Done — {resultMsg}.</p>
					)}

					{diff && (
						<div className="mt-4 space-y-3">
							<DiffSection
								title="New items (will be added)"
								tone="success"
								count={diff.toAdd.length}
								rows={diff.toAdd.map((r) => ({
									key: `${r.itemNum}|${r.destCode}`,
									left: `${r.itemNum} → ${r.destCode}`,
									right: `qty ${r.qty}${r.destinationId ? "" : " · ⚠ unknown destination"}`,
								}))}
							/>
							<DiffSection
								title="Quantity changes"
								tone="warning"
								count={diff.toChange.length}
								rows={diff.toChange.map((r) => ({
									key: `${r.itemNum}|${r.destCode}`,
									left: `${r.itemNum} → ${r.destCode}`,
									right: `${r.currentQty} → ${r.newQty}`,
								}))}
							/>
							<DiffSection
								title="Unchanged"
								tone="neutral"
								count={diff.unchanged.length}
								rows={diff.unchanged.map((r) => ({
									key: `${r.itemNum}|${r.destCode}`,
									left: `${r.itemNum} → ${r.destCode}`,
									right: `qty ${r.qty}`,
								}))}
							/>
							<DiffSection
								title="On the order but not in the file (kept as-is)"
								tone="neutral"
								count={diff.missingFromFile.length}
								rows={diff.missingFromFile.map((r) => ({
									key: `${r.itemNum}|${r.destCode}`,
									left: `${r.itemNum} → ${r.destCode}`,
									right: `qty ${r.currentQty}`,
								}))}
							/>
							{unresolvedDest > 0 && (
								<p className="text-xs text-warning-700">
									{unresolvedDest} new row(s) have a destination not in the
									destinations list — they will be skipped.
								</p>
							)}
						</div>
					)}

					<div className="flex justify-end gap-2 mt-6">
						<Dialog.Close asChild>
							<button
								type="button"
								className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg"
							>
								Close
							</button>
						</Dialog.Close>
						{diff && (diff.toAdd.length > 0 || diff.toChange.length > 0) && (
							<button
								type="button"
								onClick={handleApply}
								disabled={applying}
								className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
							>
								{applying && <Loader2 className="w-4 h-4 animate-spin" />}
								Apply ({diff.toChange.length} update, {diff.toAdd.length} add)
							</button>
						)}
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

const TONE: Record<string, string> = {
	success: "text-success-700",
	warning: "text-warning-700",
	neutral: "text-neutral-600",
};

function DiffSection({
	title,
	tone,
	count,
	rows,
}: {
	title: string;
	tone: string;
	count: number;
	rows: { key: string; left: string; right: string }[];
}) {
	return (
		<div className="border border-neutral-200 rounded-lg">
			<div className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-t-lg">
				<span className={`text-sm font-medium ${TONE[tone] || TONE.neutral}`}>
					{title}
				</span>
				<span className="text-xs font-bold text-neutral-500">{count}</span>
			</div>
			{count > 0 && (
				<div className="max-h-40 overflow-auto divide-y divide-neutral-50">
					{rows.map((r) => (
						<div
							key={r.key}
							className="flex items-center justify-between px-3 py-1.5 text-xs"
						>
							<span className="text-neutral-700 truncate mr-2">{r.left}</span>
							<span className="text-neutral-500 whitespace-nowrap tabular-nums">
								{r.right}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
