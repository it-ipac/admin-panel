import { type UseMutationResult, useQuery } from "@tanstack/react-query";
import {
	ArrowRightLeft,
	Loader2,
	Package,
	RefreshCw,
	Trash2,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useInstanceQr } from "@/features/orders/hooks/useInstanceQr";
import type {
	OrderPackage,
	PackageInfo,
	PackageInstance,
	PackageItem,
	TagTaxonomy,
} from "@/features/orders/types";
import { supabase } from "../../../../lib/supabase";
import { ConfirmDialog } from "../../../ui/ConfirmDialog";
import { DimensionsCard } from "../../../ui/DimensionsCard";
import { TwoTierCard } from "../../../ui/TwoTierCard";
import { MovePackageModal } from "../modals/MovePackageModal";
import { SyncQrModal } from "../modals/SyncQrModal";
import { InstanceRow } from "./InstanceRow";

type PendingConfirm =
	| { kind: "bulkDelete" }
	| { kind: "duplicate" }
	| { kind: "removePackage" }
	| { kind: "removePackageFinal" }
	| { kind: "regenerateAll" }
	| { kind: "regenerateInstance"; instanceId: string }
	| { kind: "removeInstance"; instanceId: string };

interface PackageInfoTabProps {
	selectedPackage: OrderPackage;
	selectedPackageInstances: PackageInstance[];
	updatePackageInfoMutation: UseMutationResult<
		PackageInfo,
		Error,
		{
			packageId: string;
			infoType: "original" | "final";
			updates: Partial<PackageInfo>;
		}
	>;
	duplicatePackageMutation: UseMutationResult<any, Error, string>;
	removePackageMutation: UseMutationResult<any, Error, string>;
	updateInstanceMutation: UseMutationResult<
		any,
		Error,
		{ instanceId: string; updates: Partial<PackageInstance> }
	>;
	removeInstanceMutation: UseMutationResult<any, Error, string>;
	regenerateReferenceMutation: UseMutationResult<
		any,
		Error,
		{ instanceId: string }
	>;
	packageItems?: PackageItem[];
	clientCategories?: { id: string; label: string }[];
	tagTaxonomy?: TagTaxonomy;
	currentOrderId: string;
	movePackageMutation: UseMutationResult<
		{ newNumber: number },
		Error,
		{ packageId: string; sourceOrderId: string; targetOrderId: string }
	>;
	/** Bulk regenerate all instances in the order */
	onRegenerateAll?: () => void;
	isRegeneratingAll?: boolean;
	/** Set of instance IDs updated by bulk regen — turns those rows green */
	updatedInstanceIds?: Set<string>;
}

