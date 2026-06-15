import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { useToastContext } from "@/components/ui/ToastProvider";
import { supabase } from "@/lib/supabase";
import type { Order, PackageInstance, PackageItem } from "../types";

export interface OutOfSyncItem {
	id: string;
	item_num: string | null;
	description: string | null;
	expected_qty: number;
	stored_packed_qty: number;
	actual_pkd_sum: number;
}

export interface MappingConfig {
	itemsDbId: string;
	distributionMode: "distribute" | "single";
	pkgInstanceId: string;
}

/** Suggests an items_db match for a custom item by dimensions, then text. */
export function findSuggestedItem(
	customItem: PackageItem,
	inventory: any[],
): any | null {
	if (!inventory.length) return null;

	// 1. Try dimension matching first
	const dimMatches = inventory.filter(
		(item) =>
			item.length === customItem.length &&
			item.width === customItem.width &&
			item.height === customItem.height,
	);
	if (dimMatches.length === 1) return dimMatches[0];

	// 2. Try partial text matching
	if (customItem.designation || customItem.reference) {
		const textToMatch = (
			(customItem.designation || "") +
			" " +
			(customItem.reference || "")
		).toLowerCase();

		// Try item_num match first
		const numMatch = inventory.find(
			(item) =>
				item.item_num && textToMatch.includes(item.item_num.toLowerCase()),
		);
		if (numMatch) return numMatch;

		// Try description keywords matching
		const keywordMatch = inventory.find((item) =>
			item.description
				?.toLowerCase()
				.split(/\s+/)
				.some((word: string) => word.length > 3 && textToMatch.includes(word)),
		);
		if (keywordMatch) return keywordMatch;
	}

	// Fallback to first dimension match if multiple found
	if (dimMatches.length > 1) return dimMatches[0];

	return null;
}

/**
 * State + actions for the "Sync & Link Inventory" modal: scans for
 * packed_qty counter discrepancies and unlinked custom items, then
 * applies counter sync + custom-item mapping.
 */
