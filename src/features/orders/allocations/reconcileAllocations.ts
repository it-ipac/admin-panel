import type { ManifestRow } from "@/components/clients/manifest/manifestParser";
import type {
	AllocationRow,
	CatalogItemOption,
	DestinationOption,
} from "../hooks/useOrderAllocations";

// Row destined to be ADDED (item+destination not currently on the order).
export interface ReconcileAddRow {
	itemNum: string;
	destCode: string;
	qty: number;
	/** Catalog id, or null when the item must be created first. */
	itemId: string | null;
	/** Destination id, or null when the code is not a known destination. */
	destinationId: string | null;
	description: string;
	reference: string;
	categoryRaw: string;
	isStandardBox: boolean;
}
// Existing allocation whose quantity differs from the file.
export interface ReconcileChangeRow {
	itemNum: string;
	destCode: string;
	currentQty: number;
	newQty: number;
	itemsDbId: string;
	destinationId: string;
	isStandardBox: boolean;
}
export interface ReconcileUnchangedRow {
	itemNum: string;
	destCode: string;
	qty: number;
}
export interface ReconcileMissingRow {
	itemNum: string;
	destCode: string;
	currentQty: number;
}
export interface ReconcileDiff {
	toAdd: ReconcileAddRow[];
	toChange: ReconcileChangeRow[];
	unchanged: ReconcileUnchangedRow[];
	missingFromFile: ReconcileMissingRow[];
}

const normKey = (v: string | null | undefined): string =>
	String(v ?? "")
		.trim()
		.toUpperCase();
const normDest = (v: string | null | undefined): string =>
	normKey(v) || "UNASSIGNED";

/**
 * Compare the dropped items file against the order's current allocations and split into
 * four buckets: items to add, quantity changes, unchanged, and allocations on the order
 * but absent from the file (shown, never deleted). Pure — no I/O.
 */
export function buildReconcileDiff(
	fileRows: ManifestRow[],
	currentAllocations: AllocationRow[],
	catalog: CatalogItemOption[],
	destinations: DestinationOption[],
): ReconcileDiff {
	// Aggregate file rows per (item, destination) — column-A quantity summed.
	const agg = new Map<
		string,
		{
			itemNum: string;
			destCode: string;
			qty: number;
			description: string;
			reference: string;
			categoryRaw: string;
			isStandardBox: boolean;
		}
	>();
	for (const r of fileRows) {
		const itemNum = String(r.item_num ?? "").trim();
		if (!itemNum) continue;
		const destCode = normDest(r.destination);
		const key = `${normKey(itemNum)}|${destCode}`;
		const qty = Number(r.expected_qty) || 0;
		const existing = agg.get(key);
		if (existing) {
			existing.qty += qty;
			existing.isStandardBox = existing.isStandardBox || !!r.is_standard_box;
			if (!existing.description && r.description)
				existing.description = r.description;
			if (!existing.reference && r.reference) existing.reference = r.reference;
			if (!existing.categoryRaw && r.category_raw)
				existing.categoryRaw = r.category_raw;
		} else {
			agg.set(key, {
				itemNum,
				destCode,
				qty,
				description: r.description || "",
				reference: r.reference || "",
				categoryRaw: r.category_raw || "",
				isStandardBox: !!r.is_standard_box,
			});
		}
	}

	const catalogByItem = new Map<string, CatalogItemOption>();
	for (const c of catalog) catalogByItem.set(normKey(c.item_num), c);
	const destByCode = new Map<string, DestinationOption>();
	for (const d of destinations) destByCode.set(normKey(d.code), d);

	const currentByKey = new Map<string, AllocationRow>();
	for (const a of currentAllocations) {
		const itemNum = a.items_db?.item_num;
		if (!itemNum) continue;
		currentByKey.set(
			`${normKey(itemNum)}|${normDest(a.destinations?.code)}`,
			a,
		);
	}

	const toAdd: ReconcileAddRow[] = [];
	const toChange: ReconcileChangeRow[] = [];
	const unchanged: ReconcileUnchangedRow[] = [];
	const fileKeys = new Set<string>();

	for (const [key, e] of agg) {
		fileKeys.add(key);
		const current = currentByKey.get(key);
		if (current) {
			if (Number(current.expected_qty) === e.qty) {
				unchanged.push({
					itemNum: e.itemNum,
					destCode: e.destCode,
					qty: e.qty,
				});
			} else {
				toChange.push({
					itemNum: e.itemNum,
					destCode: e.destCode,
					currentQty: Number(current.expected_qty),
					newQty: e.qty,
					itemsDbId: current.items_db_id,
					destinationId: current.destination_id,
					isStandardBox: e.isStandardBox,
				});
			}
		} else {
			const cat = catalogByItem.get(normKey(e.itemNum));
			const dest = destByCode.get(e.destCode);
			toAdd.push({
				itemNum: e.itemNum,
				destCode: e.destCode,
				qty: e.qty,
				itemId: cat?.id ?? null,
				destinationId: dest?.id ?? null,
				description: e.description,
				reference: e.reference,
				categoryRaw: e.categoryRaw,
				isStandardBox: e.isStandardBox,
			});
		}
	}

	const missingFromFile: ReconcileMissingRow[] = [];
	for (const [key, a] of currentByKey) {
		if (!fileKeys.has(key)) {
			missingFromFile.push({
				itemNum: a.items_db?.item_num || "—",
				destCode: normDest(a.destinations?.code),
				currentQty: Number(a.expected_qty),
			});
		}
	}

	return { toAdd, toChange, unchanged, missingFromFile };
}
