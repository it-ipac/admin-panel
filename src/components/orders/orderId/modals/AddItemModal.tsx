import * as Dialog from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import type { ItemFormState } from "@/features/orders/hooks/useAddItemForm";
import type { PackageInstance } from "@/features/orders/types";

interface AddItemModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	itemSource: "custom" | "inventory";
	setItemSource: (source: "custom" | "inventory") => void;
	itemForm: ItemFormState;
	setItemForm: React.Dispatch<React.SetStateAction<ItemFormState>>;
	itemValidationErrors: Record<string, string>;
	setItemValidationErrors: React.Dispatch<
		React.SetStateAction<Record<string, string>>
	>;
	selectedInstanceId: string;
	setSelectedInstanceId: (id: string) => void;
	clientInventory: any[] | undefined;
	selectedPackageInstances: PackageInstance[];
	onSubmit: () => void;
	isSubmitting: boolean;
}

/** "Add Package Item" modal — custom item or inventory-linked item. */
export function AddItemModal({
	open,
	onOpenChange,
	itemSource,
	setItemSource,
	itemForm,
	setItemForm,
	itemValidationErrors,
	setItemValidationErrors,
	selectedInstanceId,
	setSelectedInstanceId,
	clientInventory,
	selectedPackageInstances,
	onSubmit,
	isSubmitting,
}: AddItemModalProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
					<Dialog.Title className="text-lg font-semibold text-neutral-900 mb-4">
						Add Package Item
					</Dialog.Title>
					<Dialog.Description className="sr-only">
						Add a new item to this package
					</Dialog.Description>

					<div className="flex p-1 bg-neutral-100 rounded-lg mb-6">
						<button
							onClick={() => setItemSource("custom")}
							className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
								itemSource === "custom"
									? "bg-white text-primary-600 shadow-sm"
									: "text-neutral-500 hover:text-neutral-700"
							}`}
						>
							Custom Item
						</button>
						<button
							onClick={() => setItemSource("inventory")}
							className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
								itemSource === "inventory"
									? "bg-white text-primary-600 shadow-sm"
									: "text-neutral-500 hover:text-neutral-700"
							}`}
						>
							From Inventory
						</button>
					</div>

					<div className="space-y-4">
						{itemSource === "inventory" ? (
							<>
								<div>
									<label
										htmlFor="inventoryTargetItem"
										className="block text-sm font-medium text-neutral-700 mb-1"
									>
										Select Item from Inventory
									</label>
									<select
										id="inventoryTargetItem"
										value={itemForm.items_db_id}
										onChange={(e) => {
											const selected = clientInventory?.find(
												(i) => i.id === e.target.value,
											);
											if (selected) {
												setItemForm((f) => ({
													...f,
													items_db_id: selected.id,
													designation: selected.description || "",
													length: selected.length || "",
													width: selected.width || "",
													height: selected.height || "",
												}));
												setItemValidationErrors((prev) => ({
													...prev,
													items_db: "",
												}));
											}
										}}
										className={`w-full px-3 py-2 border rounded-lg ${
											itemValidationErrors.items_db ? "border-danger-500" : ""
										}`}
									>
										<option value="">Select an item...</option>
										{clientInventory?.map((item) => (
											<option key={item.id} value={item.id}>
												{item.item_num} - {item.description} (
												{item.warehouse_location}) - Avail:{" "}
												{(item.expected_qty || 0) - (item.packed_qty || 0)}
											</option>
										))}
									</select>
									{itemValidationErrors.items_db && (
										<p className="mt-1 text-sm text-danger-600">
											{itemValidationErrors.items_db}
										</p>
									)}
								</div>

								<div>
									<label
										htmlFor="boxInstanceSelect"
										className="block text-sm font-medium text-neutral-700 mb-1"
									>
										Box Instance
									</label>
									<select
										id="boxInstanceSelect"
										value={selectedInstanceId}
										onChange={(e) => {
											setSelectedInstanceId(e.target.value);
											setItemValidationErrors((prev) => ({
												...prev,
												instance: "",
											}));
										}}
										className={`w-full px-3 py-2 border rounded-lg ${
											itemValidationErrors.instance ? "border-danger-500" : ""
										}`}
									>
										<option value="">Select Box...</option>
										{selectedPackageInstances?.map((inst) => (
											<option key={inst.id} value={inst.id}>
												Box #{inst.instance_number} (
												{inst.ipac_reference || "No Ref"})
											</option>
										))}
									</select>
									{itemValidationErrors.instance && (
										<p className="mt-1 text-sm text-danger-600">
											{itemValidationErrors.instance}
										</p>
									)}
								</div>

								<div>
									<label
										htmlFor="add-item-quantity"
										className="block text-sm font-medium text-neutral-700 mb-1"
									>
										Quantity
									</label>
									<input
										id="add-item-quantity"
										type="number"
										value={itemForm.quantity}
										onChange={(e) => {
											setItemForm((f) => ({
												...f,
												quantity: Number(e.target.value),
											}));
											setItemValidationErrors((prev) => ({
												...prev,
												quantity: "",
											}));
										}}
										className={`w-full px-3 py-2 border rounded-lg ${
											itemValidationErrors.quantity ? "border-danger-500" : ""
										}`}
										min={1}
									/>
									{itemValidationErrors.quantity && (
										<p className="mt-1 text-sm text-danger-600">
											{itemValidationErrors.quantity}
										</p>
									)}
								</div>
							</>
						) : (
							<>
								<div>
									<label
										htmlFor="add-item-designation"
										className="block text-sm font-medium text-neutral-700 mb-1"
									>
										Item Name / Designation
									</label>
									<input
										id="add-item-designation"
										type="text"
										value={itemForm.designation}
										onChange={(e) => {
											setItemForm((f) => ({
												...f,
												designation: e.target.value,
											}));
											setItemValidationErrors((prev) => ({
												...prev,
												designation: "",
											}));
										}}
										className={`w-full px-3 py-2 border rounded-lg ${
											itemValidationErrors.designation
												? "border-danger-500 focus:ring-danger-500"
												: ""
										}`}
										placeholder="Enter item name"
									/>
									{itemValidationErrors.designation && (
										<p className="mt-1 text-sm text-danger-600">
											{itemValidationErrors.designation}
										</p>
									)}
								</div>
								<div>
									<label
										htmlFor="add-item-quantity"
										className="block text-sm font-medium text-neutral-700 mb-1"
									>
										Quantity
									</label>
									<input
										id="add-item-quantity"
										type="number"
										value={itemForm.quantity}
										onChange={(e) => {
											setItemForm((f) => ({
												...f,
												quantity: Number(e.target.value),
											}));
											setItemValidationErrors((prev) => ({
												...prev,
												quantity: "",
											}));
										}}
										className={`w-full px-3 py-2 border rounded-lg ${
											itemValidationErrors.quantity
												? "border-danger-500 focus:ring-danger-500"
												: ""
										}`}
										min={1}
									/>
									{itemValidationErrors.quantity && (
										<p className="mt-1 text-sm text-danger-600">
											{itemValidationErrors.quantity}
										</p>
									)}
								</div>
								<div>
									<p className="block text-sm font-medium text-neutral-700 mb-1">
										Dimensions (L × W × H) - Optional
									</p>
									<div className="grid grid-cols-3 gap-2">
										<div>
											<input
												type="number"
												placeholder="Length"
												value={itemForm.length}
												onChange={(e) => {
													setItemForm((f) => ({
														...f,
														length: e.target.value,
													}));
													setItemValidationErrors((prev) => ({
														...prev,
														length: "",
													}));
												}}
												className={`px-3 py-2 border rounded-lg w-full ${
													itemValidationErrors.length ? "border-danger-500" : ""
												}`}
											/>
											{itemValidationErrors.length && (
												<p className="mt-0.5 text-xs text-danger-600">
													{itemValidationErrors.length}
												</p>
											)}
										</div>
										<div>
											<input
												type="number"
												placeholder="Width"
												value={itemForm.width}
												onChange={(e) => {
													setItemForm((f) => ({
														...f,
														width: e.target.value,
													}));
													setItemValidationErrors((prev) => ({
														...prev,
														width: "",
													}));
												}}
												className={`px-3 py-2 border rounded-lg w-full ${
													itemValidationErrors.width ? "border-danger-500" : ""
												}`}
											/>
											{itemValidationErrors.width && (
												<p className="mt-0.5 text-xs text-danger-600">
													{itemValidationErrors.width}
												</p>
											)}
										</div>
										<div>
											<input
												type="number"
												placeholder="Height"
												value={itemForm.height}
												onChange={(e) => {
													setItemForm((f) => ({
														...f,
														height: e.target.value,
													}));
													setItemValidationErrors((prev) => ({
														...prev,
														height: "",
													}));
												}}
												className={`px-3 py-2 border rounded-lg w-full ${
													itemValidationErrors.height ? "border-danger-500" : ""
												}`}
											/>
											{itemValidationErrors.height && (
												<p className="mt-0.5 text-xs text-danger-600">
													{itemValidationErrors.height}
												</p>
											)}
										</div>
									</div>
								</div>
							</>
						)}
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
							Add Item
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
