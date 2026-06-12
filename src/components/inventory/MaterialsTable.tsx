import { ChevronDown, ChevronUp, Edit, Trash2, Truck } from "lucide-react";
import React from "react";
import type { Material, MaterialVariant } from "./types";

interface MaterialsTableProps {
	materials: Material[];
	expandedMaterials: Set<string>;
	onToggleExpand: (materialId: string) => void;
	onEditMaterial: (material: Material) => void;
	onDeleteMaterial: (material: Material) => void;
	onEditVariant: (variant: MaterialVariant) => void;
	onDeleteVariant: (variant: MaterialVariant) => void;
	formatDate: (value?: string | null) => string;
}

/**
 * MaterialsTable
 *
 * Renders materials and nested variants in a dedicated component so the
 * route stays focused on orchestration and data fetching.
 */
export function MaterialsTable({
	materials,
	expandedMaterials,
	onToggleExpand,
	onEditMaterial,
	onDeleteMaterial,
	onEditVariant,
	onDeleteVariant,
	formatDate,
}: MaterialsTableProps) {
	return (
		<table className="excel-table">
			<thead>
				<tr>
					<th className="w-10"></th>
					<th>Material Name</th>
					<th>Description</th>
					<th>Unit</th>
					<th>Variants</th>
					<th>Created</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{materials.length === 0 && (
					<tr>
						<td colSpan={7} className="py-8 text-center text-neutral-500">
							No materials yet. Click “Add Material” to create one.
						</td>
					</tr>
				)}
				{materials.map((material) => {
					const isExpanded = expandedMaterials.has(material.id);
					const variantCount = material.material_variants?.length || 0;
					const hasVariants = variantCount > 0;

					return (
						<React.Fragment key={material.id}>
							<tr
								className={`cursor-pointer ${hasVariants ? "hover:bg-primary-50" : ""} ${isExpanded ? "bg-primary-50" : ""}`}
								onClick={() => hasVariants && onToggleExpand(material.id)}
							>
								<td className="text-center">
									{hasVariants &&
										(isExpanded ? (
											<ChevronUp className="w-4 h-4 text-primary-600 inline" />
										) : (
											<ChevronDown className="w-4 h-4 text-neutral-400 inline" />
										))}
								</td>
								<td className="font-medium text-neutral-900">
									{material.name}
								</td>
								<td className="text-neutral-500 max-w-xs truncate">
									{material.description || "—"}
								</td>
								<td>
									<span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs">
										{material.unit?.name || "—"}
									</span>
								</td>
								<td className="text-center">
									<span
										className={`px-2 py-1 rounded text-xs font-medium ${
											hasVariants
												? "bg-primary-50 text-primary-700"
												: "bg-neutral-50 text-neutral-500"
										}`}
									>
										{variantCount}
									</span>
								</td>
								<td className="text-sm text-neutral-500">
									{formatDate(material.created_at)}
								</td>
								<td>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onEditMaterial(material);
											}}
											className="p-1.5 hover:bg-neutral-100 rounded"
											title="Edit"
											aria-label={`Edit material ${material.name}`}
										>
											<Edit className="w-4 h-4 text-neutral-500" />
										</button>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onDeleteMaterial(material);
											}}
											className="p-1.5 hover:bg-danger-50 rounded"
											title="Delete"
											aria-label={`Delete material ${material.name}`}
										>
											<Trash2 className="w-4 h-4 text-danger-500" />
										</button>
									</div>
								</td>
							</tr>

							{isExpanded && hasVariants && (
								<tr className="bg-neutral-100 border-l-4 border-l-primary-500">
									<td colSpan={7} className="p-0">
										<table className="w-full">
											<thead>
												<tr className="text-xs text-neutral-600 uppercase">
													<th className="px-4 py-2 text-left w-48">
														Variant Name
													</th>
													<th className="px-4 py-2 text-left w-40">
														Description
													</th>
													<th className="px-4 py-2 text-left w-32">
														Dimensions (L×W×T)
													</th>
													<th className="px-4 py-2 text-left w-32">Supplier</th>
													<th className="px-4 py-2 text-right w-28">
														Supplier Qty
													</th>
													<th className="px-4 py-2 text-right w-24">Price</th>
													<th className="px-4 py-2 text-right w-28">
														Price/Unit
													</th>
													<th className="px-4 py-2 text-left w-32">
														Last Updated
													</th>
													<th className="px-4 py-2 text-center w-20">
														Actions
													</th>
												</tr>
											</thead>
											<tbody>
												{material.material_variants?.map((variant) => {
													const hasPricing =
														variant.supplier_pricing &&
														variant.supplier_pricing.length > 0;

													if (!hasPricing) {
														return (
															<tr
																key={variant.id}
																className="bg-white border-b border-neutral-100 hover:bg-neutral-50"
															>
																<td className="px-4 py-2 font-medium text-neutral-800">
																	{variant.variant_name}
																</td>
																<td className="px-4 py-2 text-neutral-500 text-sm">
																	{variant.description || "—"}
																</td>
																<td className="px-4 py-2 text-neutral-500 text-sm font-mono">
																	{variant.length ||
																	variant.width ||
																	variant.thickness
																		? `${variant.length || "—"} × ${variant.width || "—"} × ${variant.thickness || "—"}`
																		: "—"}
																</td>
																<td className="px-4 py-2 text-neutral-400 italic text-sm">
																	No supplier
																</td>
																<td className="px-4 py-2 text-right text-neutral-400">
																	—
																</td>
																<td className="px-4 py-2 text-right text-neutral-400">
																	—
																</td>
																<td className="px-4 py-2 text-right text-neutral-400">
																	—
																</td>
																<td className="px-4 py-2 text-neutral-400 text-sm">
																	—
																</td>
																<td className="px-4 py-2 text-center">
																	<div className="flex items-center justify-center gap-1">
																		<button
																			type="button"
																			onClick={() => onEditVariant(variant)}
																			className="p-1 hover:bg-neutral-100 rounded"
																			title="Edit"
																			aria-label={`Edit variant ${variant.variant_name}`}
																		>
																			<Edit className="w-3.5 h-3.5 text-neutral-500" />
																		</button>
																		<button
																			type="button"
																			onClick={() => onDeleteVariant(variant)}
																			className="p-1 hover:bg-danger-50 rounded"
																			title="Delete"
																			aria-label={`Delete variant ${variant.variant_name}`}
																		>
																			<Trash2 className="w-3.5 h-3.5 text-danger-500" />
																		</button>
																	</div>
																</td>
															</tr>
														);
													}

													const pricingCount =
														variant.supplier_pricing?.length ?? 1;
													return variant.supplier_pricing?.map(
														(pricing, pIdx) => (
															<tr
																key={`${variant.id}-${pricing.id}`}
																className={`bg-white border-b border-neutral-100 hover:bg-neutral-50 ${pIdx > 0 ? "border-t-0" : ""}`}
															>
																{pIdx === 0 ? (
																	<>
																		<td
																			className="px-4 py-2 font-medium text-neutral-800"
																			rowSpan={pricingCount}
																		>
																			{variant.variant_name}
																		</td>
																		<td
																			className="px-4 py-2 text-neutral-500 text-sm"
																			rowSpan={pricingCount}
																		>
																			{variant.description || "—"}
																		</td>
																		<td
																			className="px-4 py-2 text-neutral-500 text-sm font-mono"
																			rowSpan={pricingCount}
																		>
																			{variant.length ||
																			variant.width ||
																			variant.thickness
																				? `${variant.length || "—"} × ${variant.width || "—"} × ${variant.thickness || "—"}`
																				: "—"}
																		</td>
																	</>
																) : null}
																<td className="px-4 py-2">
																	<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-50 text-accent-700 rounded text-xs">
																		<Truck className="w-3 h-3" />
																		{pricing.suppliers?.name || "Unknown"}
																	</span>
																</td>
																<td className="px-4 py-2 text-right">
																	<span className="font-medium text-neutral-700">
																		{pricing.supplier_quantity != null
																			? pricing.supplier_quantity
																			: "—"}
																	</span>
																</td>
																<td className="px-4 py-2 text-right">
																	<span className="font-medium text-success-600">
																		{pricing.price != null
																			? `AED ${pricing.price.toFixed(2)}`
																			: "—"}
																	</span>
																</td>
																<td className="px-4 py-2 text-right">
																	<span className="text-neutral-600">
																		{pricing.price_per_unit != null
																			? `AED ${pricing.price_per_unit.toFixed(2)}`
																			: "—"}
																	</span>
																</td>
																<td className="px-4 py-2 text-neutral-500 text-sm">
																	{pricing.updated_at
																		? new Date(
																				pricing.updated_at,
																			).toLocaleDateString()
																		: "—"}
																</td>
																{pIdx === 0 && (
																	<td
																		className="px-4 py-2 text-center"
																		rowSpan={pricingCount}
																	>
																		<div className="flex items-center justify-center gap-1">
																			<button
																				type="button"
																				onClick={() => onEditVariant(variant)}
																				className="p-1 hover:bg-neutral-100 rounded"
																				title="Edit"
																				aria-label={`Edit variant ${variant.variant_name}`}
																			>
																				<Edit className="w-3.5 h-3.5 text-neutral-500" />
																			</button>
																			<button
																				type="button"
																				onClick={() => onDeleteVariant(variant)}
																				className="p-1 hover:bg-danger-50 rounded"
																				title="Delete"
																				aria-label={`Delete variant ${variant.variant_name}`}
																			>
																				<Trash2 className="w-3.5 h-3.5 text-danger-500" />
																			</button>
																		</div>
																	</td>
																)}
															</tr>
														),
													);
												})}
											</tbody>
										</table>
									</td>
								</tr>
							)}
						</React.Fragment>
					);
				})}
			</tbody>
		</table>
	);
}
