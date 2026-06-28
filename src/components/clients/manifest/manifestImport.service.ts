// Write path for the TAQA items-manifest import.
// Service layer: all Supabase calls live here, no UI imports.
//
// Sequence (run after the user has approved any new categories):
//   1. ensure approved tags + categories exist (project_tags / pkg_category / category_tag_map)
//   2. ensure destinations exist (destinations lookup)
//   3. upsert catalog rows into items_db (by client_id,item_num), ACCUMULATING expected_qty
//   4. write per-(order,item,destination) rows into order_item_allocation
//
// Quantity model:
//   - order_item_allocation holds this order's expected per (item, destination).
//   - items_db.expected_qty is the running total across ALL orders. Each import adjusts
//     it by a DELTA = (new total for this order) − (this order's previous total), so
//     re-importing the same dump to the same order is a no-op (idempotent), while a new
//     order's quantities accumulate. packed_qty is never written here (packing owns it).

import { supabase } from "../../../lib/supabase";
import type { CanonicalCategory } from "./manifestCategories";
import type { ManifestRow } from "./manifestParser";

const UNASSIGNED_CODE = "UNASSIGNED";
const CHUNK_SIZE = 500;

export interface ManifestImportInput {
	clientId: string;
	orderId: string;
	rows: ManifestRow[];
	/** Canonical categories the user approved for creation. */
	categoriesToCreate: CanonicalCategory[];
	/** Resolved category id by raw category string (existing matches). */
	categoryIdByRaw: Record<string, string | null>;
	/** Canonical key by raw category string (for newly-created categories). */
	keyByRaw: Record<string, string | null>;
}

export interface ManifestImportSummary {
	tagsCreated: number;
	categoriesCreated: number;
	destinationsCreated: number;
	itemsUpserted: number;
	allocationsWritten: number;
}

interface ExistingItem {
	id: string;
	description: string | null;
	expected_qty: number;
}

const chunk = <T>(items: T[], size: number): T[][] => {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size)
		out.push(items.slice(i, i + size));
	return out;
};

const cleanDestinationCode = (code: string): string =>
	(code || "")
		.replace(/[\r\n\t]+/g, "")
		.trim()
		.toUpperCase();

/** Ensure project_tags rows exist for the given names; returns name -> id. */
const ensureTags = async (
	clientId: string,
	tags: Array<{ name: string; abbreviation: string }>,
): Promise<{ idByName: Map<string, string>; created: number }> => {
	const idByName = new Map<string, string>();
	const { data: existing, error } = await supabase
		.from("project_tags")
		.select("id, name")
		.eq("client_id", clientId);
	if (error) throw error;
	for (const row of (existing || []) as Array<{ id: string; name: string }>) {
		idByName.set(row.name.toLowerCase().trim(), row.id);
	}

	const missing = tags.filter(
		(t) => !idByName.has(t.name.toLowerCase().trim()),
	);
	let created = 0;
	if (missing.length) {
		const { data: inserted, error: insertError } = await supabase
			.from("project_tags")
			.insert(
				missing.map((t) => ({
					client_id: clientId,
					name: t.name,
					abbreviation: t.abbreviation,
				})),
			)
			.select("id, name");
		if (insertError) throw insertError;
		for (const row of (inserted || []) as Array<{ id: string; name: string }>) {
			idByName.set(row.name.toLowerCase().trim(), row.id);
			created += 1;
		}
	}
	return { idByName, created };
};

/** Create approved categories + their tag maps; returns canonicalKey -> categoryId. */
const ensureCategories = async (
	clientId: string,
	categoriesToCreate: CanonicalCategory[],
): Promise<{
	idByKey: Map<string, string>;
	tagsCreated: number;
	categoriesCreated: number;
}> => {
	const idByKey = new Map<string, string>();
	if (!categoriesToCreate.length) {
		return { idByKey, tagsCreated: 0, categoriesCreated: 0 };
	}

	const allTags = categoriesToCreate.flatMap((c) => c.tags);
	const { idByName, created: tagsCreated } = await ensureTags(
		clientId,
		allTags,
	);

	let categoriesCreated = 0;
	for (const category of categoriesToCreate) {
		const { data: insertedCategory, error: categoryError } = await supabase
			.from("pkg_category")
			.insert({ client_id: clientId, label: category.label })
			.select("id")
			.single();
		if (categoryError) throw categoryError;
		const categoryId = (insertedCategory as { id: string }).id;
		idByKey.set(category.key, categoryId);
		categoriesCreated += 1;

		const mapRows = category.tags.map((tag, index) => ({
			category_id: categoryId,
			tag_id: idByName.get(tag.name.toLowerCase().trim()),
			tag_order: index + 1,
		}));
		const { error: mapError } = await supabase
			.from("category_tag_map")
			.insert(mapRows);
		if (mapError) throw mapError;
	}

	return { idByKey, tagsCreated, categoriesCreated };
};

