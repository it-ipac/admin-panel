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
import { useState } from "react";
import { supabase } from "../../../../lib/supabase";
import type {
	OrderPackage,
	PackageInfo,
	PackageInstance,
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
	regenerateReferenceMutation: UseMutationResult<
		any,
		Error,
		{
			instanceId: string;
			isCustom: boolean;
			itemNumber?: string;
			categoryLabel?: string;
		}
	>;
}

export function PackageInfoTab({
	selectedPackage,
	selectedPackageInstances,
	updatePackageInfoMutation,
	duplicatePackageMutation,
	removePackageMutation,
	updateInstanceMutation,
	regenerateReferenceMutation,
}: PackageInfoTabProps) {
	const [editingInstanceId, setEditingInstanceId] = useState<string | null>(
		null,
	);
	const [referenceDraft, setReferenceDraft] = useState("");

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

	const getPackingTypeName = (id: string | null | undefined) => {
		if (!id) return null;
		const t = packingTypes?.find((t) => t.id === id);
		return t ? `${t.code} - ${t.name}` : id;
	};

	const getBoxTypeName = (id: string | null | undefined) => {
		if (!id) return null;
		const t = boxTypes?.find((t) => t.id === id);
		return t ? t.name : id;
	};

	const getSeiCategoryName = (id: number | null | undefined) => {
		if (!id) return null;
		const entry = seiCategories?.find((item) => item.id === id);
		return entry ? `${entry.code ?? entry.id} - ${entry.name}` : String(id);
	};

	const getSeiProtectionName = (id: number | null | undefined) => {
		if (!id) return null;
		const entry = seiProtections?.find((item) => item.id === id);
		return entry ? `${entry.code ?? entry.id} - ${entry.name}` : String(id);
	};

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
					<span className="text-xs text-gray-500">
						{selectedPackageInstances.length} instance
						{selectedPackageInstances.length === 1 ? "" : "s"}
					</span>
				</div>

				{selectedPackageInstances.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-gray-50 text-gray-600">
								<tr>
									<th className="text-left px-4 py-2.5 font-medium">
										Instance #
									</th>
									<th className="text-left px-4 py-2.5 font-medium">
										IPAC Reference
									</th>
									<th className="text-left px-4 py-2.5 font-medium">Status</th>
									<th className="text-right px-4 py-2.5 font-medium">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{selectedPackageInstances.map((instance) => (
									<tr key={instance.id} className="border-t border-gray-100">
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
										<td className="px-4 py-2.5 text-right">
											<div className="flex items-center justify-end gap-2">
												{editingInstanceId === instance.id ? (
													<>
														<button
															onClick={() => {
																updateInstanceMutation.mutate({
																	instanceId: instance.id,
																	updates: { ipac_reference: referenceDraft },
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
															}}
															className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
															title="Edit Reference"
														>
															<Edit2 className="w-4 h-4" />
														</button>
														<button
															onClick={() => {
																const isCustom = window.confirm(
																	"Regenerate as a CUSTOM box reference? (Cancel for Standard)",
																);
																let itemNumber: string | undefined;
																if (isCustom) {
																	const promptVal = window.prompt(
																		"Enter Item Number for reference (optional, will use first item if empty):",
																	);
																	if (promptVal === null) return; // User cancelled prompt
																	itemNumber = promptVal || undefined;
																}
																regenerateReferenceMutation.mutate({
																	instanceId: instance.id,
																	isCustom,
																	itemNumber,
																	categoryLabel: getSeiCategoryName(
																		selectedPackage.original_pkg_info
																			?.sei_category,
																	) as string,
																});
															}}
															disabled={regenerateReferenceMutation.isPending}
															className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
															title="Regenerate Reference"
														>
															{regenerateReferenceMutation.isPending ? (
																<Loader2 className="w-4 h-4 animate-spin" />
															) : (
																<RefreshCw className="w-4 h-4" />
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
					originalEditable={true}
					finalEditable={false}
				/>
				<TwoTierCard
					label="S.E.I"
					original={getPackingTypeName(
						selectedPackage.original_pkg_info?.packing_type_id,
					)}
					final={selectedPackage.final_pkg_info?.packing_type_id}
					type="select"
					selectItems={packingTypeOptions}
					onChangeOriginal={(v) =>
						handleUpdate("packing_type_id", v, "original")
					}
					originalEditable={true}
					finalEditable={false}
				/>
				<TwoTierCard
					label="SEI Category"
					original={getSeiCategoryName(
						selectedPackage.original_pkg_info?.sei_category,
					)}
					final={selectedPackage.final_pkg_info?.sei_category}
					type="select"
					selectItems={seiCategoryOptions}
					onChangeOriginal={(v) =>
						handleUpdate("sei_category", v ? Number(v) : null, "original")
					}
					originalEditable={true}
					finalEditable={false}
				/>
				<TwoTierCard
					label="SEI Protection"
					original={getSeiProtectionName(
						selectedPackage.original_pkg_info?.sei_protection,
					)}
					final={selectedPackage.final_pkg_info?.sei_protection}
					type="select"
					selectItems={seiProtectionOptions}
					onChangeOriginal={(v) =>
						handleUpdate("sei_protection", v ? Number(v) : null, "original")
					}
					originalEditable={true}
					finalEditable={false}
				/>
				<TwoTierCard
					label="Box Type"
					original={getBoxTypeName(
						selectedPackage.original_pkg_info?.box_type_id,
					)}
					final={selectedPackage.final_pkg_info?.box_type_id}
					type="select"
					selectItems={boxTypeOptions}
					onChangeOriginal={(v) => handleUpdate("box_type_id", v, "original")}
					originalEditable={true}
					finalEditable={false}
					className="flex-[1.3]"
				/>
				<TwoTierCard
					label="Tare"
					original={selectedPackage.original_pkg_info?.tare}
					final={selectedPackage.final_pkg_info?.tare}
					type="number"
					onChangeOriginal={(v) => handleUpdate("tare", v, "original")}
					originalEditable={true}
					finalEditable={false}
					className="flex-[1.2]"
				/>
				<TwoTierCard
					label="Net Weight"
					original={selectedPackage.original_pkg_info?.net_weight}
					final={selectedPackage.final_pkg_info?.net_weight}
					type="number"
					onChangeOriginal={(v) => handleUpdate("net_weight", v, "original")}
					originalEditable={true}
					finalEditable={false}
					className="flex-[1.3]"
				/>
				<TwoTierCard
					label="Gross Weight"
					original={selectedPackage.original_pkg_info?.gross_weight}
					final={selectedPackage.final_pkg_info?.gross_weight}
					type="number"
					onChangeOriginal={(v) => handleUpdate("gross_weight", v, "original")}
					originalEditable={true}
					finalEditable={false}
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
					originalEditable={true}
					finalEditable={false}
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
					finalEditable={false}
					onChangeOriginal={(patch) => {
						if (patch.length !== undefined)
							handleUpdate("internal_length", patch.length, "original");
						if (patch.width !== undefined)
							handleUpdate("internal_width", patch.width, "original");
						if (patch.height !== undefined)
							handleUpdate("internal_height", patch.height, "original");
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
					finalEditable={false}
					onChangeOriginal={(patch) => {
						if (patch.length !== undefined)
							handleUpdate("external_length", patch.length, "original");
						if (patch.width !== undefined)
							handleUpdate("external_width", patch.width, "original");
						if (patch.height !== undefined)
							handleUpdate("external_height", patch.height, "original");
					}}
				/>
			</div>
		</div>
	);
}
