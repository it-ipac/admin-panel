import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { packageItemSchema, validateInput } from "@/lib/validation";

export interface ItemFormState {
	designation: string;
	quantity: number;
	length: string | number;
	width: string | number;
	height: string | number;
	items_db_id: string;
}

/**
 * Form state + submit logic for the "Add Package Item" modal
 * (custom item or inventory pkd_item).
 */
export function useAddItemForm(deps: {
	selectedPackageId: string | null;
	addPackageItemMutation: UseMutationResult<
		any,
		Error,
		{
			order_package_id: string;
			designation: string;
			quantity: number;
			length?: number | null;
			width?: number | null;
			height?: number | null;
		}
	>;
	addPkdItemMutation: UseMutationResult<
		any,
		Error,
		{ pkg_instance_id: string; maintenance_db_id: string; quantity: number }
	>;
}) {
	const [showAddItemModal, setShowAddItemModal] = useState(false);
	const [itemSource, setItemSource] = useState<"custom" | "inventory">(
		"custom",
	);
	const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
	const [itemForm, setItemForm] = useState<ItemFormState>({
		designation: "",
		quantity: 1,
		length: "",
		width: "",
		height: "",
		items_db_id: "",
	});
	const [itemValidationErrors, setItemValidationErrors] = useState<
		Record<string, string>
	>({});

	const resetItemForm = (): void => {
		setItemForm({
			designation: "",
			quantity: 1,
			length: "",
			width: "",
			height: "",
			items_db_id: "",
		});
		setItemSource("custom");
		setSelectedInstanceId("");
		setItemValidationErrors({});
	};

	const handleAddItem = async (): Promise<void> => {
		if (!deps.selectedPackageId) return;

		if (itemSource === "inventory") {
			if (!selectedInstanceId) {
				setItemValidationErrors((prev) => ({
					...prev,
					instance: "Please select a box",
				}));
				return;
			}
			if (!itemForm.items_db_id) {
				setItemValidationErrors((prev) => ({
					...prev,
					items_db: "Please select an item from inventory",
				}));
				return;
			}

			try {
				await deps.addPkdItemMutation.mutateAsync({
					pkg_instance_id: selectedInstanceId,
					maintenance_db_id: itemForm.items_db_id,
					quantity: itemForm.quantity,
				});
				setShowAddItemModal(false);
				resetItemForm();
			} catch (err: any) {
				setItemValidationErrors((prev) => ({
					...prev,
					quantity: err.message || "Failed to add inventory item",
				}));
			}
		} else {
			// Validate input
			const validation = validateInput(packageItemSchema, {
				designation: itemForm.designation,
				quantity: itemForm.quantity,
				length: itemForm.length !== "" ? Number(itemForm.length) : null,
				width: itemForm.width !== "" ? Number(itemForm.width) : null,
				height: itemForm.height !== "" ? Number(itemForm.height) : null,
			});

			if (!validation.success) {
				setItemValidationErrors(validation.errors);
				return;
			}

			setItemValidationErrors({});

			await deps.addPackageItemMutation.mutateAsync({
				order_package_id: deps.selectedPackageId,
				...validation.data,
			});
			setShowAddItemModal(false);
			resetItemForm();
		}
	};

	return {
		showAddItemModal,
		setShowAddItemModal,
		itemSource,
		setItemSource,
		selectedInstanceId,
		setSelectedInstanceId,
		itemForm,
		setItemForm,
		itemValidationErrors,
		setItemValidationErrors,
		resetItemForm,
		handleAddItem,
	};
}