/** Ensure destinations exist for all codes used; returns code -> id ('' maps to UNASSIGNED). */
const ensureDestinations = async (
	codes: string[],
): Promise<{ idByCode: Map<string, string>; created: number }> => {
	const wanted = new Set<string>();
	for (const code of codes)
		wanted.add(cleanDestinationCode(code) || UNASSIGNED_CODE);
	wanted.add(UNASSIGNED_CODE);

	const idByCode = new Map<string, string>();
	const { data: existing, error } = await supabase
		.from("destinations")
		.select("id, code");
	if (error) throw error;
	for (const row of (existing || []) as Array<{ id: string; code: string }>) {
		idByCode.set(row.code.toUpperCase(), row.id);
	}

	const missing = Array.from(wanted).filter((code) => !idByCode.has(code));
	let created = 0;
	if (missing.length) {
		const { data: inserted, error: insertError } = await supabase
			.from("destinations")
			.insert(missing.map((code) => ({ code })))
			.select("id, code");
		if (insertError) throw insertError;
		for (const row of (inserted || []) as Array<{ id: string; code: string }>) {
			idByCode.set(row.code.toUpperCase(), row.id);
			created += 1;
		}
	}
	return { idByCode, created };
};

/** Aggregate dump rows per item_num: representative descriptive fields + this file's total. */
interface ItemAggregate {
	rep: ManifestRow;
	newOrderTotal: number;
}
const aggregateByItem = (rows: ManifestRow[]): Map<string, ItemAggregate> => {
	const byItem = new Map<string, ItemAggregate>();
	for (const row of rows) {
		const entry = byItem.get(row.item_num);
		if (entry) {
			entry.newOrderTotal += row.expected_qty;
			if (!entry.rep.description && row.description)
				entry.rep.description = row.description;
			if (entry.rep.length === null && row.length !== null)
				entry.rep.length = row.length;
			if (entry.rep.width === null && row.width !== null)
				entry.rep.width = row.width;
			if (entry.rep.height === null && row.height !== null)
				entry.rep.height = row.height;
			if (!entry.rep.reference && row.reference)
				entry.rep.reference = row.reference;
		} else {
			byItem.set(row.item_num, {
				rep: { ...row },
				newOrderTotal: row.expected_qty,
			});
		}
	}
	return byItem;
};

const fetchExistingItems = async (
	clientId: string,
): Promise<Map<string, ExistingItem>> => {
	const { data, error } = await supabase
		.from("items_db")
		.select("id, item_num, description, expected_qty")
		.eq("client_id", clientId);
	if (error) throw error;
	const map = new Map<string, ExistingItem>();
	for (const row of (data || []) as Array<{
		id: string;
		item_num: string | null;
		description: string | null;
		expected_qty: number | null;
	}>) {
		if (row.item_num) {
			map.set(row.item_num, {
				id: row.id,
				description: row.description,
				expected_qty: Number(row.expected_qty || 0),
			});
		}
	}
	return map;
};

/**
 * Upsert one items_db row per distinct item_num — DESCRIPTIVE fields only. expected_qty is
 * owned by the allocation reconcile RPC, so existing items keep their running total and new
 * items default to 0. Preserves existing descriptions; never writes packed_qty.
 */
const upsertItems = async (
	clientId: string,
	byItem: Map<string, ItemAggregate>,
	existingByNum: Map<string, ExistingItem>,
	categoryIdByItemNum: Map<string, string | null>,
): Promise<{ idByItemNum: Map<string, string>; upserted: number }> => {
	const payloads = Array.from(byItem.entries()).map(([itemNum, { rep }]) => {
		const existing = existingByNum.get(itemNum);
		const description =
			(existing?.description && existing.description.trim()) ||
			rep.description ||
			null;
		return {
			client_id: clientId,
			item_num: itemNum,
			description,
			reference: rep.reference || null,
			length: rep.length,
			width: rep.width,
			height: rep.height,
			category_id: categoryIdByItemNum.get(itemNum) ?? null,
		};
	});

	const idByItemNum = new Map<string, string>();
	let upserted = 0;
	for (const part of chunk(payloads, CHUNK_SIZE)) {
		const { data, error } = await supabase
			.from("items_db")
			.upsert(part, {
				onConflict: "client_id,item_num",
				ignoreDuplicates: false,
			})
			.select("id, item_num");
		if (error) throw error;
		for (const row of (data || []) as Array<{ id: string; item_num: string }>) {
			idByItemNum.set(row.item_num, row.id);
		}
		upserted += part.length;
	}
	return { idByItemNum, upserted };
};

/**
 * Reconcile an order's allocations atomically via RPC: applies the per-item expected_qty
 * delta (new total for this order − its previous total), DELETES rows that vanished, and
 * upserts the rest — all in one DB transaction. Idempotent per (order, dump): re-running is
 * a no-op, a corrected re-dump (dropped/moved items) self-corrects, packed_qty is untouched.
 * Aggregates per (item, destination).
 */
