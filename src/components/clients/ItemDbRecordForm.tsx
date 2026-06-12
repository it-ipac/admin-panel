import { useMutation } from "@tanstack/react-query";
import {
	AlertCircle,
	CheckCircle2,
	Edit3,
	Loader2,
	Plus,
	Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToastContext } from "../ui/ToastProvider";

type MaintenanceCategoryRow = {
	id: string;
	label: string | null;
	tags: string[];
};

type MaintenanceDbRow = {
	[key: string]: any;
	id: string;
	category_id: string | null;
};

interface ItemDbRecordFormProps {
	clientId: string;
	items: MaintenanceDbRow[];
	categories: MaintenanceCategoryRow[];
	onSuccess: () => void;
}

export function ItemDbRecordForm({
	clientId,
	items,
	categories,
	onSuccess,
}: ItemDbRecordFormProps) {
	const { toast } = useToastContext();

	const [itemNum, setItemNum] = useState("");
	const [expectedQty, setExpectedQty] = useState("1");
	const [categoryId, setCategoryId] = useState("");
	const [description, setDescription] = useState("");
	const [warehouseLocation, setWarehouseLocation] = useState("");
	const [reference, setReference] = useState("");
	const [length, setLength] = useState("");
	const [width, setWidth] = useState("");
	const [height, setHeight] = useState("");
	const [ipacComments, setIpacComments] = useState("");

	const [prevMatchedId, setPrevMatchedId] = useState<string | null>(null);

	// Perform local check for existing item
	const existingItem = useMemo(() => {
		const trimmed = itemNum.trim().toLowerCase();
		if (!trimmed) return null;
		return items.find(
			(item) =>
				String(item.item_num || "")
					.trim()
					.toLowerCase() === trimmed,
		);
	}, [itemNum, items]);

	// Auto-populate when matching item is found
	useEffect(() => {
		if (existingItem) {
			if (existingItem.id !== prevMatchedId) {
				setCategoryId(existingItem.category_id || "");
				setDescription(existingItem.description || "");
				setWarehouseLocation(existingItem.warehouse_location || "");
				setReference(existingItem.reference || "");
				setLength(
					existingItem.length !== null ? String(existingItem.length) : "",
				);
				setWidth(existingItem.width !== null ? String(existingItem.width) : "");
				setHeight(
					existingItem.height !== null ? String(existingItem.height) : "",
				);
				setIpacComments(existingItem.ipac_comments || "");
				setPrevMatchedId(existingItem.id);
			}
		} else if (prevMatchedId !== null) {
			// Clear fields if changing from matched to unmatched
			setCategoryId("");
			setDescription("");
			setWarehouseLocation("");
			setReference("");
			setLength("");
			setWidth("");
			setHeight("");
			setIpacComments("");
			setPrevMatchedId(null);
		}
	}, [existingItem, prevMatchedId]);

	const saveMutation = useMutation({
		mutationFn: async () => {
			const cleanItemNum = itemNum.trim();
			if (!cleanItemNum) throw new Error("Item Number is required");

			const qty = Number(expectedQty);
			if (Number.isNaN(qty) || qty < 0) {
				throw new Error("Expected quantity must be a non-negative number");
			}

			const payload = {
				category_id: categoryId || null,
				description: description.trim() || null,
				warehouse_location: warehouseLocation.trim() || null,
				reference: reference.trim() || null,
				length: length.trim() ? Number(length) : null,
				width: width.trim() ? Number(width) : null,
				height: height.trim() ? Number(height) : null,
				ipac_comments: ipacComments.trim() || null,
			};

			if (existingItem) {
				// Always update expected_qty by adding the entered value
				const updatedQty = Number(existingItem.expected_qty || 0) + qty;
				const { error } = await supabase
					.from("items_db")
					.update({
						...payload,
						expected_qty: updatedQty,
					})
					.eq("id", existingItem.id);

				if (error) throw error;
				return {
					action: "update",
					itemNum: cleanItemNum,
					expectedQty: updatedQty,
				};
			} else {
				// Create a new record
				const { error } = await supabase.from("items_db").insert({
					...payload,
					client_id: clientId,
					item_num: cleanItemNum,
					expected_qty: qty,
					packed_qty: 0,
				});

				if (error) throw error;
				return { action: "create", itemNum: cleanItemNum, expectedQty: qty };
			}
		},
		onSuccess: (data) => {
			toast({
				title: data.action === "update" ? "Item Updated" : "Item Created",
				description:
					data.action === "update"
						? `Expected quantity of item "${data.itemNum}" increased to ${data.expectedQty}.`
						: `New item "${data.itemNum}" created with expected quantity ${data.expectedQty}.`,
				variant: "success",
			});
			// Reset form fields
			setItemNum("");
			setExpectedQty("1");
			setCategoryId("");
			setDescription("");
			setWarehouseLocation("");
			setReference("");
			setLength("");
			setWidth("");
			setHeight("");
			setIpacComments("");
			setPrevMatchedId(null);
			onSuccess();
		},
		onError: (error: any) => {
			toast({
				title: "Operation Failed",
				description: error.message || "Failed to save the record.",
				variant: "error",
			});
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		saveMutation.mutate();
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{/* Item Number */}
				<div className="space-y-1">
					<label
						htmlFor="form-item-num"
						className="block text-xs font-semibold text-neutral-700"
					>
						Item Number *
					</label>
					<div className="relative">
						<input
							id="form-item-num"
							type="text"
							required
							placeholder="Enter item number..."
							value={itemNum}
							onChange={(e) => setItemNum(e.target.value)}
							className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
								existingItem
									? "border-warning-300 bg-warning-50/50 focus:border-warning-500 focus:ring-1 focus:ring-warning-500"
									: "border-neutral-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
							}`}
						/>
						<div className="absolute right-2.5 top-2.5 text-neutral-400">
							<Search className="h-4 w-4" />
						</div>
					</div>
				</div>

				{/* Expected Quantity */}
				<div className="space-y-1">
					<label
						htmlFor="form-expected-qty"
						className="block text-xs font-semibold text-neutral-700"
					>
						{existingItem ? "Quantity to Add *" : "Expected Quantity *"}
					</label>
					<input
						id="form-expected-qty"
						type="number"
						required
						min="0"
						value={expectedQty}
						onChange={(e) => setExpectedQty(e.target.value)}
						className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
					/>
				</div>

				{/* Category */}
				<div className="space-y-1">
					<label
						htmlFor="form-category"
						className="block text-xs font-semibold text-neutral-700"
					>
						Category
					</label>
					<select
						id="form-category"
						value={categoryId}
						onChange={(e) => setCategoryId(e.target.value)}
						className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white"
					>
						<option value="">Select Category</option>
						{categories.map((cat) => (
							<option key={cat.id} value={cat.id}>
								{cat.label || "(No label)"}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Status Banner */}
			{itemNum.trim() && (
				<div
					className={`rounded-lg border p-3 flex items-start gap-2.5 transition-all text-xs ${
						existingItem
							? "border-warning-200 bg-warning-50 text-warning-900"
							: "border-success-200 bg-success-50 text-success-900"
					}`}
				>
					{existingItem ? (
						<>
							<AlertCircle className="h-4 w-4 shrink-0 text-warning-600 mt-0.5" />
							<div>
								<span className="font-bold">Item detected in database.</span>{" "}
								Expected quantity will be increased from{" "}
								<span className="font-bold">
									{existingItem.expected_qty ?? 0}
								</span>{" "}
								to{" "}
								<span className="font-bold">
									{(existingItem.expected_qty ?? 0) +
										(Number(expectedQty) || 0)}
								</span>
								. Other fields will be updated if modified.
							</div>
						</>
					) : (
						<>
							<CheckCircle2 className="h-4 w-4 shrink-0 text-success-600 mt-0.5" />
							<div>
								<span className="font-bold">New item.</span> A new record will
								be created in the database with expected quantity{" "}
								<span className="font-bold">{Number(expectedQty) || 0}</span>.
							</div>
						</>
					)}
				</div>
			)}

			<div className="grid gap-4 md:grid-cols-2">
				{/* Description */}
				<div className="space-y-1">
					<label
						htmlFor="form-description"
						className="block text-xs font-semibold text-neutral-700"
					>
						Description
					</label>
					<input
						id="form-description"
						type="text"
						placeholder="Item description..."
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
					/>
				</div>

				{/* Reference / Bin */}
				<div className="space-y-1">
					<label
						htmlFor="form-reference"
						className="block text-xs font-semibold text-neutral-700"
					>
						Reference / Bin
					</label>
					<input
						id="form-reference"
						type="text"
						placeholder="Bin location or reference..."
						value={reference}
						onChange={(e) => setReference(e.target.value)}
						className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{/* Warehouse Location */}
				<div className="space-y-1">
					<label
						htmlFor="form-warehouse"
						className="block text-xs font-semibold text-neutral-700"
					>
						Warehouse Location
					</label>
					<input
						id="form-warehouse"
						type="text"
						placeholder="Warehouse location..."
						value={warehouseLocation}
						onChange={(e) => setWarehouseLocation(e.target.value)}
						className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
					/>
				</div>

				{/* Length */}
				<div className="space-y-1">
					<label
						htmlFor="form-length"
						className="block text-xs font-semibold text-neutral-700"
					>
						Length (cm)
					</label>
					<input
						id="form-length"
						type="number"
						step="any"
						min="0"
						placeholder="Length..."
						value={length}
						onChange={(e) => setLength(e.target.value)}
						className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
					/>
				</div>

				{/* Width */}
				<div className="space-y-1">
					<label
						htmlFor="form-width"
						className="block text-xs font-semibold text-neutral-700"
					>
						Width (cm)
					</label>
					<input
						id="form-width"
						type="number"
						step="any"
						min="0"
						placeholder="Width..."
						value={width}
						onChange={(e) => setWidth(e.target.value)}
						className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
					/>
				</div>

				{/* Height */}
				<div className="space-y-1">
					<label
						htmlFor="form-height"
						className="block text-xs font-semibold text-neutral-700"
					>
						Height (cm)
					</label>
					<input
						id="form-height"
						type="number"
						step="any"
						min="0"
						placeholder="Height..."
						value={height}
						onChange={(e) => setHeight(e.target.value)}
						className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
					/>
				</div>
			</div>

			{/* Comments */}
			<div className="space-y-1">
				<label
					htmlFor="form-comments"
					className="block text-xs font-semibold text-neutral-700"
				>
					IPAC Comments
				</label>
				<input
					id="form-comments"
					type="text"
					placeholder="Add internal comments..."
					value={ipacComments}
					onChange={(e) => setIpacComments(e.target.value)}
					className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
				/>
			</div>

			{/* Submit Button */}
			<div className="flex justify-end pt-2">
				<button
					type="submit"
					disabled={saveMutation.isPending}
					className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-all shadow-sm ${
						existingItem
							? "bg-warning-600 hover:bg-warning-700 hover:shadow-md disabled:bg-warning-600/50"
							: "bg-primary-600 hover:bg-primary-700 hover:shadow-md disabled:bg-primary-600/50"
					}`}
				>
					{saveMutation.isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : existingItem ? (
						<Edit3 className="h-4 w-4" />
					) : (
						<Plus className="h-4 w-4" />
					)}
					{existingItem ? "Update Expected Quantity" : "Create New Item"}
				</button>
			</div>
		</form>
	);
}
