import { Edit, Tag, Trash2, Truck } from "lucide-react";
import type { Material, MaterialVariant } from "./types";

interface VariantsTableProps {
	variants: (MaterialVariant & { material?: Material })[];
	onEditVariant: (variant: MaterialVariant) => void;
	onDeleteVariant: (variant: MaterialVariant) => void;
	formatDate: (value?: string | null) => string;
}

export function VariantsTable({
	variants,
	onEditVariant,
	onDeleteVariant,
	formatDate,
}: VariantsTableProps) {
	return (
		<table className="excel-table">
			<thead>
				<tr>
					<th>Variant Name</th>
					<th>Material</th>
					<th>Description</th>
					<th>Dimensions (L×W×T)</th>
					<th>Unit</th>
					<th>Tags</th>
					<th>Supplier</th>
					<th>Supplier Qty</th>
					<th>Price</th>
					<th>Price/Unit</th>
					<th>Created</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{variants.map((variant) => {
					const hasPricing =
						variant.supplier_pricing && variant.supplier_pricing.length > 0;
					const firstPricing = hasPricing
						? variant.supplier_pricing?.[0]
						: null;

					return (
						<tr key={variant.id}>
							<td className="font-medium text-gray-900">
								{variant.variant_name}
							</td>
							<td>
								<span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
									{variant.material?.name || "—"}
								</span>
							</td>
							<td className="text-gray-500 max-w-xs truncate">
								{variant.description || "—"}
							</td>
							<td className="text-gray-500 text-sm font-mono">
								{variant.length || variant.width || variant.thickness
									? `${variant.length || "—"} × ${variant.width || "—"} × ${variant.thickness || "—"}`
									: "—"}
							</td>
							<td>
								<span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
									{variant.unit?.name || variant.material?.unit?.name || "—"}
								</span>
							</td>
							<td>
								<div className="flex flex-wrap gap-1">
									{variant.material_variant_tags &&
									variant.material_variant_tags.length > 0 ? (
										variant.material_variant_tags.map((vt, idx) => (
											<span
												key={vt.tag_id || idx}
												className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs"
											>
												<Tag className="w-3 h-3" />
												{vt.tags?.name || "Unknown"}
											</span>
										))
									) : (
										<span className="text-gray-400 text-sm">—</span>
									)}
								</div>
							</td>
							<td>
								{firstPricing ? (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
										<Truck className="w-3 h-3" />
										{firstPricing.suppliers?.name || "Unknown"}
									</span>
								) : (
									<span className="text-gray-400 text-sm">—</span>
								)}
							</td>
							<td className="text-right">
								<span className="font-medium text-gray-700">
									{firstPricing?.supplier_quantity != null
										? firstPricing.supplier_quantity
										: "—"}
								</span>
							</td>
							<td className="text-right">
								<span className="font-medium text-green-600">
									{firstPricing?.price != null
										? `AED ${firstPricing.price.toFixed(2)}`
										: "—"}
								</span>
							</td>
							<td className="text-right">
								<span className="text-gray-600">
									{firstPricing?.price_per_unit != null
										? `AED ${firstPricing.price_per_unit.toFixed(2)}`
										: "—"}
								</span>
							</td>
							<td className="text-sm text-gray-500">
								{formatDate(variant.created_at)}
							</td>
							<td>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => onEditVariant(variant)}
										className="p-1.5 hover:bg-gray-100 rounded"
										title="Edit"
									>
										<Edit className="w-4 h-4 text-gray-500" />
									</button>
									<button
										type="button"
										onClick={() => onDeleteVariant(variant)}
										className="p-1.5 hover:bg-red-50 rounded"
										title="Delete"
									>
										<Trash2 className="w-4 h-4 text-red-500" />
									</button>
								</div>
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