export function PackageInfoTab({
	selectedPackage,
	selectedPackageInstances,
	updatePackageInfoMutation,
	duplicatePackageMutation,
	removePackageMutation,
	updateInstanceMutation,
	removeInstanceMutation,
	regenerateReferenceMutation,
	packageItems = [],
	clientCategories = [],
	tagTaxonomy,
	currentOrderId,
	movePackageMutation,
	onRegenerateAll,
	isRegeneratingAll = false,
	updatedInstanceIds = new Set(),
}: PackageInfoTabProps) {
	const [showSyncModal, setShowSyncModal] = useState(false);
	const [showMoveModal, setShowMoveModal] = useState(false);
	const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);

	const instanceIds = useMemo(
		() => selectedPackageInstances.map((i) => i.id),
		[selectedPackageInstances],
	);
	const { tokenByInstance, linkQrMutation, generateQrMutation } =
		useInstanceQr(instanceIds);
	const qrInstance =
		selectedPackageInstances.find((i) => i.id === qrInstanceId) || null;
	const qrSaving = linkQrMutation.isPending || generateQrMutation.isPending;
	const [syncInstances, setSyncInstances] = useState<
		{ instance: PackageInstance; newDestination: string }[]
	>([]);
	const [isSyncing, setIsSyncing] = useState(false);

	const [selectedInstanceIds, setSelectedInstanceIds] = useState<Set<string>>(
		new Set(),
	);
	const [isBulkDeleting, setIsBulkDeleting] = useState(false);
	const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
		null,
	);

	const { data: packingTypes } = useQuery({
		queryKey: ["packingTypes"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("packing_types")
				.select("id, code, name");
			if (error) throw error;
			return data;
		},
	});

	const { data: boxTypes } = useQuery({
		queryKey: ["boxTypes"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("box_type")
				.select("id, name");
			if (error) throw error;
			return data;
		},
	});

	const { data: seiCategories } = useQuery({
		queryKey: ["seiCategories"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("sei_categories")
				.select("id, code, name")
				.order("id", { ascending: true });
			if (error) throw error;
			return data;
		},
	});

	const { data: seiProtections } = useQuery({
		queryKey: ["seiProtections"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("sei_protection")
				.select("id, code, name")
				.order("id", { ascending: true });
			if (error) throw error;
			return data;
		},
	});

	const packingTypeOptions =
		packingTypes?.map((t) => ({
			label: `${t.code} - ${t.name}`,
			value: t.id,
		})) || [];
	const boxTypeOptions =
		boxTypes?.map((t) => ({ label: t.name, value: t.id })) || [];
	const seiCategoryOptions =
		seiCategories?.map((entry) => ({
			label: `${entry.code ?? entry.id} - ${entry.name}`,
			value: String(entry.id),
		})) || [];
	const seiProtectionOptions =
		seiProtections?.map((entry) => ({
			label: `${entry.code ?? entry.id} - ${entry.name}`,
			value: String(entry.id),
		})) || [];
	const handleUpdate = (
		field: keyof PackageInfo,
		value: any,
		infoType: "original" | "final" = "original",
	) => {
		updatePackageInfoMutation.mutate({
			packageId: selectedPackage.id,
			infoType,
			updates: { [field]: value },
		});
	};

	const handlePrepareSync = () => {
		const toSync = selectedPackageInstances
			.map((inst) => {
				// Find item specific to instance, or fallback to item applied to all instances
				const item =
					packageItems?.find(
						(i) => i.instance_number === inst.instance_number,
					) || packageItems?.find((i) => !i.instance_number);

				return {
					instance: inst,
					newDestination: item?.warehouse_location || "",
				};
			})
			.filter(
				(x) => x.newDestination && x.newDestination !== x.instance.destination,
			);

		setSyncInstances(toSync);
		setShowSyncModal(true);
	};

	const handleConfirmSync = async () => {
		setIsSyncing(true);
		for (const { instance, newDestination } of syncInstances) {
			await updateInstanceMutation.mutateAsync({
				instanceId: instance.id,
				updates: { destination: newDestination },
			});
		}
		setIsSyncing(false);
		setShowSyncModal(false);
	};

	const handleBulkDelete = async () => {
		setIsBulkDeleting(true);
		try {
			for (const instanceId of selectedInstanceIds) {
				await removeInstanceMutation.mutateAsync(instanceId);
			}
			setSelectedInstanceIds(new Set());
		} catch (err) {
			console.error("Bulk delete failed:", err);
		} finally {
			setIsBulkDeleting(false);
		}
	};

	const confirmDialogProps = (() => {
		switch (pendingConfirm?.kind) {
			case "bulkDelete":
				return {
					title: `Delete ${selectedInstanceIds.size} selected box instances?`,
					description:
						"All packed items and media associated with these instances will be permanently deleted. This action cannot be undone.",
					confirmText: "Delete instances",
					onConfirm: () => {
						setPendingConfirm(null);
						handleBulkDelete();
					},
				};
			case "duplicate":
				return {
					title: "Duplicate this box?",
					description:
						"This will create a new empty box with the same original dimensions.",
					confirmText: "Duplicate",
					variant: "primary" as const,
					onConfirm: () => {
						setPendingConfirm(null);
						duplicatePackageMutation.mutate(selectedPackage.id);
					},
				};
			case "removePackage":
				return {
					title: "Permanently remove this box?",
					description:
						"This will delete all items, materials, and references associated with it. This action cannot be undone.",
					confirmText: "Continue",
					onConfirm: () => setPendingConfirm({ kind: "removePackageFinal" }),
				};
			case "removePackageFinal":
				return {
					title: "Final confirmation",
					description:
						"Are you absolutely sure? All data for this box will be lost.",
					confirmText: "Delete box",
					onConfirm: () => {
						setPendingConfirm(null);
						removePackageMutation.mutate(selectedPackage.id);
					},
				};
			case "regenerateAll":
				return {
					title: "Regenerate IPAC IDs for all custom instances?",
					description:
						"Destination is read from each instance; tag and item number are inferred from packed items.",
					confirmText: "Regenerate",
					variant: "primary" as const,
					onConfirm: () => {
						setPendingConfirm(null);
						onRegenerateAll?.();
					},
				};
			case "regenerateInstance": {
				const instanceId = pendingConfirm.instanceId;
				return {
					title: "Regenerate this box's IPAC id with the new tag?",
					description:
						"The reference is rebuilt from the box's destination and the tag you just selected. The QR code stays the same.",
					confirmText: "Regenerate",
					variant: "primary" as const,
					onConfirm: () => {
						setPendingConfirm(null);
						regenerateReferenceMutation.mutate({ instanceId });
					},
				};
			}
			case "removeInstance": {
				const instanceId = pendingConfirm.instanceId;
				return {
					title: "Permanently remove this box instance?",
					description:
						"All packed items and media associated with this instance will be deleted. This action cannot be undone.",
					confirmText: "Delete instance",
					onConfirm: () => {
						setPendingConfirm(null);
						removeInstanceMutation.mutate(instanceId);
					},
				};
			}
			default:
				return null;
		}
	})();

	return (
		<div className="space-y-4">
			{/* Header Section */}
			<div className="flex items-center justify-between bg-white p-4 rounded-lg border border-neutral-200">
				<div>
					<h3 className="text-lg font-semibold text-neutral-800">
						Box #{selectedPackage.package_number}
					</h3>
					<p className="text-neutral-500 text-sm">
						{selectedPackage.description || "No description provided."}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowMoveModal(true)}
						disabled={movePackageMutation.isPending}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors disabled:opacity-50"
					>
						{movePackageMutation.isPending ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<ArrowRightLeft className="w-4 h-4" />
						)}
						Move to Order
					</button>
					<button
						onClick={() => setPendingConfirm({ kind: "duplicate" })}
						disabled={duplicatePackageMutation.isPending}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition-colors disabled:opacity-50"
					>
						{duplicatePackageMutation.isPending ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Package className="w-4 h-4" />
						)}
						Duplicate Box
					</button>
					<button
						onClick={() => setPendingConfirm({ kind: "removePackage" })}
						disabled={removePackageMutation.isPending}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-danger-50 text-danger-600 rounded-md hover:bg-danger-100 transition-colors disabled:opacity-50"
					>
						{removePackageMutation.isPending ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Trash2 className="w-4 h-4" />
						)}
						Remove Box
					</button>
				</div>
			</div>

			{/* Instances & References */}
			<div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
				<div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
					<h4 className="text-sm font-semibold text-neutral-900">
						Box Instances
					</h4>
					<div className="flex items-center gap-3">
						<button
							onClick={handlePrepareSync}
							className="text-xs px-2 py-1 bg-primary-50 text-primary-600 rounded hover:bg-primary-100 transition-colors flex items-center gap-1 font-medium"
						>
							<RefreshCw className="w-3 h-3" /> Sync Destination
						</button>
						{selectedInstanceIds.size > 0 && (
							<button
								onClick={() => setPendingConfirm({ kind: "bulkDelete" })}
								disabled={isBulkDeleting}
								className="text-xs px-2 py-1 bg-danger-50 text-danger-600 rounded hover:bg-danger-100 transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
							>
								{isBulkDeleting ? (
									<Loader2 className="w-3 h-3 animate-spin" />
								) : (
									<Trash2 className="w-3 h-3" />
								)}
								{isBulkDeleting
									? "Deleting…"
									: `Delete Selected (${selectedInstanceIds.size})`}
							</button>
						)}
						{onRegenerateAll && (
							<button
								onClick={() => setPendingConfirm({ kind: "regenerateAll" })}
								disabled={isRegeneratingAll}
								className="text-xs px-2 py-1 bg-success-50 text-success-700 rounded hover:bg-success-100 transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
							>
								{isRegeneratingAll ? (
									<Loader2 className="w-3 h-3 animate-spin" />
								) : (
									<RefreshCw className="w-3 h-3" />
								)}
								{isRegeneratingAll ? "Regenerating…" : "Regenerate All IDs"}
							</button>
						)}
						<span className="text-xs text-neutral-500">
							{selectedPackageInstances.length} instance
							{selectedPackageInstances.length === 1 ? "" : "s"}
						</span>
					</div>
				</div>

				{/* Sync Modal */}
				{showSyncModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
							<div className="px-4 py-3 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
								<h3 className="font-semibold text-neutral-800">
									Confirm Destination Sync
								</h3>
								<button
									onClick={() => setShowSyncModal(false)}
									className="text-neutral-400 hover:text-neutral-600"
								>
									<X className="w-5 h-5" />
								</button>
							</div>
							<div className="p-4">
								{syncInstances.length === 0 ? (
									<p className="text-neutral-600 text-sm">
										No instances found with a different warehouse location to
										sync.
									</p>
								) : (
									<>
										<p className="text-neutral-600 text-sm mb-4">
											You are about to update the destination for the following
											instances based on their item's warehouse location:
										</p>
										<div className="max-h-48 overflow-y-auto space-y-2 mb-4">
											{syncInstances.map((sync, i) => (
												<div
													key={i}
													className="flex justify-between items-center text-sm p-2 bg-neutral-50 rounded border border-neutral-100"
												>
													<span className="font-medium">
														#{sync.instance.instance_number ?? "All"}
													</span>
													<div className="flex items-center gap-2 text-neutral-500">
														<span className="line-through">
															{sync.instance.destination || "None"}
														</span>
														<span>→</span>
														<span className="text-primary-600 font-semibold">
															{sync.newDestination}
														</span>
													</div>
												</div>
											))}
										</div>
									</>
								)}
							</div>
							<div className="px-4 py-3 border-t border-neutral-100 flex justify-end gap-2 bg-neutral-50">
								<button
									onClick={() => setShowSyncModal(false)}
									className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded"
								>
									Cancel
								</button>
								<button
									onClick={handleConfirmSync}
									disabled={isSyncing || syncInstances.length === 0}
									className="px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 rounded flex items-center gap-2 disabled:opacity-50"
								>
									{isSyncing && <Loader2 className="w-4 h-4 animate-spin" />}
									Confirm Sync
								</button>
							</div>
						</div>
					</div>
				)}

				{selectedPackageInstances.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-neutral-50 text-neutral-600">
								<tr>
									<th className="px-4 py-2.5 font-medium text-left w-10">
										<input
											type="checkbox"
											className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
											checked={
												selectedPackageInstances.length > 0 &&
												selectedInstanceIds.size ===
													selectedPackageInstances.length
											}
											onChange={(e) => {
												if (e.target.checked) {
													setSelectedInstanceIds(
														new Set(selectedPackageInstances.map((i) => i.id)),
													);
												} else {
													setSelectedInstanceIds(new Set());
												}
											}}
										/>
									</th>
									<th className="text-left px-4 py-2.5 font-medium">
										Instance #
									</th>
									<th className="text-left px-4 py-2.5 font-medium">
										IPAC Reference
									</th>
									<th className="text-left px-4 py-2.5 font-medium">Status</th>
									<th className="text-left px-4 py-2.5 font-medium">
										Destination
									</th>
									<th className="text-left px-4 py-2.5 font-medium">Tag</th>
									<th className="text-left px-4 py-2.5 font-medium">
										Category
									</th>
									<th className="text-right px-4 py-2.5 font-medium">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{selectedPackageInstances.map((instance) => (
									<InstanceRow
										key={instance.id}
										instance={instance}
										isSelected={selectedInstanceIds.has(instance.id)}
										onToggleSelect={(checked) => {
											const next = new Set(selectedInstanceIds);
											if (checked) {
												next.add(instance.id);
											} else {
												next.delete(instance.id);
											}
											setSelectedInstanceIds(next);
										}}
										isUpdated={updatedInstanceIds.has(instance.id)}
										clientCategories={clientCategories}
										tagTaxonomy={tagTaxonomy}
										onSave={(instanceId, updates) =>
											updateInstanceMutation.mutate({ instanceId, updates })
										}
										onRequestRegenerate={(instanceId) =>
											setPendingConfirm({
												kind: "regenerateInstance",
												instanceId,
											})
										}
										onRegenerate={(instanceId) =>
											regenerateReferenceMutation.mutate({ instanceId })
										}
										onRemove={(instanceId) =>
											setPendingConfirm({ kind: "removeInstance", instanceId })
										}
										qrLinked={!!tokenByInstance?.get(instance.id)}
										onOpenQr={(instanceId) => setQrInstanceId(instanceId)}
										regeneratePending={regenerateReferenceMutation.isPending}
										removePending={removeInstanceMutation.isPending}
									/>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="px-4 py-4 text-sm text-neutral-500">
						No instance rows found for this box.
					</div>
				)}
			</div>

			{/* Package Info Cards */}
			<div className="flex flex-row flex-wrap gap-1">
				<TwoTierCard
					label="Quantity"
					original={selectedPackage.original_pkg_info?.quantity}
					final={selectedPackage.final_pkg_info?.quantity}
					type="number"
					onChangeOriginal={(v) => handleUpdate("quantity", v, "original")}
					onChangeFinal={(v) => handleUpdate("quantity", v, "final")}
					originalEditable={true}
					finalEditable={true}
				/>
				<TwoTierCard
					label="S.E.I"
					original={selectedPackage.original_pkg_info?.packing_type_id}
					final={selectedPackage.final_pkg_info?.packing_type_id}
					type="select"
					selectItems={packingTypeOptions}
					onChangeOriginal={(v) =>
						handleUpdate("packing_type_id", v, "original")
					}
					onChangeFinal={(v) => handleUpdate("packing_type_id", v, "final")}
					originalEditable={true}
					finalEditable={true}
				/>
				<TwoTierCard
					label="SEI Category"
					original={selectedPackage.original_pkg_info?.sei_category}
					final={selectedPackage.final_pkg_info?.sei_category}
					type="select"
					selectItems={seiCategoryOptions}
					onChangeOriginal={(v) =>
						handleUpdate("sei_category", v ? Number(v) : null, "original")
					}
					onChangeFinal={(v) =>
						handleUpdate("sei_category", v ? Number(v) : null, "final")
					}
					originalEditable={true}
					finalEditable={true}
				/>
				<TwoTierCard
					label="SEI Protection"
					original={selectedPackage.original_pkg_info?.sei_protection}
					final={selectedPackage.final_pkg_info?.sei_protection}
					type="select"
					selectItems={seiProtectionOptions}
					onChangeOriginal={(v) =>
						handleUpdate("sei_protection", v ? Number(v) : null, "original")
					}
					onChangeFinal={(v) =>
						handleUpdate("sei_protection", v ? Number(v) : null, "final")
					}
					originalEditable={true}
					finalEditable={true}
				/>
				<TwoTierCard
					label="Box Type"
					original={selectedPackage.original_pkg_info?.box_type_id}
					final={selectedPackage.final_pkg_info?.box_type_id}
					type="select"
					selectItems={boxTypeOptions}
					onChangeOriginal={(v) => handleUpdate("box_type_id", v, "original")}
					onChangeFinal={(v) => handleUpdate("box_type_id", v, "final")}
					originalEditable={true}
					finalEditable={true}
					className="flex-[1.3]"
				/>
				<TwoTierCard
					label="Tare"
					original={selectedPackage.original_pkg_info?.tare}
					final={selectedPackage.final_pkg_info?.tare}
					type="number"
					onChangeOriginal={(v) => handleUpdate("tare", v, "original")}
					onChangeFinal={(v) => handleUpdate("tare", v, "final")}
					originalEditable={true}
					finalEditable={true}
					className="flex-[1.2]"
				/>
				<TwoTierCard
					label="Net Weight"
					original={selectedPackage.original_pkg_info?.net_weight}
					final={selectedPackage.final_pkg_info?.net_weight}
					type="number"
					onChangeOriginal={(v) => handleUpdate("net_weight", v, "original")}
					onChangeFinal={(v) => handleUpdate("net_weight", v, "final")}
					originalEditable={true}
					finalEditable={true}
					className="flex-[1.3]"
				/>
				<TwoTierCard
					label="Gross Weight"
					original={selectedPackage.original_pkg_info?.gross_weight}
					final={selectedPackage.final_pkg_info?.gross_weight}
					type="number"
					onChangeOriginal={(v) => handleUpdate("gross_weight", v, "original")}
					onChangeFinal={(v) => handleUpdate("gross_weight", v, "final")}
					originalEditable={true}
					finalEditable={true}
					className="flex-[1.3]"
				/>
				<TwoTierCard
					label="Center of Gravity"
					original={
						selectedPackage.original_pkg_info?.center_of_gravity
							? String(selectedPackage.original_pkg_info.center_of_gravity)
							: null
					}
					final={
						selectedPackage.final_pkg_info?.center_of_gravity
							? String(selectedPackage.final_pkg_info.center_of_gravity)
							: null
					}
					type="switch"
					onChangeOriginal={(v) =>
						handleUpdate("center_of_gravity", v, "original")
					}
					onChangeFinal={(v) => handleUpdate("center_of_gravity", v, "final")}
					originalEditable={true}
					finalEditable={true}
				/>
			</div>

			{/* Dimensions Cards */}
			<div className="flex flex-row flex-wrap gap-1 mt-4">
				<DimensionsCard
					heading="Internal Dimensions"
					original={{
						length: selectedPackage.original_pkg_info?.internal_length ?? null,
						width: selectedPackage.original_pkg_info?.internal_width ?? null,
						height: selectedPackage.original_pkg_info?.internal_height ?? null,
					}}
					final={{
						length: selectedPackage.final_pkg_info?.internal_length ?? null,
						width: selectedPackage.final_pkg_info?.internal_width ?? null,
						height: selectedPackage.final_pkg_info?.internal_height ?? null,
					}}
					originalEditable={true}
					finalEditable={true}
					onChangeOriginal={(patch) => {
						if (patch.length !== undefined)
							handleUpdate("internal_length", patch.length, "original");
						if (patch.width !== undefined)
							handleUpdate("internal_width", patch.width, "original");
						if (patch.height !== undefined)
							handleUpdate("internal_height", patch.height, "original");
					}}
					onChangeFinal={(patch) => {
						if (patch.length !== undefined)
							handleUpdate("internal_length", patch.length, "final");
						if (patch.width !== undefined)
							handleUpdate("internal_width", patch.width, "final");
						if (patch.height !== undefined)
							handleUpdate("internal_height", patch.height, "final");
					}}
				/>
				<DimensionsCard
					heading="External Dimensions"
					original={{
						length: selectedPackage.original_pkg_info?.external_length ?? null,
						width: selectedPackage.original_pkg_info?.external_width ?? null,
						height: selectedPackage.original_pkg_info?.external_height ?? null,
					}}
					final={{
						length: selectedPackage.final_pkg_info?.external_length ?? null,
						width: selectedPackage.final_pkg_info?.external_width ?? null,
						height: selectedPackage.final_pkg_info?.external_height ?? null,
					}}
					originalEditable={true}
					finalEditable={true}
					onChangeOriginal={(patch) => {
						if (patch.length !== undefined)
							handleUpdate("external_length", patch.length, "original");
						if (patch.width !== undefined)
							handleUpdate("external_width", patch.width, "original");
						if (patch.height !== undefined)
							handleUpdate("external_height", patch.height, "original");
					}}
					onChangeFinal={(patch) => {
						if (patch.length !== undefined)
							handleUpdate("external_length", patch.length, "final");
						if (patch.width !== undefined)
							handleUpdate("external_width", patch.width, "final");
						if (patch.height !== undefined)
							handleUpdate("external_height", patch.height, "final");
					}}
				/>
			</div>

			{confirmDialogProps && (
				<ConfirmDialog
					open
					onOpenChange={(open) => {
						if (!open) setPendingConfirm(null);
					}}
					{...confirmDialogProps}
				/>
			)}

			<MovePackageModal
				open={showMoveModal}
				onOpenChange={setShowMoveModal}
				selectedPackage={selectedPackage}
				instances={selectedPackageInstances}
				sourceOrderId={currentOrderId}
				isMoving={movePackageMutation.isPending}
				onConfirm={(targetOrderId) =>
					movePackageMutation.mutate(
						{
							packageId: selectedPackage.id,
							sourceOrderId: currentOrderId,
							targetOrderId,
						},
						{ onSuccess: () => setShowMoveModal(false) },
					)
				}
			/>

			<SyncQrModal
				open={!!qrInstanceId}
				onOpenChange={(open) => {
					if (!open) setQrInstanceId(null);
				}}
				instance={qrInstance}
				currentToken={
					qrInstanceId ? tokenByInstance?.get(qrInstanceId)?.token : null
				}
				isSaving={qrSaving}
				onLink={(instanceId, raw) =>
					linkQrMutation.mutate(
						{ instanceId, raw },
						{ onSuccess: () => setQrInstanceId(null) },
					)
				}
				onGenerate={(instanceId) =>
					generateQrMutation.mutate(
						{ instanceId },
						{ onSuccess: () => setQrInstanceId(null) },
					)
				}
			/>
		</div>
	);
}
