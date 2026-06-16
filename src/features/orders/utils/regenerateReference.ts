import { generateIpacReference } from "@/components/orders/create/orderCreate/utils";
import { supabase } from "@/lib/supabase";
import { buildTagAbbreviation, buildTagTokens } from "./references";

/**
 * Rebuilds and persists an instance's `ipac_reference` (and its `tag` sort
 * tokens) from the box's destination + category. Standard vs custom is detected
 * by the presence of pkd_item rows. The instance UUID and its QR token are never
 * touched. Returns the new reference.
 *
 * Shared by the per-instance regenerate, the bulk regenerate, and the move-box
 * flow so the three can never diverge.
 */
export async function regenerateReferenceForInstance(
	instanceId: string,
): Promise<string> {
	const { data: instance, error: instError } = await supabase
		.from("order_pkg_instance")
		.select("id, destination, instance_number, category_id")
		.eq("id", instanceId)
		.single();
	if (instError) throw instError;

	const { data: pkdItems, error: pkdError } = await supabase
		.from("pkd_item")
		.select("quantity, items_db:maintenance_db_id(item_num, category_id)")
		.eq("pkg_instance_id", instanceId)
		.limit(1);
	if (pkdError) throw pkdError;

	const pkdItem = pkdItems?.[0];
	const itemsDb: any = Array.isArray(pkdItem?.items_db)
		? pkdItem.items_db[0]
		: pkdItem?.items_db;
	const isCustom = !!pkdItem;

	const categoryId =
		(instance as any).category_id || itemsDb?.category_id || null;
	const tag = await buildTagAbbreviation(categoryId);
	const tagTokens = await buildTagTokens(categoryId);

	const destination = String(
		(instance as any).destination || "XXX",
	).toUpperCase();
	const seq = (instance as any).instance_number || 1;

	const reference = isCustom
		? generateIpacReference({
				destination,
				tag,
				isCustom: true,
				boxNumber: seq,
				itemNumber: String(itemsDb?.item_num || "ITEM"),
				quantity: seq,
			})
		: generateIpacReference({
				destination,
				tag,
				isCustom: false,
				boxNumber: seq,
			});

	const updates: { ipac_reference: string; tag?: string } = {
		ipac_reference: reference,
	};
	if (tagTokens) updates.tag = tagTokens;

	const { error: updateError } = await supabase
		.from("order_pkg_instance")
		.update(updates)
		.eq("id", instanceId);
	if (updateError) throw updateError;

	return reference;
}
