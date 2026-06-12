import { Check, Edit, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { PackageMaterial } from "@/routes/orders/$orderId";

interface SecuringTabProps {
	selectedPackageMaterials: {
		accessories: PackageMaterial[];
		securing: PackageMaterial[];
	};
	updatePackageMaterialMutation: any;
	deletePackageMaterialMutation: any;
	setMaterialType: (type: string) => void;
	resetMaterialForm: () => void;
	setShowAddMaterialModal: (show: boolean) => void;
}

export function SecuringTab({
	selectedPackageMaterials,
	updatePackageMaterialMutation,
	deletePackageMaterialMutation,
	setMaterialType,
	resetMaterialForm,
	setShowAddMaterialModal,
}: SecuringTabProps) {
	const [editingMaterial, setEditingMaterial] =
		useState<PackageMaterial | null>(null);
	const [materialForm, setMaterialForm] = useState({
		material_variant_id: "",
		quantity: 1,
		unit_id: "",
		length: "",
		width: "",
		height: "",
		comment: "",
		is_final: false,
		item_used: false,
	});

	const handleUpdateMaterial = async () => {
		if (!editingMaterial) return;

		await updatePackageMaterialMutation.mutateAsync({
			id: editingMaterial.id,
			quantity: materialForm.quantity,
			length: materialForm.length !== "" ? Number(materialForm.length) : null,
			width: materialForm.width !== "" ? Number(materialForm.width) : null,
			height: materialForm.height !== "" ? Number(materialForm.height) : null,
			comment: materialForm.comment || null,
			is_final: materialForm.is_final,
			item_used: materialForm.item_used,
		});

		setEditingMaterial(null);
		setMaterialForm({
			material_variant_id: "",
			quantity: 1,
			unit_id: "",
			length: "",
			width: "",
			height: "",
			comment: "",
			is_final: false,
			item_used: false,
		});
	};

	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

	const handleDeleteMaterial = (id: string) => {
		setDeleteTargetId(id);
	};

	const confirmDeleteMaterial = async () => {
		if (!deleteTargetId) return;
		await deletePackageMaterialMutation.mutateAsync(deleteTargetId);
		setDeleteTargetId(null);
	};

	const startEditMaterial = (material: PackageMaterial) => {
		setEditingMaterial(material);
		setMaterialForm({
			material_variant_id: material.material_variant_id,
			quantity: material.quantity,
			unit_id: material.unit_id || "",
			length:
				material.length !== null && material.length !== undefined
					? String(material.length)
					: "",
			width:
				material.width !== null && material.width !== undefined
					? String(material.width)
					: "",
			height:
				material.height !== null && material.height !== undefined
					? String(material.height)
					: "",
			comment: material.comment || "",
			is_final: material.is_final,
			item_used: material.item_used,
		});
	};

	return (
		<div className="space-y-4">
			{/* Header Section */}
			<div className="flex items-center justify-between bg-white p-4 rounded-lg border border-neutral-200">
				<h3 className="text-lg font-semibold text-neutral-800">Securing</h3>
				<div className="flex gap-2">
					<button
						onClick={() => {
							resetMaterialForm();
							setMaterialType("Securing");
							setShowAddMaterialModal(true);
						}}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-success-600 rounded-md hover:bg-success-700 shadow-sm"
					>
						<Plus className="w-4 h-4" />
						Add Securing Material
					</button>
				</div>
			</div>

			{selectedPackageMaterials.securing.length > 0 ? (
				<div className="bg-white rounded-lg border-2 border-neutral-300 overflow-hidden shadow-sm">
					<div className="overflow-x-auto">
						<table className="w-full text-sm text-left border-collapse">
							<thead className="bg-neutral-100 text-neutral-700 uppercase text-xs font-bold border-b-2 border-neutral-300">
								<tr>
									<th className="py-3 px-4 border-r-2 border-neutral-300">
										Material
									</th>
									<th className="py-3 px-4 text-center border-r-2 border-neutral-300">
										Qty
									</th>
									<th className="py-3 px-4 text-center border-r-2 border-neutral-300">
										Dimensions
									</th>
									<th className="py-3 px-4 text-center border-r-2 border-neutral-300">
										Status
									</th>
									<th className="py-3 px-4 text-center border-r-2 border-neutral-300">
										Used
									</th>
									<th className="py-3 px-4 border-r-2 border-neutral-300">
										Comment
									</th>
									<th className="py-3 px-4 text-center">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y-2 divide-neutral-300">
								{selectedPackageMaterials.securing.map((material, idx) => (
									<tr
										key={material.id}
										className={`${idx % 2 === 0 ? "bg-white" : "bg-primary-50"} hover:bg-primary-100 transition-colors`}
									>
										{editingMaterial?.id === material.id ? (
											<>
												<td className="py-2 px-4 border-r-2 border-neutral-300">
													<span className="font-medium text-neutral-900">
														{material.variant_name}
													</span>
												</td>
												<td className="py-2 px-4 border-r-2 border-neutral-300">
													<input
														type="number"
														value={materialForm.quantity}
														onChange={(e) =>
															setMaterialForm((f) => ({
																...f,
																quantity: Number(e.target.value),
															}))
														}
														className="w-16 px-2 py-1 border border-neutral-300 rounded text-sm text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
														min={1}
													/>
												</td>
												<td className="py-2 px-4 border-r-2 border-neutral-300">
													<div className="flex gap-1 justify-center items-center">
														<input
															type="number"
															placeholder="L"
															value={materialForm.length}
															onChange={(e) =>
																setMaterialForm((f) => ({
																	...f,
																	length: e.target.value,
																}))
															}
															className="w-12 px-1 py-1 border border-neutral-300 rounded text-sm text-center"
														/>
														<span className="text-neutral-400">×</span>
														<input
															type="number"
															placeholder="W"
															value={materialForm.width}
															onChange={(e) =>
																setMaterialForm((f) => ({
																	...f,
																	width: e.target.value,
																}))
															}
															className="w-12 px-1 py-1 border border-neutral-300 rounded text-sm text-center"
														/>
														<span className="text-neutral-400">×</span>
														<input
															type="number"
															placeholder="H"
															value={materialForm.height}
															onChange={(e) =>
																setMaterialForm((f) => ({
																	...f,
																	height: e.target.value,
																}))
															}
															className="w-12 px-1 py-1 border border-neutral-300 rounded text-sm text-center"
														/>
													</div>
												</td>
												<td className="py-2 px-4 text-center border-r-2 border-neutral-300">
													<label className="flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer select-none">
														<input
															type="checkbox"
															checked={materialForm.is_final}
															onChange={(e) =>
																setMaterialForm((f) => ({
																	...f,
																	is_final: e.target.checked,
																}))
															}
															className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
														/>
														Final
													</label>
												</td>
												<td className="py-2 px-4 text-center border-r-2 border-neutral-300">
													<label className="flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer select-none">
														<input
															type="checkbox"
															checked={materialForm.item_used}
															onChange={(e) =>
																setMaterialForm((f) => ({
																	...f,
																	item_used: e.target.checked,
																}))
															}
															className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
														/>
														Used
													</label>
												</td>
												<td className="py-2 px-4 border-r-2 border-neutral-300">
													<input
														type="text"
														value={materialForm.comment}
														onChange={(e) =>
															setMaterialForm((f) => ({
																...f,
																comment: e.target.value,
															}))
														}
														className="w-full px-2 py-1 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
														placeholder="Comment"
													/>
												</td>
												<td className="py-2 px-4">
													<div className="flex gap-2 justify-center">
														<button
															onClick={handleUpdateMaterial}
															disabled={updatePackageMaterialMutation.isPending}
															className="p-1.5 text-white bg-success-600 hover:bg-success-700 rounded shadow-sm transition-colors"
														>
															{updatePackageMaterialMutation.isPending ? (
																<Loader2 className="w-4 h-4 animate-spin" />
															) : (
																<Check className="w-4 h-4" />
															)}
														</button>
														<button
															onClick={() => setEditingMaterial(null)}
															className="p-1.5 text-neutral-700 bg-neutral-200 hover:bg-neutral-300 rounded shadow-sm transition-colors"
														>
															<X className="w-4 h-4" />
														</button>
													</div>
												</td>
											</>
										) : (
											<>
												<td className="py-3 px-4 border-r-2 border-neutral-300">
													<div className="flex flex-col">
														<span className="font-semibold text-neutral-900">
															{material.variant_name}
														</span>
														{material.material_name && (
															<span className="text-neutral-500 text-xs">
																({material.material_name})
															</span>
														)}
													</div>
												</td>
												<td className="py-3 px-4 text-center border-r-2 border-neutral-300 font-medium text-neutral-700">
													{material.quantity}
													{material.unit_name ? ` ${material.unit_name}` : ""}
												</td>
												<td className="py-3 px-4 text-center text-neutral-600 border-r-2 border-neutral-300 font-mono text-xs">
													{material.length ||
													material.width ||
													material.height ? (
														`${material.length ?? "—"} × ${material.width ?? "—"}${material.height ? ` × ${material.height}` : ""}`
													) : (
														<span className="text-neutral-400">—</span>
													)}
												</td>
												<td className="py-3 px-4 text-center border-r-2 border-neutral-300">
													<span
														className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
															material.is_final
																? "bg-success-50 text-success-700 border-success-200"
																: "bg-warning-50 text-warning-700 border-warning-200"
														}`}
													>
														{material.is_final ? "Final" : "Original"}
													</span>
												</td>
												<td className="py-3 px-4 text-center border-r-2 border-neutral-300">
													<span
														className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
															material.item_used
																? "bg-success-50 text-success-700 border-success-200"
																: "bg-neutral-50 text-neutral-700 border-neutral-200"
														}`}
													>
														{material.item_used ? "Yes" : "No"}
													</span>
												</td>
												<td className="py-3 px-4 text-neutral-600 border-r-2 border-neutral-300 max-w-xs truncate">
													{material.comment || (
														<span className="text-neutral-400 italic">
															No comment
														</span>
													)}
												</td>
												<td className="py-3 px-4">
													<div className="flex gap-2 justify-center">
														<button
															onClick={() => startEditMaterial(material)}
															className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
														>
															<Edit className="w-4 h-4" />
														</button>
														<button
															onClick={() => handleDeleteMaterial(material.id)}
															disabled={deletePackageMaterialMutation.isPending}
															className="p-1.5 text-danger-600 hover:bg-danger-50 rounded transition-colors"
														>
															<Trash2 className="w-4 h-4" />
														</button>
													</div>
												</td>
											</>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			) : (
				<div className="flex flex-col items-center justify-center p-12 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-300">
					<Sparkles className="w-12 h-12 text-neutral-300 mb-3" />
					<p className="text-neutral-500 font-medium">
						No securing materials added yet
					</p>
					<p className="text-sm text-neutral-400 mt-1">
						Click "Add Securing Material" to get started
					</p>
				</div>
			)}

			<ConfirmDialog
				open={deleteTargetId !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteTargetId(null);
				}}
				title="Delete material?"
				description="This will remove the securing material from this package. This action cannot be undone."
				pending={deletePackageMaterialMutation.isPending}
				onConfirm={confirmDeleteMaterial}
			/>
		</div>
	);
}