export function useInventorySync(deps: {
	order: Order | null | undefined;
	packageItems: PackageItem[] | undefined;
	clientInventory: any[] | undefined;
	packageInstances: PackageInstance[] | undefined;
	syncInventoryCountersMutation: UseMutationResult<
		any,
		Error,
		{ id: string; actualQty: number }[]
	>;
	mapCustomItemMutation: UseMutationResult<
		any,
		Error,
		{
			packageItemId: string;
			itemsDbId: string;
			packageId: string;
			quantity: number;
			distributionMode: "distribute" | "single";
			pkgInstanceId?: string;
		}
	>;
}) {
	const { order, packageItems, clientInventory, packageInstances } = deps;
	const { toast } = useToastContext();

	const [showSyncInventoryModal, setShowSyncInventoryModal] = useState(false);
	const [syncInventoryTab, setSyncInventoryTab] = useState<
		"counters" | "unlinked"
	>("counters");
	const [outOfSyncItems, setOutOfSyncItems] = useState<OutOfSyncItem[]>([]);
	const [mappingConfigs, setMappingConfigs] = useState<
		Record<string, MappingConfig>
	>({});
	const [isScanningInventory, setIsScanningInventory] = useState(false);
	const [isSavingSync, setIsSavingSync] = useState(false);

	const handleScanInventory = async (): Promise<void> => {
		if (!order?.clients?.id) return;
		setIsScanningInventory(true);
		try {
			// 1. Fetch all items_db for the client
			const { data: dbItems, error: dbErr } = await supabase
				.from("items_db")
				.select("id, item_num, description, expected_qty, packed_qty")
				.eq("client_id", order.clients.id);

			if (dbErr) throw dbErr;

			// 2. Fetch all pkd_item for the client globally to get the actual sums
			const { data: allPkd, error: pkdErr } = await supabase
				.from("pkd_item")
				.select("maintenance_db_id, quantity");

			if (pkdErr) throw pkdErr;

			// Aggregate global pkd_item counts
			const pkdSums: Record<string, number> = {};
			allPkd.forEach((p) => {
				if (p.maintenance_db_id) {
					pkdSums[p.maintenance_db_id] =
						(pkdSums[p.maintenance_db_id] || 0) + (p.quantity || 0);
				}
			});

			// Filter out-of-sync items
			const outOfSync = (dbItems || [])
				.map((item) => {
					const actual = pkdSums[item.id] || 0;
					return {
						id: item.id,
						item_num: item.item_num,
						description: item.description,
						expected_qty: item.expected_qty,
						stored_packed_qty: item.packed_qty || 0,
						actual_pkd_sum: actual,
					};
				})
				.filter((item) => item.stored_packed_qty !== item.actual_pkd_sum);

			setOutOfSyncItems(outOfSync);

			// Initialize mapping configurations for unlinked custom items
			const currentUnlinkedItems =
				packageItems?.filter((item) => !item.items_db_id) || [];
			const initialConfigs: Record<string, MappingConfig> = {};

			currentUnlinkedItems.forEach((item) => {
				const suggestion = findSuggestedItem(item, clientInventory || []);
				const pkgInstances =
					packageInstances?.filter(
						(inst) => inst.order_package_id === item.order_package_id,
					) || [];
				const firstInstId = pkgInstances[0]?.id || "";

				initialConfigs[item.id] = {
					itemsDbId: suggestion?.id || "",
					distributionMode:
						pkgInstances.length > 1 && item.quantity > 1
							? "distribute"
							: "single",
					pkgInstanceId: firstInstId,
				};
			});

			setMappingConfigs(initialConfigs);
			setShowSyncInventoryModal(true);
		} catch (err: any) {
			toast({
				title: "Scan failed",
				description: err.message || "Failed to scan inventory discrepancies.",
				variant: "error",
			});
		} finally {
			setIsScanningInventory(false);
		}
	};

	const handleConfirmSyncInventory = async (): Promise<void> => {
		setIsSavingSync(true);
		try {
			// 1. Sync counters
			if (outOfSyncItems.length > 0) {
				const itemsToSync = outOfSyncItems.map((item) => ({
					id: item.id,
					actualQty: item.actual_pkd_sum,
				}));
				await deps.syncInventoryCountersMutation.mutateAsync(itemsToSync);
			}

			// 2. Map custom items
			const currentUnlinkedItems =
				packageItems?.filter((item) => !item.items_db_id) || [];
			let mapCount = 0;
			for (const customItem of currentUnlinkedItems) {
				const config = mappingConfigs[customItem.id];
				if (config?.itemsDbId) {
					const pkg = order?.order_packages.find(
						(p) => p.id === customItem.order_package_id,
					);
					if (pkg) {
						await deps.mapCustomItemMutation.mutateAsync({
							packageItemId: customItem.id,
							itemsDbId: config.itemsDbId,
							packageId: pkg.id,
							quantity: customItem.quantity,
							distributionMode: config.distributionMode,
							pkgInstanceId: config.pkgInstanceId || undefined,
						});
						mapCount++;
					}
				}
			}

			toast({
				title: "Sync completed",
				description: `Successfully synchronized inventory counters and mapped ${mapCount} items.`,
				variant: "success",
			});
			setShowSyncInventoryModal(false);
		} catch (err: any) {
			toast({
				title: "Sync failed",
				description: err.message || "An error occurred during synchronization.",
				variant: "error",
			});
		} finally {
			setIsSavingSync(false);
		}
	};

	return {
		showSyncInventoryModal,
		setShowSyncInventoryModal,
		syncInventoryTab,
		setSyncInventoryTab,
		outOfSyncItems,
		mappingConfigs,
		setMappingConfigs,
		isScanningInventory,
		isSavingSync,
		handleScanInventory,
		handleConfirmSyncInventory,
	};
}