const reconcileOrderAllocations = async (
	orderId: string,
	rows: ManifestRow[],
	idByItemNum: Map<string, string>,
	idByDestCode: Map<string, string>,
): Promise<number> => {
	interface Alloc {
		items_db_id: string;
		destination_id: string;
		expected_qty: number;
		packing_type: string | null;
		is_standard_box: boolean;
		category_tag: string | null;
	}
	const byKey = new Map<string, Alloc>();

	for (const row of rows) {
		const itemId = idByItemNum.get(row.item_num);
		const destId = idByDestCode.get(
			cleanDestinationCode(row.destination) || UNASSIGNED_CODE,
		);
		if (!itemId || !destId) continue;

		const key = `${itemId}|${destId}`;
		const existing = byKey.get(key);
		if (existing) {
			existing.expected_qty += row.expected_qty;
			existing.is_standard_box =
				existing.is_standard_box || row.is_standard_box;
			if (!existing.packing_type && row.packing_raw)
				existing.packing_type = row.packing_raw;
		} else {
			byKey.set(key, {
				items_db_id: itemId,
				destination_id: destId,
				expected_qty: row.expected_qty,
				packing_type: row.packing_raw || null,
				is_standard_box: row.is_standard_box,
				category_tag: row.category_raw || null,
			});
		}
	}

	const allocations = Array.from(byKey.values());
	const { error } = await supabase.rpc("apply_order_item_allocations", {
		p_order_id: orderId,
		p_allocations: allocations,
	});
	if (error) throw error;
	return allocations.length;
};

const resolveCategoryIdByItemNum = (
	rows: ManifestRow[],
	categoryIdByRaw: Record<string, string | null>,
	keyByRaw: Record<string, string | null>,
	createdIdByKey: Map<string, string>,
): Map<string, string | null> => {
	const map = new Map<string, string | null>();
	for (const row of rows) {
		if (map.has(row.item_num)) continue;
		const existing = categoryIdByRaw[row.category_raw];
		if (existing) {
			map.set(row.item_num, existing);
			continue;
		}
		const key = keyByRaw[row.category_raw] ?? null;
		map.set(row.item_num, (key && createdIdByKey.get(key)) || null);
	}
	return map;
};

export interface ManifestCatalogResult {
	idByItemNum: Map<string, string>;
	idByCode: Map<string, string>;
	tagsCreated: number;
	categoriesCreated: number;
	destinationsCreated: number;
	itemsUpserted: number;
}

/**
 * Step 1: create approved categories/tags + destinations and upsert the catalog into
 * items_db (DESCRIPTIVE fields only — no quantity change, so it is idempotent and safe to
 * run before the order exists, even across a failed-submit retry). Returns the id maps
 * needed to reconcile allocations afterwards.
 */
export const loadCatalogFromManifest = async (
	input: Omit<ManifestImportInput, "orderId">,
): Promise<ManifestCatalogResult> => {
	const { clientId, rows, categoriesToCreate, categoryIdByRaw, keyByRaw } =
		input;

	const { idByKey, tagsCreated, categoriesCreated } = await ensureCategories(
		clientId,
		categoriesToCreate,
	);
	const { idByCode, created: destinationsCreated } = await ensureDestinations(
		rows.map((r) => r.destination),
	);
	const categoryIdByItemNum = resolveCategoryIdByItemNum(
		rows,
		categoryIdByRaw,
		keyByRaw,
		idByKey,
	);
	const byItem = aggregateByItem(rows);
	const existingByNum = await fetchExistingItems(clientId);
	const { idByItemNum, upserted } = await upsertItems(
		clientId,
		byItem,
		existingByNum,
		categoryIdByItemNum,
	);

	return {
		idByItemNum,
		idByCode,
		tagsCreated,
		categoriesCreated,
		destinationsCreated,
		itemsUpserted: upserted,
	};
};

/** Step 2: reconcile the order's allocations (atomic; applies the expected_qty delta). */
export const writeAllocationsForOrder = async (
	orderId: string,
	rows: ManifestRow[],
	idByItemNum: Map<string, string>,
	idByCode: Map<string, string>,
): Promise<number> =>
	reconcileOrderAllocations(orderId, rows, idByItemNum, idByCode);

/** Convenience for the order-page path, where the order already exists. */
export const runManifestImport = async (
	input: ManifestImportInput,
): Promise<ManifestImportSummary> => {
	const catalog = await loadCatalogFromManifest(input);
	const allocationsWritten = await writeAllocationsForOrder(
		input.orderId,
		input.rows,
		catalog.idByItemNum,
		catalog.idByCode,
	);
	return {
		tagsCreated: catalog.tagsCreated,
		categoriesCreated: catalog.categoriesCreated,
		destinationsCreated: catalog.destinationsCreated,
		itemsUpserted: catalog.itemsUpserted,
		allocationsWritten,
	};
};
