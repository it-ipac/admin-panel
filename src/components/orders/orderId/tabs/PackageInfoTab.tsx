import { type UseMutationResult, useQuery } from "@tanstack/react-query";
import {
	Check,
	Edit2,
	Loader2,
	Package,
	RefreshCw,
	Trash2,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import type {
	OrderPackage,
	PackageInfo,
	PackageInstance,
	PackageItem,
} from "../../../../routes/orders/$orderId";
import { DimensionsCard } from "../../../ui/DimensionsCard";
import { TwoTierCard } from "../../../ui/TwoTierCard";

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
	orderCategories?: string[];
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
	orderCategories = [],
	onRegenerateAll,
	isRegeneratingAll = false,
	updatedInstanceIds = new Set(),
}: PackageInfoTabProps) {
	const [editingInstanceId, setEditingInstanceId] = useState<string | null>(
		null,
	);
	const [referenceDraft, setReferenceDraft] = useState("");
	const [destinationDraft, setDestinationDraft] = useState("");
	const [tagDraft, setTagDraft] = useState("");
	const [categoryDraft, setCategoryDraft] = useState("");

	const [showSyncModal, setShowSyncModal] = useState(false);
	const [syncInstances, setSyncInstances] = useState<
		{ instance: PackageInstance; newDestination: string }[]
	>([]);
	const [isSyncing, setIsSyncing] = useState(false);

	const [selectedInstanceIds, setSelectedInstanceIds] = useState<Set<string>>(
		new Set(),
	);
	const [isBulkDeleting, setIsBulkDeleting] = useState(false);

	const sortedCategories = useMemo(() => {
		const orderSet = new Set(orderCategories);
		const mapped = clientCategories.filter((c) => orderSet.has(c.id));
		const unmapped = clientCategories.filter((c) => !orderSet.has(c.id));
		return [
			...mapped.map((c) => ({ ...c, isMapped: true })),
			...unmapped.map((c) => ({ ...c, isMapped: false })),
		];
	}, [clientCategories, orderCategories]);

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
		if (
			window.confirm(
				`Are you sure you want to PERMANENTLY REMOVE the ${selectedInstanceIds.size} selected box instances? All packed items and media associated with these instances will be deleted. This action cannot be undone.`,
			)
		) {
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
		}
	};

	return (
		<div className="space-y-4">
			{/* Header Section */}
			<div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
				<div>
					<h3 className="text-lg font-semibold text-gray-800">
						Box #{selectedPackage.package_number}
					</h3>
					<p className="text-gray-500 text-sm">
						{selectedPackage.description || "No description provided."}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => {
							if (
								window.confirm(
									"Are you sure you want to duplicate this box? This will create a new empty box with the same original dimensions.",
								)
							) {
								duplicatePackageMutation.mutate(selectedPackage.id);
							}
						}}
						disabled={duplicatePackageMutation.isPending}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
					>
						{duplicatePackageMutation.isPending ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Package className="w-4 h-4" />
						)}
						Duplicate Box
					</button>
					<button
						onClick={() => {
							if (
								window.confirm(
									"Are you sure you want to PERMANENTLY REMOVE this box? This will delete all items, materials, and references associated with it. This action cannot be undone.",
								)
							) {
								if (
									window.confirm(
										"FINAL CONFIRMATION: Are you absolutely sure? All data for this box will be lost.",
									)
								) {
									removePackageMutation.mutate(selectedPackage.id);
								}
							}
						}}
						disabled={removePackageMutation.isPending}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
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
			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
					<h4 className="text-sm font-semibold text-gray-900">Box Instances</h4>
					<div className="flex items-center gap-3">
						<button
							onClick={handlePrepareSync}
							className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors flex items-center gap-1 font-medium"
						>
							<RefreshCw className="w-3 h-3" /> Sync Destination
						</button>
						{selectedInstanceIds.size > 0 && (
							<button
								onClick={handleBulkDelete}
								disabled={isBulkDeleting}
								className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
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
								onClick={() => {
									if (
										window.confirm(
											"Regenerate IPAC IDs for ALL custom instances in this order? Destination is read from each instance; tag and item number are inferred from packed items.",
										)
									)
										onRegenerateAll();
								}}
								disabled={isRegeneratingAll}
								className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
							>
								{isRegeneratingAll ? (
									<Loader2 className="w-3 h-3 animate-spin" />
								) : (
									<RefreshCw className="w-3 h-3" />
								)}
								{isRegeneratingAll ? "Regenerating…" : "Regenerate All IDs"}
							</button>
						)}
						<span className="text-xs text-gray-500">
							{selectedPackageInstances.length} instance
							{selectedPackageInstances.length === 1 ? "" : "s"}
						</span>
					</div>
				</div>

				{/* Sync Modal */}
				{showSyncModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
							<div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
								<h3 className="font-semibold text-gray-800">
									Confirm Destination Sync
								</h3>
								<button
									onClick={() => setShowSyncModal(false)}
									className="text-gray-400 hover:text-gray-600"
								>
									<X className="w-5 h-5" />
								</button>
							</div>
							<div className="p-4">
								{syncInstances.length === 0 ? (
									<p className="text-gray-600 text-sm">
										No instances found with a different warehouse location to
										sync.
									</p>
								) : (
									<>
										<p className="text-gray-600 text-sm mb-4">
											You are about to update the destination for the following
											instances based on their item's warehouse location:
										</p>
										<div className="max-h-48 overflow-y-auto space-y-2 mb-4">
											{syncInstances.map((sync, i) => (
												<div
													key={i}
													className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded border border-gray-100"
												>
													<span className="font-medium">
														#{sync.instance.instance_number ?? "All"}
													</span>
													<div className="flex items-center gap-2 text-gray-500">
														<span className="line-through">
															{sync.instance.destination || "None"}
														</span>
														<span>→</span>
														<span className="text-blue-600 font-semibold">
															{sync.newDestination}
														</span>
													</div>
												</div>
											))}
										</div>
									</>
								)}
							</div>
							<div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
								<button
									onClick={() => setShowSyncModal(false)}
									className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
								>
									Cancel
								</button>
								<button
									onClick={handleConfirmSync}
									disabled={isSyncing || syncInstances.length === 0}
									className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-2 disabled:opacity-50"
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
							<thead className="bg-gray-50 text-gray-600">
								<tr>
									<th className="px-4 py-2.5 font-medium text-left w-10">
										<input
											type="checkbox"
											className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
									<tr
										key={instance.id}
										className={`border-t border-gray-100 transition-colors duration-500 ${
											updatedInstanceIds.has(instance.id)
												? "bg-emerald-50 border-l-2 border-l-emerald-400"
												: ""
										}`}
									>
										<td className="px-4 py-2.5 text-left w-10">
											<input
												type="checkbox"
												className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												checked={selectedInstanceIds.has(instance.id)}
												onChange={(e) => {
													const next = new Set(selectedInstanceIds);
													if (e.target.checked) {
														next.add(instance.id);
													} else {
														next.delete(instance.id);
													}
													setSelectedInstanceIds(next);
												}}
											/>
										</td>
										<td className="px-4 py-2.5 text-gray-900 font-medium">
											{instance.instance_number ?? "-"}
										</td>
										<td className="px-4 py-2.5 text-gray-800">
											{editingInstanceId === instance.id ? (
												<input
													className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-blue-500"
													value={referenceDraft}
													onChange={(e) => setReferenceDraft(e.target.value)}
												/>
											) : (
												instance.ipac_reference || "-"
											)}
										</td>
										<td className="px-4 py-2.5 text-gray-600">
											{instance.status || "design"}
										</td>
										<td className="px-4 py-2.5 text-gray-800">
											{editingInstanceId === instance.id ? (
												<input
													className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-blue-500"
													value={destinationDraft}
													onChange={(e) => setDestinationDraft(e.target.value)}
													placeholder="Destination"
												/>
											) : (
												instance.destination || "-"
											)}
										</td>
										<td className="px-4 py-2.5 text-gray-800">
											{editingInstanceId === instance.id ? (
												<input
													className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-blue-500"
													value={tagDraft}
													onChange={(e) => setTagDraft(e.target.value)}
													placeholder="Tag"
												/>
											) : (
												instance.tag || "-"
											)}
										</td>
										<td className="px-4 py-2.5 text-gray-800">
											{editingInstanceId === instance.id ? (
												<select
													className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-blue-500"
													value={categoryDraft}
													onChange={(e) => setCategoryDraft(e.target.value)}
												>
													<option value="">Default (Order Level)</option>
													{sortedCategories.map((cat) => (
														<option
															key={cat.id}
															value={cat.id}
															className={
																cat.isMapped ? "bg-green-100" : "bg-yellow-100"
															}
														>
															{cat.label}
														</option>
													))}
												</select>
											) : (
												clientCategories.find(
													(c) => c.id === instance.category_id,
												)?.label || "Default"
											)}
										</td>
										<td className="px-4 py-2.5 text-right">
											<div className="flex items-center justify-end gap-2">
												{editingInstanceId === instance.id ? (
													<>
														<button
															onClick={() => {
																updateInstanceMutation.mutate({
																	instanceId: instance.id,
																	updates: {
																		ipac_reference: referenceDraft,
																		destination: destinationDraft || null,
																		tag: tagDraft || null,
																		category_id: categoryDraft || null,
																	},
																});
																setEditingInstanceId(null);
															}}
															className="p-1 text-green-600 hover:bg-green-50 rounded"
															title="Save"
														>
															<Check className="w-4 h-4" />
														</button>
														<button
															onClick={() => setEditingInstanceId(null)}
															className="p-1 text-red-600 hover:bg-red-50 rounded"
															title="Cancel"
														>
															<X className="w-4 h-4" />
														</button>
													</>
												) : (
													<>
														<button
															onClick={() => {
																setEditingInstanceId(instance.id);
																setReferenceDraft(
																	instance.ipac_reference || "",
																);
																setDestinationDraft(instance.destination || "");
																setTagDraft(instance.tag || "");
																setCategoryDraft(instance.category_id || "");
															}}
															className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
															title="Edit Reference"
														>
															<Edit2 className="w-4 h-4" />
														</button>
														<button
															onClick={() =>
																regenerateReferenceMutation.mutate({
																	instanceId: instance.id,
																})
															}
															disabled={regenerateReferenceMutation.isPending}
															className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
															title="Regenerate IPAC Reference (auto-infers destination, tag & item)"
														>
															{regenerateReferenceMutation.isPending ? (
																<Loader2 className="w-4 h-4 animate-spin" />
															) : (
																<RefreshCw className="w-4 h-4" />
															)}
														</button>
														<button
															onClick={() => {
																if (
																	window.confirm(
																		"Are you sure you want to PERMANENTLY REMOVE this box instance? All packed items and media associated with this instance will be deleted. This action cannot be undone.",
																	)
																) {
																	removeInstanceMutation.mutate(instance.id);
																}
															}}
															disabled={removeInstanceMutation.isPending}
															className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
															title="Remove Instance"
														>
															{removeInstanceMutation.isPending ? (
																<Loader2 className="w-4 h-4 animate-spin" />
															) : (
																<Trash2 className="w-4 h-4" />
															)}
														</button>
													</>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="px-4 py-4 text-sm text-gray-500">
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
		</div>
	);
}
