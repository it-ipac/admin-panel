import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export interface OrderCreateSummary {
	orderName: string;
	clientName: string;
	fileName?: string | null;
	packageCount?: number;
	clientMode: "existing" | "new";
	newClientDetails?: {
		name: string;
		contact_person?: string | null;
		email?: string | null;
		phone?: string | null;
		address?: string | null;
	};
	worksheetNames?: string[];
}

export interface OrderCreateDetailTable {
	tableName: string;
	description: string;
	columns: Array<{ column: string; value: string; note?: string }>;
}

export interface PackagePreview {
	packageNumber: number;
	rowIndex: number;
	designation: string;
	quantity: number | null;
	boxTypeLabel: string | null;
	boxTypeResolved: boolean;
	packingTypeRaw: string | null;
	packingTypeLabel: string | null;
	packingTypeResolved: boolean;
	packingTypeOptions: Array<{ id: string; label: string }> | null;
	packingTypeId: string | null;
	hasMatchedPackingOptions: boolean;
	showAllPackingOptions: boolean;
	internal: {
		length: number | null;
		width: number | null;
		height: number | null;
	};
	item: { length: number | null; width: number | null; height: number | null };
	external: {
		length: number | null;
		width: number | null;
		height: number | null;
	};
	netWeight: number | null;
	tare: number | null;
	grossWeight: number | null;
	manufacturing: {
		big: {
			template: ManufacturingPartPreview;
			horizontal: ManufacturingPartPreview;
			vertical: ManufacturingPartPreview;
		};
		small: {
			template: ManufacturingPartPreview;
			horizontal: ManufacturingPartPreview;
			vertical: ManufacturingPartPreview;
		};
		lid: {
			template: ManufacturingPartPreview;
			horizontal: ManufacturingPartPreview;
			vertical: ManufacturingPartPreview;
		};
		base: {
			template: ManufacturingPartPreview;
			horizontal: ManufacturingPartPreview;
			vertical: ManufacturingPartPreview;
			skids: ManufacturingPartPreview;
		};
	};
	securing: ManufacturingPartPreview[];
	accessories: ManufacturingPartPreview[];
}

export interface ManufacturingPartPreview {
	key: string;
	typeLabel: string | null;
	typeId: string | null;
	typeResolved: boolean;
	typeOptions: Array<{ id: string; label: string }>;
	hasMatchedOptions: boolean;
	showAllOptions: boolean;
	quantity: number | null;
	thickness: number | null;
	width: number | null;
	space: number | null;
}

interface OrderCreateConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	summary: OrderCreateSummary;
	detailTables: OrderCreateDetailTable[];
	packagePreviews: PackagePreview[];
	onPackingTypeChange: (packageNumber: number, packingTypeId: string) => void;
	onPackingTypeOptionsToggle: (packageNumber: number) => void;
	onManufacturingTypeChange: (key: string, typeId: string) => void;
	onManufacturingOptionsToggle: (key: string) => void;
	confirmDisabled?: boolean;
	confirmDisabledReason?: string;
	templateWarningCount?: number;
	onConfirm: () => void;
	isSubmitting: boolean;
	submitError?: string | null;
}

/**
 * OrderCreateConfirmDialog
 *
 * This dialog keeps the final "review & confirm" step isolated.
 * Keeping it separate helps juniors understand step-based flows
 * and avoids turning the main dialog into an unreadable monolith.
 */
