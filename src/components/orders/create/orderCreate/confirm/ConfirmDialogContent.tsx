import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { PackagePreviewSection } from "./PackagePreviewSection";
import type { OrderCreateConfirmDialogProps } from "./types";

interface ConfirmDialogContentProps extends OrderCreateConfirmDialogProps {
	showDetails: boolean;
	setShowDetails: (value: boolean) => void;
	activePackage: number;
	setActivePackage: (value: number) => void;
	onConfirmClick: () => void;
}

export function ConfirmDialogContent({
	open,
	onOpenChange,
	templateMode,
	summary,
	detailTables,
	packagePreviews,
	packageIssueMessages,
	partIssueMessages,
	itemMatchStatusByPackage,
	onPackageFieldChange,
	onPackageRemove,
	onPackingTypeChange,
	onSeiCategoryChange,
	onSeiProtectionChange,
	onPackingTypeOptionsToggle,
	onManufacturingTypeChange,
	onManufacturingFieldChange,
	onManufacturingOptionsToggle,
	onManufacturingPartAdd,
	onManufacturingPartRemove,
	onFetchItems,
	isFetchingItems,
	fetchItemsDisabled,
	fetchItemsDisabledReason,
	onMakeAllPositive,
	negativeValueCount,
	confirmDisabled,
	confirmDisabledReason,
	templateWarningCount,
	isSubmitting,
	submitError,
	showDetails,
	setShowDetails,
	activePackage,
	setActivePackage,
	onConfirmClick,
}: ConfirmDialogContentProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
				<Dialog.Content className="fixed inset-2 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-auto md:w-full md:max-w-2xl bg-white rounded-xl shadow-2xl p-4 md:p-6 flex flex-col max-h-[calc(100vh-1rem)] md:max-h-[85vh]">
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
							onClick={() => setShowDetails(!showDetails)}
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

					<div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2">

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
									{summary.selectedCategoryLabels &&
										summary.selectedCategoryLabels.length > 0 && (
											<div>
												<p className="text-xs text-gray-500">Mapped categories</p>
												<div className="mt-1 flex flex-wrap gap-1.5">
													{summary.selectedCategoryLabels.map((label) => (
														<span
															key={label}
															className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
														>
															{label}
														</span>
													))}
												</div>
											</div>
										)}
									{summary.clientMode === "new" && summary.newClientDetails && (
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

						<PackagePreviewSection
							packagePreviews={packagePreviews}
							packageIssueMessages={packageIssueMessages || {}}
							partIssueMessages={partIssueMessages || {}}
							itemMatchStatusByPackage={itemMatchStatusByPackage || {}}
							activePackage={activePackage}
							setActivePackage={setActivePackage}
							templateMode={templateMode}
							onPackageFieldChange={onPackageFieldChange}
							onPackageRemove={onPackageRemove}
							onPackingTypeChange={onPackingTypeChange}
							onSeiCategoryChange={onSeiCategoryChange}
							onSeiProtectionChange={onSeiProtectionChange}
							onPackingTypeOptionsToggle={onPackingTypeOptionsToggle}
							onManufacturingTypeChange={onManufacturingTypeChange}
							onManufacturingFieldChange={onManufacturingFieldChange}
							onManufacturingOptionsToggle={onManufacturingOptionsToggle}
							onManufacturingPartAdd={onManufacturingPartAdd}
							onManufacturingPartRemove={onManufacturingPartRemove}
						/>

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
													<span className="text-gray-600">{column.value}</span>
													{column.note && (
														<span className="text-gray-400">{column.note}</span>
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

					{fetchItemsDisabledReason && (
						<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
							{fetchItemsDisabledReason}
						</div>
					)}

					{templateWarningCount !== undefined &&
						templateWarningCount > 0 &&
						!confirmDisabled && (
							<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
								{templateWarningCount} securing template
								{templateWarningCount > 1 ? "s are" : " is"} missing material
								selections. You can continue to create the order; templates will
								be saved empty.
							</div>
						)}

					<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Dialog.Close asChild>
							<button className="w-full sm:w-auto px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
								Cancel
							</button>
						</Dialog.Close>
						{typeof negativeValueCount === "number" &&
							negativeValueCount > 0 &&
							onMakeAllPositive && (
								<button
									type="button"
									onClick={onMakeAllPositive}
									disabled={isSubmitting}
									className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
								>
									Make All Positive ({negativeValueCount})
								</button>
							)}
						<button
							type="button"
							onClick={onFetchItems}
							disabled={isSubmitting || isFetchingItems || fetchItemsDisabled}
							className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
						>
							{isFetchingItems && <Loader2 className="w-4 h-4 animate-spin" />}
							Fetch Items
						</button>
						<button
							type="button"
							onClick={onConfirmClick}
							disabled={isSubmitting || confirmDisabled}
							className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
						>
							{isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
							Create order
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
