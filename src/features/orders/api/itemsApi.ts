import { supabase } from "@/lib/supabase";
import type { PackageInstance, PackageItem, TagTaxonomy } from "../types";
import { queryRowsInChunks, queryRowsInChunksPaged } from "../utils/chunked";
import { fetchOrderPackageIds } from "./common";

/** Fetches package_items for all packages in an order. */
export async function fetchPackageItems(
	orderId: string,
): Promise<PackageItem[]> {
	const packageIds = await fetchOrderPackageIds(orderId);
	if (packageIds.length === 0) return [];

	const data = await queryRowsInChunksPaged<PackageItem>(
		packageIds,
		(chunk, from, to) =>
			supabase
				.from("package_items")
				.select(
					"id, order_package_id, quantity, designation, length, width, height, instance_number, warehouse_location, item_num, items_db_id, reference",
				)
				.in("order_package_id", chunk)
				.order("id", { ascending: true })
				.range(from, to),
	);

	return data as PackageItem[];
}

/** Fetches the client inventory (items_db) narrowed to consumed columns. */
export async function fetchClientInventory(
	clientId: string | undefined,
): Promise<any[]> {
	if (!clientId) return [];
	// Narrowed to fields actually consumed (dropdowns, dimension
	// matching, availability calc) — items_db is a wide table
	const { data, error } = await supabase
		.from("items_db")
		.select(
			"id, item_num, description, warehouse_location, expected_qty, packed_qty, length, width, height",
		)
		.eq("client_id", clientId)
		.order("item_num");
	if (error) throw error;
	return data;
}

/** Fetches all pkg_category rows for a client. */
export async function fetchClientCategories(
	clientId: string | undefined,
): Promise<any[]> {
	if (!clientId) return [];
	const { data, error } = await supabase
		.from("pkg_category")
		.select("*")
		.eq("client_id", clientId)
		.order("label");
	if (error) throw error;
	return data;
}

/**
 * Builds the leveled tag taxonomy for a client: project tags grouped by their
 * level (= category_tag_map.tag_order) and each category resolved to its tag-id
 * set. The order-detail Tag picker uses the levels for grouping and the
 * categories to keep `category_id` in sync with the tags chosen.
 */
export async function fetchClientTagTaxonomy(
	clientId: string | undefined,
): Promise<TagTaxonomy> {
	const empty: TagTaxonomy = { levels: [], categories: [] };
	if (!clientId) return empty;

	const [{ data: tags, error: tagErr }, { data: cats, error: catErr }] =
		await Promise.all([
			supabase
				.from("project_tags")
				.select("id, name")
				.eq("client_id", clientId)
				.order("name"),
			supabase
				.from("pkg_category")
				.select("id, label")
				.eq("client_id", clientId)
				.order("label"),
		]);
	if (tagErr) throw tagErr;
	if (catErr) throw catErr;

	const tagName = new Map<string, string>();
	for (const t of (tags || []) as { id: string; name: string }[]) {
		tagName.set(t.id, t.name);
	}

	const categoryIds = ((cats || []) as { id: string }[]).map((c) => c.id);
	const maps =
		categoryIds.length > 0
			? await queryRowsInChunks<{
					category_id: string;
					tag_id: string;
					tag_order: number | null;
				}>(categoryIds, (chunk) =>
					supabase
						.from("category_tag_map")
						.select("category_id, tag_id, tag_order")
						.in("category_id", chunk),
				)
			: [];

	// A tag's level = the smallest tag_order it is assigned across categories.
	const tagLevel = new Map<string, number>();
	const categoryTagIds = new Map<string, string[]>();
	for (const m of maps) {
		const order = m.tag_order ?? 0;
		const prev = tagLevel.get(m.tag_id);
		if (prev === undefined || order < prev) tagLevel.set(m.tag_id, order);
		const list = categoryTagIds.get(m.category_id) ?? [];
		list.push(m.tag_id);
		categoryTagIds.set(m.category_id, list);
	}

	const byLevel = new Map<number, { id: string; name: string }[]>();
	for (const [tagId, level] of tagLevel) {
		const name = tagName.get(tagId);
		if (!name) continue;
		const list = byLevel.get(level) ?? [];
		list.push({ id: tagId, name });
		byLevel.set(level, list);
	}

	const levels = Array.from(byLevel.entries())
		.sort(([a], [b]) => a - b)
		.map(([level, levelTags]) => ({
			level,
			tags: levelTags.sort((a, b) => a.name.localeCompare(b.name)),
		}));

	const categories = ((cats || []) as { id: string; label: string }[]).map(
		(c) => ({
			id: c.id,
			label: c.label,
			tagIds: (categoryTagIds.get(c.id) ?? []).slice().sort(),
		}),
	);

	return { levels, categories };
}

/** Fetches category ids mapped to an order. */
export async function fetchOrderCategories(orderId: string): Promise<string[]> {
	const { data, error } = await supabase
		.from("category_order_map")
		.select("category_id")
		.eq("order_id", orderId);
	if (error) throw error;
	return data.map((d: any) => d.category_id);
}

/** Fetches pkd_items (inventory items) for all instances in an order. */
export async function fetchPkdItems(orderId: string): Promise<any[]> {
	const packageIds = await fetchOrderPackageIds(orderId);
	if (packageIds.length === 0) return [];

	const instances = await queryRowsInChunks<{ id: string }>(
		packageIds,
		(chunk) =>
			supabase
				.from("order_pkg_instance")
				.select("id")
				.in("order_package_id", chunk),
	);

	if (instances.length === 0) return [];

	const instanceIds = instances.map((i) => i.id);

	const data = await queryRowsInChunksPaged<any>(
		instanceIds,
		(chunk, from, to) =>
			supabase
				.from("pkd_item")
				.select("*, items_db:maintenance_db_id(*)")
				.in("pkg_instance_id", chunk)
				.order("id", { ascending: true })
				.range(from, to),
	);

	return data;
}

/** Fetches package instances for all packages in an order. */
export async function fetchPackageInstances(
	orderId: string,
): Promise<PackageInstance[]> {
	const packageIds = await fetchOrderPackageIds(orderId);
	if (packageIds.length === 0) return [];

	const rows = await queryRowsInChunksPaged<PackageInstance>(
		packageIds,
		(chunk, from, to) =>
			supabase
				.from("order_pkg_instance")
				.select(
					"id, order_pkg_overview_id, order_package_id, instance_number, ipac_reference, status, destination, tag, category_id",
				)
				.in("order_package_id", chunk)
				.order("instance_number", { ascending: true })
				.order("id", { ascending: true })
				.range(from, to),
	);

	return rows;
}
