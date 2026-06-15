import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import type { Order, PackageInstance, PackageItem } from "../types";

export interface GlobalSyncEntry {
	instance: PackageInstance;
	newDestination: string;
	package_number?: number;
}

/**
 * State + actions for the "Sync Destinations" modal: proposes setting
 * each instance's destination to its item's warehouse location, then
 * applies the confirmed updates via updateInstanceMutation.
 */
export function useGlobalDestinationSync(deps: {
	order: Order | null | undefined;
	packageItems: PackageItem[] | undefined;
	pkdItems: any[] | undefined;
	packageInstances: PackageInstance[] | undefined;
	updateInstanceMutation: UseMutationResult<
		any,
		Error,
		{ instanceId: string; updates: Partial<PackageInstance> }
	>;
}) {
	const { order, packageItems, pkdItems, packageInstances } = deps;
	const [showGlobalSyncModal, setShowGlobalSyncModal] = useState(false);
	const [globalSyncInstances, setGlobalSyncInstances] = useState<
		GlobalSyncEntry[]
	>([]);
	const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);

	const handlePrepareGlobalSync = (): void => {
		const standardItems = (packageItems || []).map((item) => ({
			...item,
			source: "custom" as const,
		}));

		const invItems = (pkdItems || []).map((item) => {
			const instance = packageInstances?.find(
				(inst) => inst.id === item.pkg_instance_id,
			);
			return {
				order_package_id: instance?.order_package_id,
				instance_number: instance?.instance_number ?? undefined,
				warehouse_location: item.items_db?.warehouse_location,
			};
		});

		const toSync = (packageInstances || [])
			.map((inst) => {
				const item =
					invItems.find(
						(i) =>
							i.order_package_id === inst.order_package_id &&
							i.instance_number === inst.instance_number,
					) ||
					invItems.find(
						(i) =>
							i.order_package_id === inst.order_package_id &&
							!i.instance_number,
					) ||
					standardItems.find(
						(i) =>
							i.order_package_id === inst.order_package_id &&
							i.instance_number === inst.instance_number,
					) ||
					standardItems.find(
						(i) =>
							i.order_package_id === inst.order_package_id &&
							!i.instance_number,
					);

				const pkg = order?.order_packages.find(
					(p) => p.id === inst.order_package_id,
				);
				return {
					instance: inst,
					newDestination: item?.warehouse_location || "",
					package_number: pkg?.package_number,
				};
			})
			.filter(
				(x) => x.newDestination && x.newDestination !== x.instance.destination,
			);

		setGlobalSyncInstances(toSync);
		setShowGlobalSyncModal(true);
	};

	const handleConfirmGlobalSync = async (): Promise<void> => {
		setIsGlobalSyncing(true);
		for (const { instance, newDestination } of globalSyncInstances) {
			await deps.updateInstanceMutation.mutateAsync({
				instanceId: instance.id,
				updates: { destination: newDestination },
			});
		}
		setIsGlobalSyncing(false);
		setShowGlobalSyncModal(false);
	};

	return {
		showGlobalSyncModal,
		setShowGlobalSyncModal,
		globalSyncInstances,
		isGlobalSyncing,
		handlePrepareGlobalSync,
		handleConfirmGlobalSync,
	};
}
