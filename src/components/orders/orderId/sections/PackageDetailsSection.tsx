import type { UseMutationResult } from "@tanstack/react-query";
import { Package } from "lucide-react";
import type { ManufacturingTemplate } from "@/features/orders/api/manufacturingApi";
import type {
	Order,
	OrderPackage,
	PackageInfo,
	PackageInstance,
	PackageMaterial,
	PackageService,
} from "@/features/orders/types";
import { AccessoriesTab } from "../tabs/AccessoriesTab";
import { CommentsTab } from "../tabs/CommentsTab";
import { ManufacturingTab } from "../tabs/ManufacturingTab";
import { PackageInfoTab } from "../tabs/PackageInfoTab";
import { PackageItemsTab } from "../tabs/PackageItemsTab";
import { SecuringTab } from "../tabs/SecuringTab";
import { ServicesTab } from "../tabs/ServicesTab";

export type PackageDetailsTabKey =
	| "info"
	| "items"
	| "manufacturing"
	| "accessories"
	| "securing"
	| "services"
	| "comments";

interface GroupedPackageMaterials {
	accessories: PackageMaterial[];
	securing: PackageMaterial[];
	vacuumPacking: PackageMaterial[];
	gasPacking: PackageMaterial[];
}

interface PackageDetailsSectionProps {
	order: Order;
	selectedPackage: OrderPackage | null;
	selectedPackageId: string | null;
	setSelectedPackageId: (id: string) => void;
	selectedPackageTab: PackageDetailsTabKey;
	setSelectedPackageTab: (tab: PackageDetailsTabKey) => void;
	combinedPackageItems: any[];
	selectedPackageInstances: PackageInstance[];
	selectedPackageManufacturing: ManufacturingTemplate[];
	selectedPackageMaterials: GroupedPackageMaterials;
	selectedPackageServices: PackageService[];
	clientCategories: any[];
	orderCategories: string[];
	updatePackageInfoMutation: UseMutationResult<
		any,
		Error,
		{
			packageId: string;
			infoType: "original" | "final";
			updates: Partial<PackageInfo>;
		}
	>;
	duplicatePackageMutation: UseMutationResult<any, Error, string>;
	removePackageMutation: UseMutationResult<any, Error, string>;
	updateInstanceMutation: UseMutationResult<
		any,
		Error,
		{ instanceId: string; updates: Partial<PackageInstance> }
	>;
	removeInstanceMutation: UseMutationResult<any, Error, string>;
	regenerateReferenceMutation: UseMutationResult<
		any,
		Error,
		{ instanceId: string }
	>;
	updatePackageItemMutation: UseMutationResult<
		any,
		Error,
		{
			id: string;
			designation?: string;
			quantity?: number;
			length?: number | null;
			width?: number | null;
			height?: number | null;
		}
	>;
	deletePackageItemMutation: UseMutationResult<void, Error, string>;
	deletePkdItemMutation: UseMutationResult<void, Error, string>;
	updatePackageMaterialMutation: any;
	deletePackageMaterialMutation: any;
	onRegenerateAll: () => void;
	isRegeneratingAll: boolean;
	updatedInstanceIds: Set<string>;
	setShowAddItemModal: (show: boolean) => void;
	setMaterialType: (type: string) => void;
	resetMaterialForm: () => void;
	setShowAddMaterialModal: (show: boolean) => void;
}

