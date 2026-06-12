import type { UseMutationResult } from "@tanstack/react-query";
import { Camera, Check, Edit, Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface PackageItem {
	id: string;
	order_package_id?: string;
	quantity: number;
	designation: string;
	length: number | null;
	width: number | null;
	height: number | null;
	source: "custom" | "inventory";
	instance_number?: number;
	warehouse_location?: string;
	item_num?: string;
}

interface PackageItemsTabProps {
	selectedPackageItems: PackageItem[];
	updatePackageItemMutation: UseMutationResult<
		any,
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
	deletePkdItemMutation?: UseMutationResult<void, Error, string>;
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
	deletePkdItemMutation,
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

	const [deleteTarget, setDeleteTarget] = useState<PackageItem | null>(null);

	const handleDeleteItem = (item: PackageItem) => {
		setDeleteTarget(item);
	};

	const confirmDeleteItem = async () => {
		if (!deleteTarget) return;
		if (deleteTarget.source === "inventory") {
			await deletePkdItemMutation?.mutateAsync(deleteTarget.id);
		} else {
			await deletePackageItemMutation.mutateAsync(deleteTarget.id);
		}
		setDeleteTarget(null);
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
		<div className="m-1 bg-white rounded-xl border border-neutral-500 overflow-hidden">
			<div className="px-4 py-2 border-b border-neutral-200 bg-white flex justify-between items-center">
				<h3 className="text-primary-800 font-semibold">Packing Items</h3>
				<button
					onClick={() => {
						resetItemForm();
						setShowAddItemModal(true);
					}}
					className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
				>
					<Plus className="w-3 h-3" />
					Add
				</button>
			</div>

			{selectedPackageItems.length > 0 ? (
				<div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
					{selectedPackageItems.map((item, idx) => (
						<div
							key={`${item.source}-${item.id}`}
							className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-neutral-400 ${
								idx % 2 === 0 ? "bg-white" : "bg-neutral-50"
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
										<span className="text-neutral-400">×</span>
										<input
											type="number"
											placeholder="W"
											value={itemForm.width}
											onChange={(e) =>
												setItemForm((f) => ({ ...f, width: e.target.value }))
											}
											className="w-16 px-2 py-1 border rounded text-sm"
										/>
										<span className="text-neutral-400">×</span>
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
												className="p-1.5 bg-success-100 text-success-700 rounded hover:bg-success-200"
											>
												{updatePackageItemMutation.isPending ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<Check className="w-4 h-4" />
												)}
											</button>
											<button
												onClick={() => setEditingItem(null)}
												className="p-1.5 bg-neutral-100 text-neutral-700 rounded hover:bg-neutral-200"
											>
												<X className="w-4 h-4" />
											</button>
										</div>
									</div>
								</div>
							) : (
								<>
									<div className="flex flex-col gap-1 flex-1">
										<div className="flex items-baseline gap-2">
											<span className="text-neutral-700 font-semibold">
												Item;
											</span>
											<span className="text-neutral-800 font-medium">
												{item.quantity ?? "—"}
											</span>
											<span className="text-neutral-700">
												{item.designation || "—"}
											</span>
											{item.source === "inventory" && (
												<span className="px-1.5 py-0.5 text-[10px] bg-primary-100 text-primary-700 rounded uppercase font-bold">
													Inventory
												</span>
											)}
											{(item.length || item.width || item.height) && (
												<span className="text-xs text-neutral-500">
													({item.length ?? "-"}×{item.width ?? "-"}×
													{item.height ?? "-"})
												</span>
											)}
										</div>
										<div className="flex items-center gap-3 text-xs text-neutral-500">
											<div className="flex items-center gap-1">
												<span className="font-semibold text-neutral-400">
													Box:
												</span>
												<span
													className={
														item.source === "inventory"
															? "text-primary-600 font-bold"
															: ""
													}
												>
													{item.instance_number
														? `#${item.instance_number}`
														: "All"}
												</span>
											</div>
											{item.item_num && (
												<div className="flex items-center gap-1">
													<span className="font-semibold text-neutral-400">
														Ref:
													</span>
													<span>{item.item_num}</span>
												</div>
											)}
											{item.warehouse_location && (
												<div className="flex items-center gap-1">
													<span className="font-semibold text-neutral-400">
														Loc:
													</span>
													<span className="bg-neutral-100 px-1 rounded">
														{item.warehouse_location}
													</span>
												</div>
											)}
										</div>
									</div>

									<div className="flex items-center gap-2 self-end md:self-auto mt-2 md:mt-0">
										<button className="p-2 rounded bg-primary-600 text-white hover:bg-primary-700 shadow-sm">
											<Camera size={18} />
										</button>
										<div className="h-6 w-px bg-neutral-300 mx-1"></div>
										{item.source === "custom" && (
											<button
												onClick={() => startEditItem(item)}
												className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"
											>
												<Edit size={16} />
											</button>
										)}
										<button
											onClick={() => handleDeleteItem(item)}
											disabled={
												deletePackageItemMutation.isPending ||
												deletePkdItemMutation?.isPending
											}
											className="p-1.5 text-danger-600 hover:bg-danger-50 rounded"
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
				<div className="p-8 text-center text-neutral-500">
					<p>No items found for this box.</p>
				</div>
			)}

			<ConfirmDialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
				title="Delete item?"
				description={
					deleteTarget
						? `This will remove "${deleteTarget.designation}" from this box. This action cannot be undone.`
						: undefined
				}
				pending={
					deletePackageItemMutation.isPending ||
					(deletePkdItemMutation?.isPending ?? false)
				}
				onConfirm={confirmDeleteItem}
			/>
		</div>
	);
}
