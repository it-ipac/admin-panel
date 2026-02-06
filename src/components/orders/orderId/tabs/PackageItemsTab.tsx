import type { UseMutationResult } from "@tanstack/react-query";
import { Camera, Check, Edit, Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

export interface PackageItem {
	id: string;
	order_package_id: string;
	quantity: number;
	designation: string;
	length: number | null;
	width: number | null;
	height: number | null;
}

interface PackageItemsTabProps {
	selectedPackageItems: PackageItem[];
	updatePackageItemMutation: UseMutationResult<
		PackageItem,
		Error,
		{
			id: string;
			designation?: string;
			quantity?: number;
			length?: number | null;
			width?: number | null;
			height?: number | null;
		}
	>;
	deletePackageItemMutation: UseMutationResult<void, Error, string>;
	setShowAddItemModal: (show: boolean) => void;
}

interface ItemFormState {
	designation: string;
	quantity: number;
	length: string | number;
	width: string | number;
	height: string | number;
}

export function PackageItemsTab({
	selectedPackageItems,
	updatePackageItemMutation,
	deletePackageItemMutation,
	setShowAddItemModal,
}: PackageItemsTabProps) {
	const [editingItem, setEditingItem] = useState<PackageItem | null>(null);
	const [itemForm, setItemForm] = useState<ItemFormState>({
		designation: "",
		quantity: 1,
		length: "",
		width: "",
		height: "",
	});

	const resetItemForm = () => {
		setItemForm({
			designation: "",
			quantity: 1,
			length: "",
			width: "",
			height: "",
		});
		setEditingItem(null);
	};

	const handleUpdateItem = async () => {
		if (!editingItem) return;

		await updatePackageItemMutation.mutateAsync({
			id: editingItem.id,
			designation: itemForm.designation,
			quantity: itemForm.quantity,
			length: itemForm.length !== "" ? Number(itemForm.length) : null,
			width: itemForm.width !== "" ? Number(itemForm.width) : null,
			height: itemForm.height !== "" ? Number(itemForm.height) : null,
		});

		setEditingItem(null);
		resetItemForm();
	};

	const handleDeleteItem = async (id: string) => {
		if (confirm("Are you sure you want to delete this item?")) {
			await deletePackageItemMutation.mutateAsync(id);
		}
	};

	const startEditItem = (item: PackageItem) => {
		setEditingItem(item);
		setItemForm({
			designation: item.designation,
			quantity: item.quantity,
			length: item.length ?? "",
			width: item.width ?? "",
			height: item.height ?? "",
		});
	};

	return (
		<div className="m-1 bg-white rounded-xl border border-gray-500 overflow-hidden">
			<div className="px-4 py-2 border-b border-gray-200 bg-white flex justify-between items-center">
				<h3 className="text-blue-800 font-semibold">Packing Items</h3>
				<button
					onClick={() => {
						resetItemForm();
						setShowAddItemModal(true);
					}}
					className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
				>
					<Plus className="w-3 h-3" />
					Add
				</button>
			</div>

			{selectedPackageItems.length > 0 ? (
				<div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
					{selectedPackageItems.map((item, idx) => (
						<div
							key={item.id}
							className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-gray-400 ${
								idx % 2 === 0 ? "bg-white" : "bg-slate-50"
							}`}
						>
							{editingItem?.id === item.id ? (
								<div className="w-full space-y-2">
									<div className="flex gap-2">
										<input
											type="number"
											value={itemForm.quantity}
											onChange={(e) =>
												setItemForm((f) => ({
													...f,
													quantity: Number(e.target.value),
												}))
											}
											className="w-16 px-2 py-1 border rounded text-sm"
											placeholder="Qty"
										/>
										<input
											type="text"
											value={itemForm.designation}
											onChange={(e) =>
												setItemForm((f) => ({
													...f,
													designation: e.target.value,
												}))
											}
											className="flex-1 px-2 py-1 border rounded text-sm"
											placeholder="Designation"
										/>
									</div>
									<div className="flex gap-2 items-center">
										<input
											type="number"
											placeholder="L"
											value={itemForm.length}
											onChange={(e) =>
												setItemForm((f) => ({ ...f, length: e.target.value }))
											}
											className="w-16 px-2 py-1 border rounded text-sm"
										/>
										<span className="text-gray-400">×</span>
										<input
											type="number"
											placeholder="W"
											value={itemForm.width}
											onChange={(e) =>
												setItemForm((f) => ({ ...f, width: e.target.value }))
											}
											className="w-16 px-2 py-1 border rounded text-sm"
										/>
										<span className="text-gray-400">×</span>
										<input
											type="number"
											placeholder="H"
											value={itemForm.height}
											onChange={(e) =>
												setItemForm((f) => ({ ...f, height: e.target.value }))
											}
											className="w-16 px-2 py-1 border rounded text-sm"
										/>

										<div className="flex gap-1 ml-auto">
											<button
												onClick={handleUpdateItem}
												disabled={updatePackageItemMutation.isPending}
												className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
											>
												{updatePackageItemMutation.isPending ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<Check className="w-4 h-4" />
												)}
											</button>
											<button
												onClick={() => setEditingItem(null)}
												className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
											>
												<X className="w-4 h-4" />
											</button>
										</div>
									</div>
								</div>
							) : (
								<>
									<div className="flex items-baseline gap-2 mb-2 md:mb-0">
										<span className="text-gray-700 font-semibold">Item;</span>
										<span className="text-gray-800 font-medium">
											{item.quantity ?? "—"}
										</span>
										<span className="text-gray-700">
											{item.designation || "—"}
										</span>
										{(item.length || item.width || item.height) && (
											<span className="text-xs text-gray-500 ml-2">
												({item.length ?? "-"}×{item.width ?? "-"}×
												{item.height ?? "-"})
											</span>
										)}
									</div>

									<div className="flex items-center gap-2 self-end md:self-auto">
										<button className="p-2 rounded bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
											<Camera size={18} />
										</button>
										<div className="h-6 w-px bg-gray-300 mx-1"></div>
										<button
											onClick={() => startEditItem(item)}
											className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
										>
											<Edit size={16} />
										</button>
										<button
											onClick={() => handleDeleteItem(item.id)}
											disabled={deletePackageItemMutation.isPending}
											className="p-1.5 text-red-600 hover:bg-red-50 rounded"
										>
											<Trash2 size={16} />
										</button>
									</div>
								</>
							)}
						</div>
					))}
				</div>
			) : (
				<div className="p-8 text-center text-gray-500">
					<p>No items found for this box.</p>
				</div>
			)}
		</div>
	);
}