export function OrderCreateConfirmDialog({
	open,
	onOpenChange,
	summary,
	detailTables,
	packagePreviews,
	onPackingTypeChange,
	onPackingTypeOptionsToggle,
	onManufacturingTypeChange,
	onManufacturingOptionsToggle,
	confirmDisabled,
	confirmDisabledReason,
	templateWarningCount,
	onConfirm,
	isSubmitting,
	submitError,
}: OrderCreateConfirmDialogProps) {
	const [showDetails, setShowDetails] = useState(false);
	const [activePackage, setActivePackage] = useState(0);
	const [showTemplateWarning, setShowTemplateWarning] = useState(false);

	useEffect(() => {
		if (activePackage >= packagePreviews.length) {
			setActivePackage(0);
		}
	}, [activePackage, packagePreviews.length]);

	const formatNumber = (value: number | null) => {
		if (value === null || Number.isNaN(value)) return "—";
		const rounded = Math.round(value * 100) / 100;
		return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
	};

	const renderManufacturingPart = (
		label: string,
		part: ManufacturingPartPreview,
		showFields: Array<"quantity" | "width" | "thickness" | "space">,
	) => (
		<div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
			<div className="flex items-center justify-between">
				<p className="text-xs font-semibold text-gray-700">{label}</p>
				{part.hasMatchedOptions && (
					<button
						type="button"
						onClick={() => onManufacturingOptionsToggle(part.key)}
						className="text-[11px] text-blue-600 hover:text-blue-700"
					>
						{part.showAllOptions ? "Show matched options" : "Show all options"}
					</button>
				)}
			</div>
			<select
				value={part.typeId || ""}
				onChange={(event) =>
					onManufacturingTypeChange(part.key, event.target.value)
				}
				className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">Select material...</option>
				{part.typeOptions.map((option) => (
					<option key={option.id} value={option.id}>
						{option.label}
					</option>
				))}
			</select>
			{!part.typeResolved && part.typeLabel && (
				<p className="text-[11px] text-amber-600">
					Not matched. Choose a material.
				</p>
			)}
			<div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
				{showFields.includes("quantity") && (
					<div>
						<p className="text-gray-400">Qty</p>
						<p className="font-medium text-gray-800">
							{formatNumber(part.quantity)}
						</p>
					</div>
				)}
				{showFields.includes("width") && (
					<div>
						<p className="text-gray-400">Width</p>
						<p className="font-medium text-gray-800">
							{formatNumber(part.width)}
						</p>
					</div>
				)}
				{showFields.includes("thickness") && (
					<div>
						<p className="text-gray-400">Thickness</p>
						<p className="font-medium text-gray-800">
							{formatNumber(part.thickness)}
						</p>
					</div>
				)}
				{showFields.includes("space") && (
					<div>
						<p className="text-gray-400">Space</p>
						<p className="font-medium text-gray-800">
							{formatNumber(part.space)}
						</p>
					</div>
				)}
			</div>
		</div>
	);

	const handleConfirmClick = () => {
		if (templateWarningCount && templateWarningCount > 0) {
			setShowTemplateWarning(true);
			return;
		}
		onConfirm();
	};

	return (
		<>
			<Dialog.Root open={open} onOpenChange={onOpenChange}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
					<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6">
						<div className="flex items-start justify-between mb-4">
							<div>
								<Dialog.Title className="text-lg font-semibold text-gray-900">
									Confirm new order
								</Dialog.Title>
								<Dialog.Description className="text-sm text-gray-500">
									Please review the order details before creating it.
								</Dialog.Description>
							</div>
							<button
								type="button"
								onClick={() => setShowDetails((prev) => !prev)}
								className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
							>
								{showDetails ? "Hide detailed info" : "Show detailed info"}
								{showDetails ? (
									<ChevronUp className="w-4 h-4" />
								) : (
									<ChevronDown className="w-4 h-4" />
								)}
							</button>
						</div>

						<div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
							<div className="rounded-lg border border-gray-200 p-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
									<div className="space-y-3">
										<div>
											<p className="text-xs text-gray-500">Order name</p>
											<p className="font-medium text-gray-900">
												{summary.orderName}
											</p>
										</div>
										<div>
											<p className="text-xs text-gray-500">Source file</p>
											<p className="font-medium text-gray-900">
												{summary.fileName || "Not provided"}
											</p>
										</div>
										<div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
											<p className="text-xs text-gray-500">
												Order packages summary
											</p>
											<p className="text-sm font-medium text-gray-900">
												{summary.packageCount || 0} package(s)
											</p>
										</div>
									</div>
									<div className="space-y-3">
										<div>
											<p className="text-xs text-gray-500">Client</p>
											<p className="font-medium text-gray-900">
												{summary.clientName}
											</p>
										</div>
										{summary.clientMode === "new" &&
											summary.newClientDetails && (
												<div>
													<p className="text-xs text-gray-500">
														New client contact
													</p>
													<p className="font-medium text-gray-900">
														{summary.newClientDetails.contact_person || "—"}
													</p>
												</div>
											)}
									</div>
								</div>
							</div>

							{packagePreviews.length > 0 && (
								<div className="rounded-lg border border-gray-200 p-4">
									<div className="flex items-center justify-between mb-3">
										<div>
											<p className="text-sm font-semibold text-gray-900">
												Package preview
											</p>
											<p className="text-xs text-gray-500">
												Review each package row from the Calculation sheet.
											</p>
										</div>
									</div>
									<div className="flex flex-wrap gap-2 mb-4">
										{packagePreviews.map((pkg, index) => (
											<button
												key={`pkg-tab-${pkg.packageNumber}`}
												type="button"
												onClick={() => setActivePackage(index)}
												className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
													activePackage === index
														? "border-blue-600 bg-blue-50 text-blue-700"
														: "border-gray-200 text-gray-600"
												}`}
											>
												Box {pkg.packageNumber}
											</button>
										))}
									</div>

									{packagePreviews[activePackage] && (
										<div className="space-y-3 text-xs text-gray-700">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
												<div>
													<p className="text-xs text-gray-500">
														Quantity (col A)
													</p>
													<p className="font-medium text-gray-900">
														{packagePreviews[activePackage].quantity ?? "—"}
													</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">
														Box type (col C)
													</p>
													<p
														className={`font-medium ${packagePreviews[activePackage].boxTypeResolved ? "text-gray-900" : "text-amber-600"}`}
													>
														{packagePreviews[activePackage].boxTypeLabel || "—"}
														{!packagePreviews[activePackage].boxTypeResolved &&
															" (not found in box types)"}
													</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">
														Packing type (col AB)
													</p>
													<select
														value={
															packagePreviews[activePackage].packingTypeId || ""
														}
														onChange={(event) =>
															onPackingTypeChange(
																packagePreviews[activePackage].packageNumber,
																event.target.value,
															)
														}
														className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
													>
														<option value="">Select packing type...</option>
														{packagePreviews[
															activePackage
														].packingTypeOptions?.map((option) => (
															<option key={option.id} value={option.id}>
																{option.label}
															</option>
														))}
													</select>
													{!packagePreviews[activePackage]
														.packingTypeResolved && (
														<p className="mt-1 text-xs text-amber-600">
															Not matched. Select a packing type.
														</p>
													)}
													{packagePreviews[activePackage]
														.hasMatchedPackingOptions && (
														<button
															type="button"
															onClick={() =>
																onPackingTypeOptionsToggle(
																	packagePreviews[activePackage].packageNumber,
																)
															}
															className="mt-1 text-[11px] text-blue-600 hover:text-blue-700"
														>
															{packagePreviews[activePackage]
																.showAllPackingOptions
																? "Show matched options"
																: "Show all options"}
														</button>
													)}
												</div>
												<div>
													<p className="text-xs text-gray-500">
														Packing type raw
													</p>
													<p className="font-medium text-gray-900">
														{packagePreviews[activePackage].packingTypeRaw ||
															"—"}
													</p>
												</div>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
												<div>
													<p className="text-xs text-gray-500">
														Item designation (col B)
													</p>
													<p className="font-medium text-gray-900">
														{packagePreviews[activePackage].designation || "—"}
													</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">
														Item dimensions (M, N, O)
													</p>
													<p className="font-medium text-gray-900">
														{formatNumber(
															packagePreviews[activePackage].item.length,
														)}{" "}
														×{" "}
														{formatNumber(
															packagePreviews[activePackage].item.width,
														)}{" "}
														×{" "}
														{formatNumber(
															packagePreviews[activePackage].item.height,
														)}
													</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">
														Internal dimensions (V, W, X)
													</p>
													<p className="font-medium text-gray-900">
														{formatNumber(
															packagePreviews[activePackage].internal.length,
														)}{" "}
														×{" "}
														{formatNumber(
															packagePreviews[activePackage].internal.width,
														)}{" "}
														×{" "}
														{formatNumber(
															packagePreviews[activePackage].internal.height,
														)}
													</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">
														External dimensions (Y, Z, AA)
													</p>
													<p className="font-medium text-gray-900">
														{formatNumber(
															packagePreviews[activePackage].external.length,
														)}{" "}
														×{" "}
														{formatNumber(
															packagePreviews[activePackage].external.width,
														)}{" "}
														×{" "}
														{formatNumber(
															packagePreviews[activePackage].external.height,
														)}
													</p>
												</div>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
												<div>
													<p className="text-xs text-gray-500">
														Net weight (U)
													</p>
													<p className="font-medium text-gray-900">
														{formatNumber(
															packagePreviews[activePackage].netWeight,
														)}
													</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">Tare (BAB)</p>
													<p className="font-medium text-gray-900">
														{formatNumber(packagePreviews[activePackage].tare)}
													</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">
														Gross (net + tare)
													</p>
													<p className="font-medium text-gray-900">
														{formatNumber(
															packagePreviews[activePackage].grossWeight,
														)}
													</p>
												</div>
											</div>

											<div className="pt-3 border-t border-gray-100">
												<p className="text-xs font-semibold text-gray-700 mb-2">
													Manufacturing (securing)
												</p>
												<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
													<div className="space-y-3">
														<p className="text-xs font-semibold text-gray-800">
															Big sides
														</p>
														{renderManufacturingPart(
															"Template",
															packagePreviews[activePackage].manufacturing.big
																.template,
															["quantity", "thickness"],
														)}
														{renderManufacturingPart(
															"Horizontal bar",
															packagePreviews[activePackage].manufacturing.big
																.horizontal,
															["quantity", "width", "thickness", "space"],
														)}
														{renderManufacturingPart(
															"Vertical bar",
															packagePreviews[activePackage].manufacturing.big
																.vertical,
															["quantity", "width", "thickness", "space"],
														)}
													</div>
													<div className="space-y-3">
														<p className="text-xs font-semibold text-gray-800">
															Small sides
														</p>
														{renderManufacturingPart(
															"Template",
															packagePreviews[activePackage].manufacturing.small
																.template,
															["quantity", "thickness"],
														)}
														{renderManufacturingPart(
															"Horizontal bar",
															packagePreviews[activePackage].manufacturing.small
																.horizontal,
															["quantity", "width", "thickness", "space"],
														)}
														{renderManufacturingPart(
															"Vertical bar",
															packagePreviews[activePackage].manufacturing.small
																.vertical,
															["quantity", "width", "thickness", "space"],
														)}
													</div>
													<div className="space-y-3">
														<p className="text-xs font-semibold text-gray-800">
															Lid
														</p>
														{renderManufacturingPart(
															"Template",
															packagePreviews[activePackage].manufacturing.lid
																.template,
															["quantity", "thickness"],
														)}
														{renderManufacturingPart(
															"Horizontal bar",
															packagePreviews[activePackage].manufacturing.lid
																.horizontal,
															["quantity", "width", "thickness", "space"],
														)}
														{renderManufacturingPart(
															"Vertical bar",
															packagePreviews[activePackage].manufacturing.lid
																.vertical,
															["quantity", "width", "thickness", "space"],
														)}
													</div>
													<div className="space-y-3">
														<p className="text-xs font-semibold text-gray-800">
															Base
														</p>
														{renderManufacturingPart(
															"Template",
															packagePreviews[activePackage].manufacturing.base
																.template,
															["quantity", "thickness"],
														)}
														{renderManufacturingPart(
															"Horizontal bar",
															packagePreviews[activePackage].manufacturing.base
																.horizontal,
															["quantity", "width", "thickness", "space"],
														)}
														{renderManufacturingPart(
															"Vertical bar",
															packagePreviews[activePackage].manufacturing.base
																.vertical,
															["quantity", "width", "thickness", "space"],
														)}
														{renderManufacturingPart(
															"Skids",
															packagePreviews[activePackage].manufacturing.base
																.skids,
															["quantity", "width", "thickness", "space"],
														)}
													</div>
												</div>
											</div>

											<div className="pt-3 border-t border-gray-100">
												<p className="text-xs font-semibold text-gray-700 mb-2">
													Securing materials
												</p>
												<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
													{packagePreviews[activePackage].securing?.length ? (
														packagePreviews[activePackage].securing.map(
															(part, index) => (
																<div key={part.key} className="space-y-2">
																	{renderManufacturingPart(
																		`Securing ${index + 1}`,
																		part,
																		["quantity", "width", "thickness"],
																	)}
																</div>
															),
														)
													) : (
														<p className="text-xs text-gray-500">
															No securing materials detected.
														</p>
													)}
												</div>
											</div>

											<div className="pt-3 border-t border-gray-100">
												<p className="text-xs font-semibold text-gray-700 mb-2">
													Accessories
												</p>
												<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
													{packagePreviews[activePackage].accessories
														?.length ? (
														packagePreviews[activePackage].accessories.map(
															(part, index) => (
																<div key={part.key} className="space-y-2">
																	{renderManufacturingPart(
																		`Accessory ${index + 1}`,
																		part,
																		["quantity"],
																	)}
																</div>
															),
														)
													) : (
														<p className="text-xs text-gray-500">
															No accessories detected.
														</p>
													)}
												</div>
											</div>
										</div>
									)}
								</div>
							)}

							{showDetails && (
								<div className="space-y-3">
									{detailTables.map((table) => (
										<div
											key={table.tableName}
											className="rounded-lg border border-gray-200 p-4"
										>
											<div className="flex items-center justify-between mb-2">
												<div>
													<p className="text-sm font-semibold text-gray-900">
														{table.tableName}
													</p>
													<p className="text-xs text-gray-500">
														{table.description}
													</p>
												</div>
											</div>
											<div className="space-y-2 text-xs text-gray-700">
												{table.columns.map((column) => (
													<div
														key={`${table.tableName}-${column.column}`}
														className="flex flex-col md:flex-row md:items-center md:justify-between gap-1"
													>
														<span className="font-medium text-gray-800">
															{column.column}
														</span>
														<span className="text-gray-600">
															{column.value}
														</span>
														{column.note && (
															<span className="text-gray-400">
																{column.note}
															</span>
														)}
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						{(submitError || confirmDisabledReason) && (
							<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
								{submitError || confirmDisabledReason}
							</div>
						)}

						{templateWarningCount &&
							templateWarningCount > 0 &&
							!confirmDisabled && (
								<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
									{templateWarningCount} securing template
									{templateWarningCount > 1 ? "s are" : " is"} missing material
									selections. You can continue to create the order; templates
									will be saved empty.
								</div>
							)}

						<div className="flex justify-end gap-2 mt-6">
							<Dialog.Close asChild>
								<button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
									Cancel
								</button>
							</Dialog.Close>
							<button
								type="button"
								onClick={handleConfirmClick}
								disabled={isSubmitting || confirmDisabled}
								className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
							>
								{isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
								Create order
							</button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>

			<Dialog.Root
				open={showTemplateWarning}
				onOpenChange={setShowTemplateWarning}
			>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
					<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
						<Dialog.Title className="text-lg font-semibold text-gray-900">
							Create order with empty templates?
						</Dialog.Title>
						<Dialog.Description className="text-sm text-gray-500 mt-2">
							Some securing templates are missing material selections. If you
							continue, those templates will be created without a material and
							can be completed later.
						</Dialog.Description>
						<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
							Missing templates: {templateWarningCount || 0}
						</div>
						<div className="flex justify-end gap-2 mt-6">
							<button
								type="button"
								onClick={() => setShowTemplateWarning(false)}
								className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => {
									setShowTemplateWarning(false);
									onConfirm();
								}}
								className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
							>
								Create anyway
							</button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}
