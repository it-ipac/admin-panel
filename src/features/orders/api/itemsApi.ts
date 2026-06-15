import { supabase } from "@/lib/supabase";
import type { PackageInstance, PackageItem } from "../types";
import { queryRowsInChunks } from "../utils/chunked";
import { fetchOrderPackageIds } from "./common";

/** Fetches package_items for all packages in an order. */
export async function fetchPackageItems(
	orderId: string,
): Promise<PackageItem[]> {
	const packageIds = await fetchOrderPackageIds(orderId);
	if (packageIds.length === 0) return [];

	const data = await queryRowsInChunks<PackageItem>(packageIds, (chunk) =>
		supabase
			.from("package_items")
			.select(
				"id, order_package_id, quantity, designation, length, width, height, instance_number, warehouse_location, item_num, items_db_id, reference",
			)
			.in("order_package_id", chunk),
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

	const { data: instances, error: instError } = await supabase
		.from("order_pkg_instance")
		.select("id")
		.in("order_package_id", packageIds);

	if (instError) throw instError;
	if (!instances || instances.length === 0) return [];

	const instanceIds = instances.map((i) => i.id);

	const data = await queryRowsInChunks<any>(instanceIds, (chunk) =>
		supabase
			.from("pkd_item")
			.select("*, items_db:maintenance_db_id(*)")
			.in("pkg_instance_id", chunk),
	);

	return data;
}

/** Fetches package instances for all packages in an order. */
export async function fetchPackageInstances(
	orderId: string,
): Promise<PackageInstance[]> {
	const packageIds = await fetchOrderPackageIds(orderId);
	if (packageIds.length === 0) return [];

	const rows = await queryRowsInChunks<PackageInstance>(packageIds, (chunk) =>
		supabase
			.from("order_pkg_instance")
			.select(
				"id, order_pkg_overview_id, order_package_id, instance_number, ipac_reference, status, destination, tag, category_id",
			)
			.in("order_package_id", chunk)
			.order("instance_number", { ascending: true }),
	);

	return rows;
}
