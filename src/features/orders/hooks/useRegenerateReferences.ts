import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { generateIpacReference } from "@/components/orders/create/orderCreate/utils";
import { supabase } from "@/lib/supabase";
import { buildTagAbbreviation } from "../utils/references";

/**
 * Bulk "Regenerate Custom Box References": loops through all custom
 * instances of the order, re-derives destination + tag + reference and
 * persists them. Tracks updated instance ids for row highlighting.
 */
export function useRegenerateReferences(orderId: string) {
	const queryClient = useQueryClient();
	const [regeneratingReferences, setRegeneratingReferences] = useState(false);
	// Tracks instance IDs updated by bulk regen — drives green row highlights in PackageInfoTab
	const [updatedInstanceIds, setUpdatedInstanceIds] = useState<Set<string>>(
		new Set(),
	);

	const handleRegenerateReferences = async (): Promise<void> => {
		setRegeneratingReferences(true);
		try {
			// Fetch all custom instances (pkd_item!inner excludes standard boxes)
			// Includes: destination + category_id from instance, item_num + category_id from items_db
			const { data: instances, error } = await supabase
				.from("order_pkg_instance")
				.select(`
					id,
					destination,
					instance_number,
					category_id,
					order_package_id,
					order_package:order_package_id!inner (
						order_id
					),
					pkd_item:pkd_item!inner (
						quantity,
						items_db:maintenance_db_id (
							item_num,
							category_id,
							warehouse_location
						)
					)
				`)
				.eq("order_package.order_id", orderId);

			if (error) {
				console.error("Error fetching instances:", error);
				alert(
					`Failed to fetch instances for regeneration: ${error.message || ""}`,
				);
				return;
			}

			if (!instances || instances.length === 0) {
				alert("No custom instances found to update.");
				return;
			}

			// Group by order_package_id for per-box green highlight progress
			const byPackage = new Map<string, typeof instances>();
			for (const inst of instances) {
				const pkgId = (inst as any).order_package_id;
				if (!byPackage.has(pkgId)) byPackage.set(pkgId, []);
				byPackage.get(pkgId)!.push(inst);
			}

			let totalUpdated = 0;

			for (const [, pkgInstances] of byPackage) {
				const updates = await Promise.all(
					pkgInstances.map(async (inst: any) => {
						const pkdItem = Array.isArray(inst.pkd_item)
							? inst.pkd_item[0]
							: inst.pkd_item;
						const itemsDb: any = Array.isArray(pkdItem?.items_db)
							? pkdItem.items_db[0]
							: pkdItem?.items_db;

						// Use instance.destination; fall back to warehouse_location
						const destination = String(
							inst.destination || itemsDb?.warehouse_location || "XXX",
						).toUpperCase();

						// Use instance category override; fall back to items_db category
						const categoryId = inst.category_id || itemsDb?.category_id || null;
						const tag = await buildTagAbbreviation(categoryId);

						const itemNum = String(itemsDb?.item_num || "ITEM");
						const seq = inst.instance_number || 1;

						const newReference = generateIpacReference({
							destination,
							tag,
							isCustom: true,
							boxNumber: seq,
							itemNumber: itemNum,
							quantity: seq,
						});

						return {
							id: inst.id,
							destination,
							ipac_reference: newReference,
						};
					}),
				);

				// Persist this box's instances
				await Promise.all(
					updates.map((u) =>
						supabase
							.from("order_pkg_instance")
							.update({
								destination: u.destination,
								ipac_reference: u.ipac_reference,
							})
							.eq("id", u.id),
					),
				);

				// Mark these instances done → rows turn green
				const doneIds = new Set(updates.map((u) => u.id));
				setUpdatedInstanceIds((prev) => new Set([...prev, ...doneIds]));
				totalUpdated += updates.length;
			}

			queryClient.invalidateQueries({
				queryKey: ["packageInstances", orderId],
			});
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
			alert(`Successfully updated ${totalUpdated} custom instances!`);
		} catch (error) {
			console.error("Error regenerating references:", error);
			alert("An unexpected error occurred while regenerating references.");
		} finally {
			setRegeneratingReferences(false);
		}
	};

	return {
		regeneratingReferences,
		updatedInstanceIds,
		handleRegenerateReferences,
	};
}
