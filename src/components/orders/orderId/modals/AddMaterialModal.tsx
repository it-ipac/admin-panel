import * as Dialog from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import type { MaterialFormState } from "@/features/orders/hooks/useAddMaterialForm";

interface AddMaterialModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	materialType: string;
	setMaterialType: (type: string) => void;
	materialForm: MaterialFormState;
	setMaterialForm: React.Dispatch<React.SetStateAction<MaterialFormState>>;
	materialValidationErrors: Record<string, string>;
	setMaterialValidationErrors: React.Dispatch<
		React.SetStateAction<Record<string, string>>
	>;
	availableMaterials:
		| { id: string; variant_name: string; material_name: string | undefined }[]
		| undefined;
	availableUnits: { id: string; name: string }[] | undefined;
	onSubmit: () => void;
	isSubmitting: boolean;
}

/** "Add Material" modal for accessories / manufacturing materials. */
export function AddMaterialModal({
	open,
	onOpenChange,
	materialType,
	setMaterialType,
	materialForm,
	setMaterialForm,
	materialValidationErrors,
	setMaterialValidationErrors,
	availableMaterials,
	availableUnits,
	onSubmit,
	isSubmitting,
}: AddMaterialModalProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
					<Dialog.Title className="text-lg font-semibold text-neutral-900 mb-4">
						Add{" "}
						{materialType === "Accessories"
							? "Accessory"
							: "Manufacturing Material"}
					</Dialog.Title>
					<Dialog.Description className="sr-only">
						Add a new material to this package
					</Dialog.Description>

					<div className="space-y-4">
						<div>
							<label
								htmlFor="add-material-type"
								className="block text-sm font-medium text-neutral-700 mb-1"
							>
								Material Type
							</label>
							<select
								id="add-material-type"
								value={materialType}
								onChange={(e) => setMaterialType(e.target.value)}
								className="w-full px-3 py-2 border rounded-lg"
							>
								<option value="Accessories">Accessories</option>
								<option value="Big Sides">Big Sides</option>
								<option value="Small Sides">Small Sides</option>
								<option value="Lis">Lid</option>
								<option value="Base">Base</option>
								<option value="Body">Body</option>
								<option value="Securing">Securing</option>
								<option value="Vacuum Packing">Vacuum Packing</option>
								<option value="Gas Packing">Gas Packing</option>
							</select>
						</div>
						<div>
							<label
								htmlFor="add-material-variant"
								className="block text-sm font-medium text-neutral-700 mb-1"
							>
								Material Variant
							</label>
							<select
								id="add-material-variant"
								value={materialForm.material_variant_id}
								onChange={(e) => {
									setMaterialForm((f) => ({
										...f,
										material_variant_id: e.target.value,
									}));
									setMaterialValidationErrors((prev) => ({
										...prev,
										material_variant_id: "",
									}));
								}}
								className={`w-full px-3 py-2 border rounded-lg ${
									materialValidationErrors.material_variant_id
										? "border-danger-500 focus:ring-danger-500"
										: ""
								}`}
							>
								<option value="">Select a material...</option>
								{availableMaterials?.map((m) => (
									<option key={m.id} value={m.id}>
										{m.variant_name}{" "}
										{m.material_name ? `(${m.material_name})` : ""}
									</option>
								))}
							</select>
							{materialValidationErrors.material_variant_id && (
								<p className="mt-1 text-sm text-danger-600">
									{materialValidationErrors.material_variant_id}
								</p>
							)}
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="add-material-quantity"
									className="block text-sm font-medium text-neutral-700 mb-1"
								>
									Quantity
								</label>
								<input
									id="add-material-quantity"
									type="number"
									value={materialForm.quantity}
									onChange={(e) => {
										setMaterialForm((f) => ({
											...f,
											quantity: Number(e.target.value),
										}));
										setMaterialValidationErrors((prev) => ({
											...prev,
											quantity: "",
										}));
									}}
									className={`w-full px-3 py-2 border rounded-lg ${
										materialValidationErrors.quantity
											? "border-danger-500 focus:ring-danger-500"
											: ""
									}`}
									min={1}
								/>
								{materialValidationErrors.quantity && (
									<p className="mt-1 text-sm text-danger-600">
										{materialValidationErrors.quantity}
									</p>
								)}
							</div>
							<div>
								<label
									htmlFor="add-material-unit"
									className="block text-sm font-medium text-neutral-700 mb-1"
								>
									Unit
								</label>
								<select
									id="add-material-unit"
									value={materialForm.unit_id}
									onChange={(e) =>
										setMaterialForm((f) => ({
											...f,
											unit_id: e.target.value,
										}))
									}
									className="w-full px-3 py-2 border rounded-lg"
								>
									<option value="">Select unit...</option>
									{availableUnits?.map((u) => (
										<option key={u.id} value={u.id}>
											{u.name}
										</option>
									))}
								</select>
							</div>
						</div>
						<div>
							<p className="block text-sm font-medium text-neutral-700 mb-1">
								Dimensions (L × W × H)
							</p>
							<div className="grid grid-cols-3 gap-2">
								<input
									type="number"
									placeholder="Length"
									value={materialForm.length}
									onChange={(e) =>
										setMaterialForm((f) => ({
											...f,
											length: e.target.value,
										}))
									}
									className="px-3 py-2 border rounded-lg"
								/>
								<input
									type="number"
									placeholder="Width"
									value={materialForm.width}
									onChange={(e) =>
										setMaterialForm((f) => ({
											...f,
											width: e.target.value,
										}))
									}
									className="px-3 py-2 border rounded-lg"
								/>
								<input
									type="number"
									placeholder="Height"
									value={materialForm.height}
									onChange={(e) =>
										setMaterialForm((f) => ({
											...f,
											height: e.target.value,
										}))
									}
									className="px-3 py-2 border rounded-lg"
								/>
							</div>
						</div>
						<div>
							<label
								htmlFor="add-material-comment"
								className="block text-sm font-medium text-neutral-700 mb-1"
							>
								Comment
							</label>
							<input
								id="add-material-comment"
								type="text"
								value={materialForm.comment}
								onChange={(e) => {
									setMaterialForm((f) => ({
										...f,
										comment: e.target.value,
									}));
									setMaterialValidationErrors((prev) => ({
										...prev,
										comment: "",
									}));
								}}
								className={`w-full px-3 py-2 border rounded-lg ${
									materialValidationErrors.comment
										? "border-danger-500 focus:ring-danger-500"
										: ""
								}`}
								placeholder="Optional comment (max 2000 chars)"
							/>
							{materialValidationErrors.comment && (
								<p className="mt-1 text-sm text-danger-600">
									{materialValidationErrors.comment}
								</p>
							)}
						</div>
						<div className="flex gap-6">
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="is_final"
									checked={materialForm.is_final}
									onChange={(e) =>
										setMaterialForm((f) => ({
											...f,
											is_final: e.target.checked,
										}))
									}
									className="rounded"
								/>
								<label
									htmlFor="is_final"
									className="text-sm text-neutral-700 font-medium cursor-pointer"
								>
									Mark as Final
								</label>
							</div>
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="item_used"
									checked={materialForm.item_used}
									onChange={(e) =>
										setMaterialForm((f) => ({
											...f,
											item_used: e.target.checked,
										}))
									}
									className="rounded"
								/>
								<label
									htmlFor="item_used"
									className="text-sm text-neutral-700 font-medium cursor-pointer"
								>
									Used
								</label>
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<Dialog.Close asChild>
							<button className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg">
								Cancel
							</button>
						</Dialog.Close>
						<button
							onClick={onSubmit}
							disabled={isSubmitting}
							className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
						>
							{isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
							Add Material
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
