import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Mutations for package items (custom rows in package_items) and
 * pkd_items (inventory-linked rows), including the inventory counter
 * sync and custom-item → inventory mapping flows.
 */
export function useOrderItemMutations(orderId: string) {
	const queryClient = useQueryClient();

	// Package Item Mutations
	const addPackageItemMutation = useMutation({
		mutationFn: async (item: {
			order_package_id: string;
			designation: string;
			quantity: number;
			length?: number | null;
			width?: number | null;
			height?: number | null;
		}) => {
			const { data, error } = await supabase
				.from("package_items")
				.insert(item)
				.select()
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["packageItems", orderId] });
		},
	});

	const updatePackageItemMutation = useMutation({
		mutationFn: async ({
			id,
			...updates
		}: {
			id: string;
			designation?: string;
			quantity?: number;
			length?: number | null;
			width?: number | null;
			height?: number | null;
		}) => {
			const { data, error } = await supabase
				.from("package_items")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["packageItems", orderId] });
		},
	});

	const deletePackageItemMutation = useMutation({
		mutationFn: async (id: string) => {
			// 1. Delete associated media first
			await supabase.from("media").delete().eq("package_item_id", id);

			// 2. Delete the item
			const { error } = await supabase
				.from("package_items")
				.delete()
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["packageItems", orderId] });
		},
	});

	// Pkd Item Mutations (Inventory Items)
	const addPkdItemMutation = useMutation({
		mutationFn: async (item: {
			pkg_instance_id: string;
			maintenance_db_id: string;
			quantity: number;
		}) => {
			// 1. Check current inventory
			const { data: inventory, error: invError } = await supabase
				.from("items_db")
				.select("expected_qty, packed_qty")
				.eq("id", item.maintenance_db_id)
				.single();

			if (invError) throw invError;
			const available =
				(inventory.expected_qty || 0) - (inventory.packed_qty || 0);
			if (item.quantity > available) {
				throw new Error(`Insufficient inventory. Available: ${available}`);
			}

			// 2. Insert pkd_item
			const { data, error } = await supabase
				.from("pkd_item")
				.insert(item)
				.select()
				.single();
			if (error) throw error;

			// 3. Update items_db packed_qty
			const { error: updateError } = await supabase
				.from("items_db")
				.update({ packed_qty: (inventory.packed_qty || 0) + item.quantity })
				.eq("id", item.maintenance_db_id);
			if (updateError) throw updateError;

			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["pkdItems", orderId] });
			queryClient.invalidateQueries({ queryKey: ["clientInventory"] });
		},
	});

	const deletePkdItemMutation = useMutation({
		mutationFn: async (id: string) => {
			// 1. Fetch item to get quantity and items_db_id
			const { data: item, error: fetchError } = await supabase
				.from("pkd_item")
				.select("quantity, maintenance_db_id")
				.eq("id", id)
				.single();
			if (fetchError) throw fetchError;

			// 2. Delete associated media first
			await supabase.from("media").delete().eq("pkd_item_id", id);

			// 3. Delete pkd_item
			const { error } = await supabase.from("pkd_item").delete().eq("id", id);
			if (error) throw error;

			// 4. Update items_db packed_qty
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
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["pkdItems", orderId] });
			queryClient.invalidateQueries({ queryKey: ["clientInventory"] });
		},
	});

	// Mutation to sync items_db.packed_qty counters
	const syncInventoryCountersMutation = useMutation({
		mutationFn: async (itemsToSync: { id: string; actualQty: number }[]) => {
			for (const item of itemsToSync) {
				const { error } = await supabase
					.from("items_db")
					.update({ packed_qty: item.actualQty })
					.eq("id", item.id);
				if (error) throw error;
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clientInventory"] });
			queryClient.invalidateQueries({ queryKey: ["pkdItems", orderId] });
		},
	});

	// Mutation to map a custom package_item to an items_db entry
	const mapCustomItemMutation = useMutation({
		mutationFn: async ({
			packageItemId,
			itemsDbId,
			packageId,
			quantity,
			distributionMode, // 'distribute' | 'single'
			pkgInstanceId, // required if 'single'
		}: {
			packageItemId: string;
			itemsDbId: string;
			packageId: string;
			quantity: number;
			distributionMode: "distribute" | "single";
			pkgInstanceId?: string;
		}) => {
			// Get all instances of this package
			const { data: instances, error: instError } = await supabase
				.from("order_pkg_instance")
				.select("id")
				.eq("order_package_id", packageId)
				.order("instance_number", { ascending: true });

			if (instError) throw instError;
			if (!instances || instances.length === 0) {
				throw new Error("No package instances found to map this item to.");
			}

			const createdPkdItemIds: string[] = [];
			let primaryPkdItemId: string | null = null;

			if (distributionMode === "distribute") {
				const N = instances.length;
				for (let i = 0; i < N; i++) {
					const qty = Math.floor(quantity / N) + (i < quantity % N ? 1 : 0);
					if (qty > 0) {
						const { data: newPkdItem, error: insertError } = await supabase
							.from("pkd_item")
							.insert({
								pkg_instance_id: instances[i].id,
								maintenance_db_id: itemsDbId,
								quantity: qty,
							})
							.select()
							.single();

						if (insertError) throw insertError;
						createdPkdItemIds.push(newPkdItem.id);
						if (!primaryPkdItemId) primaryPkdItemId = newPkdItem.id;
					}
				}
			} else {
				const targetInstanceId = pkgInstanceId || instances[0].id;
				const { data: newPkdItem, error: insertError } = await supabase
					.from("pkd_item")
					.insert({
						pkg_instance_id: targetInstanceId,
						maintenance_db_id: itemsDbId,
						quantity: quantity,
					})
					.select()
					.single();

				if (insertError) throw insertError;
				createdPkdItemIds.push(newPkdItem.id);
				primaryPkdItemId = newPkdItem.id;
			}

			if (primaryPkdItemId) {
				// 2. Update any media associated with the package_item_id to point to the primary new pkd_item_id
				const { error: mediaError } = await supabase
					.from("media")
					.update({
						pkd_item_id: primaryPkdItemId,
						package_item_id: null,
					})
					.eq("package_item_id", packageItemId);

				if (mediaError) {
					console.error("Error updating media links:", mediaError);
				}
			}

			// 3. Delete the custom package_item row
			const { error: deleteError } = await supabase
				.from("package_items")
				.delete()
				.eq("id", packageItemId);

			if (deleteError) throw deleteError;

			// 4. Update the items_db packed_qty counter
			const { data: inventory, error: invError } = await supabase
				.from("items_db")
				.select("packed_qty")
				.eq("id", itemsDbId)
				.single();

			if (!invError && inventory) {
				await supabase
					.from("items_db")
					.update({ packed_qty: (inventory.packed_qty || 0) + quantity })
					.eq("id", itemsDbId);
			}

			return createdPkdItemIds;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["packageItems", orderId] });
			queryClient.invalidateQueries({ queryKey: ["pkdItems", orderId] });
			queryClient.invalidateQueries({ queryKey: ["clientInventory"] });
			queryClient.invalidateQueries({ queryKey: ["media", orderId] });
			queryClient.invalidateQueries({
				queryKey: ["packageInstances", orderId],
			});
		},
	});

	return {
		addPackageItemMutation,
		updatePackageItemMutation,
		deletePackageItemMutation,
		addPkdItemMutation,
		deletePkdItemMutation,
		syncInventoryCountersMutation,
		mapCustomItemMutation,
	};
}