/** Package selector + per-package tab panel (info/items/materials/…). */
export function PackageDetailsSection({
	order,
	selectedPackage,
	selectedPackageId,
	setSelectedPackageId,
	selectedPackageTab,
	setSelectedPackageTab,
	combinedPackageItems,
	selectedPackageInstances,
	selectedPackageManufacturing,
	selectedPackageMaterials,
	selectedPackageServices,
	clientCategories,
	orderCategories,
	updatePackageInfoMutation,
	duplicatePackageMutation,
	removePackageMutation,
	updateInstanceMutation,
	removeInstanceMutation,
	regenerateReferenceMutation,
	updatePackageItemMutation,
	deletePackageItemMutation,
	deletePkdItemMutation,
	updatePackageMaterialMutation,
	deletePackageMaterialMutation,
	onRegenerateAll,
	isRegeneratingAll,
	updatedInstanceIds,
	setShowAddItemModal,
	setMaterialType,
	resetMaterialForm,
	setShowAddMaterialModal,
}: PackageDetailsSectionProps) {
	return (
		<div className="bg-white rounded-lg border shadow-sm overflow-hidden">
			<div className="px-6 py-4 border-b flex items-center gap-2">
				<Package className="w-5 h-5 text-neutral-600" />
				<h2 className="text-lg font-semibold text-neutral-900">
					Package Details
				</h2>
			</div>

			{order.order_packages && order.order_packages.length > 0 ? (
				<>
					{/* Package Selector Tabs */}
					<div className="border-b overflow-x-auto">
						<div className="flex p-2 gap-1 min-w-max">
							{[...order.order_packages]
								.sort((a, b) => a.package_number - b.package_number)
								.map((pkg) => (
									<button
										key={pkg.id}
										onClick={() => {
											setSelectedPackageId(pkg.id);
											setSelectedPackageTab("info");
										}}
										className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
											selectedPackageId === pkg.id
												? "bg-primary-600 text-white"
												: "text-neutral-600 hover:bg-neutral-100"
										}`}
									>
										Box #{pkg.package_number}
										<span
											className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
												selectedPackageId === pkg.id
													? "bg-primary-500 text-white"
													: "bg-neutral-200 text-neutral-600"
											}`}
										>
											{pkg.status || "pending"}
										</span>
									</button>
								))}
						</div>
					</div>

					{selectedPackage && (
						<>
							{/* Section Tabs */}
							<div className="border-b bg-neutral-50">
								<div className="flex p-2 gap-1 overflow-x-auto">
									{[
										{ key: "info", label: "Info" },
										{
											key: "items",
											label: "Items",
											count: combinedPackageItems.length,
										},
										{
											key: "manufacturing",
											label: "Manufacturing",
											count: selectedPackageManufacturing.length,
										},
										{
											key: "accessories",
											label: "Accessories",
											count: selectedPackageMaterials.accessories.length,
										},
										{
											key: "securing",
											label: "Securing",
											count: selectedPackageMaterials.securing.length,
										},
										{
											key: "services",
											label: "Services",
											count: selectedPackageServices.length,
										},
										{
											key: "comments",
											label: "Comments",
											count: (selectedPackage.comments || []).length,
										},
									].map((tab) => (
										<button
											key={tab.key}
											onClick={() =>
												setSelectedPackageTab(tab.key as PackageDetailsTabKey)
											}
											className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
												selectedPackageTab === tab.key
													? "bg-white text-neutral-900 shadow-sm"
													: "text-neutral-600 hover:text-neutral-900"
											}`}
										>
											{tab.label}
											{tab.count !== undefined && (
												<span
													className={`ml-1 text-xs ${
														selectedPackageTab === tab.key
															? "text-neutral-500"
															: "text-neutral-400"
													}`}
												>
													({tab.count})
												</span>
											)}
										</button>
									))}
								</div>
							</div>

							{/* Tab Content */}
							<div className="p-6">
								{/* Info Tab */}
								{selectedPackageTab === "info" && (
									<PackageInfoTab
										selectedPackage={selectedPackage}
										selectedPackageInstances={selectedPackageInstances}
										updatePackageInfoMutation={updatePackageInfoMutation}
										duplicatePackageMutation={duplicatePackageMutation}
										removePackageMutation={removePackageMutation}
										updateInstanceMutation={updateInstanceMutation}
										removeInstanceMutation={removeInstanceMutation}
										regenerateReferenceMutation={regenerateReferenceMutation}
										packageItems={combinedPackageItems}
										clientCategories={clientCategories || []}
										orderCategories={orderCategories || []}
										onRegenerateAll={onRegenerateAll}
										isRegeneratingAll={isRegeneratingAll}
										updatedInstanceIds={updatedInstanceIds}
									/>
								)}

								{/* Items Tab */}
								{selectedPackageTab === "items" && (
									<PackageItemsTab
										selectedPackageItems={combinedPackageItems}
										updatePackageItemMutation={updatePackageItemMutation}
										deletePackageItemMutation={deletePackageItemMutation}
										deletePkdItemMutation={deletePkdItemMutation}
										setShowAddItemModal={setShowAddItemModal}
									/>
								)}

								{/* Manufacturing Tab */}
								{selectedPackageTab === "manufacturing" &&
									selectedPackageManufacturing && (
										<ManufacturingTab
											selectedPackageManufacturing={
												selectedPackageManufacturing
											}
										/>
									)}

								{/* Accessories Tab */}
								{selectedPackageTab === "accessories" && (
									<AccessoriesTab
										selectedPackageMaterials={selectedPackageMaterials}
										updatePackageMaterialMutation={
											updatePackageMaterialMutation
										}
										deletePackageMaterialMutation={
											deletePackageMaterialMutation
										}
										setMaterialType={setMaterialType}
										resetMaterialForm={resetMaterialForm}
										setShowAddMaterialModal={setShowAddMaterialModal}
									/>
								)}

								{/* Securing Tab */}
								{selectedPackageTab === "securing" && (
									<SecuringTab
										selectedPackageMaterials={selectedPackageMaterials}
										updatePackageMaterialMutation={
											updatePackageMaterialMutation
										}
										deletePackageMaterialMutation={
											deletePackageMaterialMutation
										}
										setMaterialType={setMaterialType}
										resetMaterialForm={resetMaterialForm}
										setShowAddMaterialModal={setShowAddMaterialModal}
									/>
								)}

								{/* Services Tab */}
								{selectedPackageTab === "services" && (
									<ServicesTab
										selectedPackageMaterials={selectedPackageMaterials}
										selectedPackageServices={selectedPackageServices}
									/>
								)}

								{/* Comments Tab */}
								{selectedPackageTab === "comments" && (
									<CommentsTab selectedPackage={selectedPackage} />
								)}
							</div>
						</>
					)}
				</>
			) : (
				<div className="p-6 text-center text-neutral-500">
					<Package className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
					<p>No packages in this order</p>
				</div>
			)}
		</div>
	);
}
