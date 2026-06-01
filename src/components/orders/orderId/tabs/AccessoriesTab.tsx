import {
	Camera,
	Check,
	Edit,
	Loader2,
	Plus,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { useState } from "react";
import type { PackageMaterial } from "@/routes/orders/$orderId";

interface AccessoriesTabProps {
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

export function AccessoriesTab({
	selectedPackageMaterials,
	updatePackageMaterialMutation,
	deletePackageMaterialMutation,
	setMaterialType,
	resetMaterialForm,
	setShowAddMaterialModal,
}: AccessoriesTabProps) {
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

	const handleDeleteMaterial = async (id: string) => {
		if (confirm("Are you sure you want to delete this material?")) {
			await deletePackageMaterialMutation.mutateAsync(id);
		}
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
			<div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
				<h3 className="text-lg font-semibold text-gray-800">Accessories</h3>
				<div className="flex gap-2">
					<button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm">
						<Camera className="w-4 h-4" />
						View Images
					</button>
					<button
						onClick={() => {
							resetMaterialForm();
							setMaterialType("Accessories");
							setShowAddMaterialModal(true);
						}}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm"
					>
						<Plus className="w-4 h-4" />
						Add Accessory
					</button>
				</div>
			</div>

			{selectedPackageMaterials.accessories.length > 0 ? (
				<div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden shadow-sm">
					<div className="overflow-x-auto">
						<table className="w-full text-sm text-left border-collapse">
							<thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold border-b-2 border-gray-300">
								<tr>
									<th className="py-3 px-4 border-r-2 border-gray-300">
										Accessory
									</th>
									<th className="py-3 px-4 text-center border-r-2 border-gray-300">
										Qty
									</th>
									<th className="py-3 px-4 text-center border-r-2 border-gray-300">
										Dimensions
									</th>
									<th className="py-3 px-4 text-center border-r-2 border-gray-300">
										Status
									</th>
									<th className="py-3 px-4 text-center border-r-2 border-gray-300">
										Used
									</th>
									<th className="py-3 px-4 border-r-2 border-gray-300">
										Comment
									</th>
									<th className="py-3 px-4 text-center">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y-2 divide-gray-300">
								{selectedPackageMaterials.accessories.map((material, idx) => (
									<tr
										key={material.id}
										className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50"} hover:bg-blue-100 transition-colors`}
									>
										{editingMaterial?.id === material.id ? (
											<>
												<td className="py-2 px-4 border-r-2 border-gray-300">
													<span className="font-medium text-gray-900">
														{material.variant_name}
													</span>
												</td>
												<td className="py-2 px-4 border-r-2 border-gray-300">
													<input
														type="number"
														value={materialForm.quantity}
														onChange={(e) =>
															setMaterialForm((f) => ({
																...f,
																quantity: Number(e.target.value),
															}))
														}
														className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
														min={1}
													/>
												</td>
												<td className="py-2 px-4 border-r-2 border-gray-300">
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
															className="w-12 px-1 py-1 border border-gray-300 rounded text-sm text-center"
														/>
														<span className="text-gray-400">×</span>
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
															className="w-12 px-1 py-1 border border-gray-300 rounded text-sm text-center"
														/>
														<span className="text-gray-400">×</span>
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
															className="w-12 px-1 py-1 border border-gray-300 rounded text-sm text-center"
														/>
													</div>
												</td>
												<td className="py-2 px-4 text-center border-r-2 border-gray-300">
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
															className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
														/>
														Final
													</label>
												</td>
												<td className="py-2 px-4 text-center border-r-2 border-gray-300">
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
															className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
														/>
														Used
													</label>
												</td>
												<td className="py-2 px-4 border-r-2 border-gray-300">
													<input
														type="text"
														value={materialForm.comment}
														onChange={(e) =>
															setMaterialForm((f) => ({
																...f,
																comment: e.target.value,
															}))
														}
														className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
														placeholder="Comment"
													/>
												</td>
												<td className="py-2 px-4">
													<div className="flex gap-2 justify-center">
														<button
															onClick={handleUpdateMaterial}
															disabled={updatePackageMaterialMutation.isPending}
															className="p-1.5 text-white bg-green-600 hover:bg-green-700 rounded shadow-sm transition-colors"
														>
															{updatePackageMaterialMutation.isPending ? (
																<Loader2 className="w-4 h-4 animate-spin" />
															) : (
																<Check className="w-4 h-4" />
															)}
														</button>
														<button
															onClick={() => setEditingMaterial(null)}
															className="p-1.5 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded shadow-sm transition-colors"
														>
															<X className="w-4 h-4" />
														</button>
													</div>
												</td>
											</>
										) : (
											<>
												<td className="py-3 px-4 border-r-2 border-gray-300">
													<div className="flex flex-col">
														<span className="font-semibold text-gray-900">
															{material.variant_name}
														</span>
														{material.material_name && (
															<span className="text-gray-500 text-xs">
																({material.material_name})
															</span>
														)}
													</div>
												</td>
												<td className="py-3 px-4 text-center border-r-2 border-gray-300 font-medium text-gray-700">
													{material.quantity}
													{material.unit_name ? ` ${material.unit_name}` : ""}
												</td>
												<td className="py-3 px-4 text-center text-gray-600 border-r-2 border-gray-300 font-mono text-xs">
													{material.length || material.width ? (
														`${material.length ?? "-"} × ${material.width ?? "-"}${material.height ? ` × ${material.height}` : ""}`
													) : (
														<span className="text-gray-400">—</span>
													)}
												</td>
												<td className="py-3 px-4 text-center border-r-2 border-gray-300">
													<span
														className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
															material.is_final
																? "bg-green-50 text-green-700 border-green-200"
																: "bg-yellow-50 text-yellow-700 border-yellow-200"
														}`}
													>
														{material.is_final ? "Final" : "Original"}
													</span>
												</td>
												<td className="py-3 px-4 text-center border-r-2 border-gray-300">
													<span
														className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
															material.item_used
																? "bg-green-50 text-green-700 border-green-200"
																: "bg-gray-50 text-gray-700 border-gray-200"
														}`}
													>
														{material.item_used ? "Yes" : "No"}
													</span>
												</td>
												<td className="py-3 px-4 text-gray-600 border-r-2 border-gray-300 max-w-xs truncate">
													{material.comment || (
														<span className="text-gray-400 italic">
															No comment
														</span>
													)}
												</td>
												<td className="py-3 px-4">
													<div className="flex gap-2 justify-center">
														<button
															onClick={() => startEditMaterial(material)}
															className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
														>
															<Edit className="w-4 h-4" />
														</button>
														<button
															onClick={() => handleDeleteMaterial(material.id)}
															disabled={deletePackageMaterialMutation.isPending}
															className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
				<div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
					<Sparkles className="w-12 h-12 text-gray-300 mb-3" />
					<p className="text-gray-500 font-medium">No accessories added yet</p>
					<p className="text-sm text-gray-400 mt-1">
						Click "Add Accessory" to get started
					</p>
				</div>
			)}
		</div>
	);
}
