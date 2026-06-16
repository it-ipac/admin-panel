import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PackageInstance } from "../types";
import { regenerateReferenceForInstance } from "../utils/regenerateReference";

/** Mutations for order_pkg_instance rows (update, remove, regenerate reference). */
export function useInstanceMutations(orderId: string) {
	const queryClient = useQueryClient();

	// Update Instance Mutation
	const updateInstanceMutation = useMutation({
		mutationFn: async ({
			instanceId,
			updates,
		}: {
			instanceId: string;
			updates: Partial<PackageInstance>;
		}) => {
			const { error } = await supabase
				.from("order_pkg_instance")
				.update(updates)
				.eq("id", instanceId);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
			queryClient.invalidateQueries({
				queryKey: ["packageInstances", orderId],
			});
		},
	});

	// Remove Instance Mutation
	const removeInstanceMutation = useMutation({
		mutationFn: async (instanceId: string) => {
			// 1. Fetch pkd_items to update items_db packed_qty counters
			const { data: pkdItems, error: fetchPkdError } = await supabase
				.from("pkd_item")
				.select("id, quantity, maintenance_db_id")
				.eq("pkg_instance_id", instanceId);

			if (fetchPkdError) throw fetchPkdError;

			if (pkdItems && pkdItems.length > 0) {
				const pkdItemIds = pkdItems.map((i) => i.id);

				// 2. Delete media associated with these pkd_items
				await supabase.from("media").delete().in("pkd_item_id", pkdItemIds);

				// 3. Update items_db packed_qty
				for (const item of pkdItems) {
					if (item.maintenance_db_id) {
						const { data: inventory } = await supabase
							.from("items_db")
							.select("packed_qty")
							.eq("id", item.maintenance_db_id)
							.single();

						if (inventory) {
							await supabase
								.from("items_db")
								.update({
									packed_qty: Math.max(
										0,
										(inventory.packed_qty || 0) - item.quantity,
									),
								})
								.eq("id", item.maintenance_db_id);
						}
					}
				}
			}

			// 4. Delete media associated with the instance itself
			await supabase
				.from("media")
				.delete()
				.eq("order_pkg_instance_id", instanceId);

			// 5. Delete instance itself
			const { error: deleteError } = await supabase
				.from("order_pkg_instance")
				.delete()
				.eq("id", instanceId);

			if (deleteError) throw deleteError;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
			queryClient.invalidateQueries({
				queryKey: ["packageInstances", orderId],
			});
			queryClient.invalidateQueries({ queryKey: ["clientInventory"] });
			queryClient.invalidateQueries({ queryKey: ["pkdItems", orderId] });
		},
	});

	// Regenerate Reference Mutation
	// Auto-infers: destination from instance.destination, tag from pkd_item→items_db→category tags,
	// item_num from pkd_item→items_db. Standard vs custom detected by presence of pkd_item rows.
	const regenerateReferenceMutation = useMutation({
		mutationFn: ({ instanceId }: { instanceId: string }) =>
			regenerateReferenceForInstance(instanceId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
			queryClient.invalidateQueries({
				queryKey: ["packageInstances", orderId],
			});
		},
	});

	return {
		updateInstanceMutation,
		removeInstanceMutation,
		regenerateReferenceMutation,
	};
}
