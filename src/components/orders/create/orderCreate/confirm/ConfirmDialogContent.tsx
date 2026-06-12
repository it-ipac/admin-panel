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
	onInstanceOverrideChange,
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
							<Dialog.Title className="text-lg font-semibold text-neutral-900">
								Confirm new order
							</Dialog.Title>
							<Dialog.Description className="text-sm text-neutral-500">
								Please review the order details before creating it.
							</Dialog.Description>
						</div>
						<button
							type="button"
							onClick={() => setShowDetails(!showDetails)}
							className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
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
						<div className="rounded-lg border border-neutral-200 p-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
								<div className="space-y-3">
									<div>
										<p className="text-xs text-neutral-500">Order name</p>
										<p className="font-medium text-neutral-900">
											{summary.orderName}
										</p>
									</div>
									<div>
										<p className="text-xs text-neutral-500">Source file</p>
										<p className="font-medium text-neutral-900">
											{summary.fileName || "Not provided"}
										</p>
									</div>
									<div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
										<p className="text-xs text-neutral-500">
											Order packages summary
										</p>
										<p className="text-sm font-medium text-neutral-900">
											{summary.packageCount || 0} package(s)
										</p>
									</div>
								</div>
								<div className="space-y-3">
									<div>
										<p className="text-xs text-neutral-500">Client</p>
										<p className="font-medium text-neutral-900">
											{summary.clientName}
										</p>
									</div>
									{summary.selectedCategoryLabels &&
										summary.selectedCategoryLabels.length > 0 && (
											<div>
												<p className="text-xs text-neutral-500">
													Mapped categories
												</p>
												<div className="mt-1 flex flex-wrap gap-1.5">
													{summary.selectedCategoryLabels.map((label) => (
														<span
															key={label}
															className="rounded-full border border-primary-100 bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700"
														>
															{label}
														</span>
													))}
												</div>
											</div>
										)}
									{summary.clientMode === "new" && summary.newClientDetails && (
										<div>
											<p className="text-xs text-neutral-500">
												New client contact
											</p>
											<p className="font-medium text-neutral-900">
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
							onInstanceOverrideChange={onInstanceOverrideChange}
						/>

						{showDetails && (
							<div className="space-y-3">
								{detailTables.map((table) => (
									<div
										key={table.tableName}
										className="rounded-lg border border-neutral-200 p-4"
									>
										<div className="flex items-center justify-between mb-2">
											<div>
												<p className="text-sm font-semibold text-neutral-900">
													{table.tableName}
												</p>
												<p className="text-xs text-neutral-500">
													{table.description}
												</p>
											</div>
										</div>
										<div className="space-y-2 text-xs text-neutral-700">
											{table.columns.map((column) => (
												<div
													key={`${table.tableName}-${column.column}`}
													className="flex flex-col md:flex-row md:items-center md:justify-between gap-1"
												>
													<span className="font-medium text-neutral-800">
														{column.column}
													</span>
													<span className="text-neutral-600">
														{column.value}
													</span>
													{column.note && (
														<span className="text-neutral-400">
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
						<div className="mt-4 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
							{submitError || confirmDisabledReason}
						</div>
					)}

					{fetchItemsDisabledReason && (
						<div className="mt-4 rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
							{fetchItemsDisabledReason}
						</div>
					)}

					{templateWarningCount !== undefined &&
						templateWarningCount > 0 &&
						!confirmDisabled && (
							<div className="mt-4 rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
								{templateWarningCount} securing template
								{templateWarningCount > 1 ? "s are" : " is"} missing material
								selections. You can continue to create the order; templates will
								be saved empty.
							</div>
						)}

					<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Dialog.Close asChild>
							<button className="w-full sm:w-auto px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg">
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
									className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg border border-success-200 bg-success-50 text-success-700 hover:bg-success-100 disabled:opacity-50"
								>
									Make All Positive ({negativeValueCount})
								</button>
							)}
						<button
							type="button"
							onClick={onFetchItems}
							disabled={isSubmitting || isFetchingItems || fetchItemsDisabled}
							className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-50"
						>
							{isFetchingItems && <Loader2 className="w-4 h-4 animate-spin" />}
							Fetch Items
						</button>
						<button
							type="button"
							onClick={onConfirmClick}
							disabled={isSubmitting || confirmDisabled}
							className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
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
