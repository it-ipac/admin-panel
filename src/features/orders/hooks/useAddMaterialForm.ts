import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { packageMaterialSchema, validateInput } from "@/lib/validation";

export interface MaterialFormState {
	material_variant_id: string;
	quantity: number;
	unit_id: string;
	length: string | number;
	width: string | number;
	height: string | number;
	comment: string;
	is_final: boolean;
	item_used: boolean;
}

/**
 * Form state + submit logic for the "Add Material" modal. The material
 * type is pre-set by the Accessories/Securing tabs before opening.
 */
export function useAddMaterialForm(deps: {
	selectedPackageId: string | null;
	addPackageMaterialMutation: UseMutationResult<
		any,
		Error,
		{
			order_package_id: string;
			material_variant_id: string;
			material_type: string;
			is_final: boolean;
			quantity: number;
			unit_id?: string | null;
			length?: number | null;
			width?: number | null;
			height?: number | null;
			comment?: string | null;
			item_used?: boolean;
		}
	>;
}) {
	const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
	const [materialType, setMaterialType] = useState<string>("Accessories");
	const [materialForm, setMaterialForm] = useState<MaterialFormState>({
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
	const [materialValidationErrors, setMaterialValidationErrors] = useState<
		Record<string, string>
	>({});

	const resetMaterialForm = (): void => {
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
		setMaterialValidationErrors({});
	};

	const handleAddMaterial = async (): Promise<void> => {
		if (!deps.selectedPackageId) return;

		// Validate input
		const validation = validateInput(packageMaterialSchema, {
			material_variant_id: materialForm.material_variant_id,
			quantity: materialForm.quantity,
			unit_id: materialForm.unit_id || null,
			length: materialForm.length !== "" ? Number(materialForm.length) : null,
			width: materialForm.width !== "" ? Number(materialForm.width) : null,
			height: materialForm.height !== "" ? Number(materialForm.height) : null,
			comment: materialForm.comment || null,
			is_final: materialForm.is_final,
			item_used: materialForm.item_used,
		});

		if (!validation.success) {
			setMaterialValidationErrors(validation.errors);
			return;
		}

		setMaterialValidationErrors({});

		await deps.addPackageMaterialMutation.mutateAsync({
			order_package_id: deps.selectedPackageId,
			material_type: materialType,
			...validation.data,
		});

		setShowAddMaterialModal(false);
		resetMaterialForm();
	};

	return {
		showAddMaterialModal,
		setShowAddMaterialModal,
		materialType,
		setMaterialType,
		materialForm,
		setMaterialForm,
		materialValidationErrors,
		setMaterialValidationErrors,
		resetMaterialForm,
		handleAddMaterial,
	};
}
