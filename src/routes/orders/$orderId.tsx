/**
 * Order Detail Page - Container Component
 *
 * ARCHITECTURE: Container-Presenter Pattern
 *
 * This route is the wiring layer only. All orchestration lives in
 * useOrderDetailPage (features/orders/hooks), which composes:
 * - Data layer: useOrderQueries — every read query
 * - Mutation layer: useOrderItemMutations / usePackageMutations /
 *   useMaterialMutations / useInstanceMutations / useOrderMutations /
 *   useDeleteOrderCascade — all writes + cache invalidation
 * - Flow hooks: useGlobalDestinationSync / useInventorySync /
 *   useAttendanceCleaner / useRegenerateReferences — multi-step admin flows
 *
 * The UI is composed from pure presenters under components/orders/orderId
 * (sections/, modals/, tabs/) that receive data + callbacks via props.
 * This keeps a single source of truth for server state, centralized
 * cache invalidation and presenters that are testable in isolation.
 */

import { createFileRoute } from "@tanstack/react-router";
import { FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Suspense } from "react";
import { MediaGallery } from "../../components/orders/orderId/MediaGallery";
import { AddItemModal } from "../../components/orders/orderId/modals/AddItemModal";
import { AddMaterialModal } from "../../components/orders/orderId/modals/AddMaterialModal";
import { AttendanceCleanerModal } from "../../components/orders/orderId/modals/AttendanceCleanerModal";
import { EndTaskModal } from "../../components/orders/orderId/modals/EndTaskModal";
import { GlobalSyncModal } from "../../components/orders/orderId/modals/GlobalSyncModal";
import { SyncInventoryModal } from "../../components/orders/orderId/modals/SyncInventoryModal";
import { AllocationsSection } from "../../components/orders/orderId/sections/AllocationsSection";
import { AttendanceSection } from "../../components/orders/orderId/sections/AttendanceSection";
import { DangerZone } from "../../components/orders/orderId/sections/DangerZone";
import { OrderAllocationRequestsSection } from "../../components/orders/orderId/sections/OrderAllocationRequestsSection";
import {
	OrderDetailSkeleton,
	OrderDetailSkeletonBody,
	OrderNotFound,
} from "../../components/orders/orderId/sections/OrderDetailFallbacks";
import { OrderHeader } from "../../components/orders/orderId/sections/OrderHeader";
import {
	ClientInfoCard,
	OrderDetailsCard,
	WorkSummaryCard,
} from "../../components/orders/orderId/sections/OrderSidebarCards";
import { OrderStatusCard } from "../../components/orders/orderId/sections/OrderStatusCard";
import { PackageDetailsSection } from "../../components/orders/orderId/sections/PackageDetailsSection";
import { PackagesTable } from "../../components/orders/orderId/sections/PackagesTable";
import { TasksSection } from "../../components/orders/orderId/sections/TasksSection";
import { TeamMembersCard } from "../../components/orders/orderId/sections/TeamMembersCard";
import { Sidebar } from "../../components/Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { useRequirePageAccess } from "../../hooks/usePageAccess";

const ALLOCATION_EDIT_ROLES = [
	"admin",
	"executive",
	"project_lead",
	"director",
];

export const Route = createFileRoute("/orders/$orderId")({
	component: OrderDetailPage,
});

import { useMovePackage } from "@/features/orders/hooks/useMovePackage";
import { useOrderDetailPage } from "@/features/orders/hooks/useOrderDetailPage";

function OrderDetailPage() {
	useRequirePageAccess();
	const { orderId } = Route.useParams();
	const { profile } = useAuth();
	const canEditAllocations = ALLOCATION_EDIT_ROLES.includes(
		profile?.roles?.name ?? "",
	);
	const page = useOrderDetailPage(orderId);
	const movePackageMutation = useMovePackage();
	const {
		authLoading,
		queries,
		itemMutations,
		packageMutations,
		materialMutations,
		instanceMutations,
		orderMutations,
		deleteOrder,
		addItemForm,
		addMaterialForm,
		globalSync,
		inventorySync,
		regenerateReferences,
		attendanceCleaner,
		derived,
	} = page;
	const { order, orderLoading, orderError: error } = queries;

	if (authLoading || orderLoading) {
		return <OrderDetailSkeleton />;
	}

	if (error || !order) {
		return <OrderNotFound error={error} />;
	}

	return (
		<div className="flex h-screen bg-neutral-50">
			<Sidebar />
			<Suspense
				fallback={
					<main className="flex-1 overflow-y-auto">
						<OrderDetailSkeletonBody />
					</main>
				}
			>
				<main className="flex-1 overflow-y-auto">
					<div className="p-6 animate-fade-in">
						<OrderHeader
							order={order}
							isEditingName={page.isEditingName}
							setIsEditingName={page.setIsEditingName}
							editedName={page.editedName}
							setEditedName={page.setEditedName}
							updateOrderNameMutation={orderMutations.updateOrderNameMutation}
							onExportExcel={page.exportToExcel}
						/>

						{globalSync.showGlobalSyncModal && (
							<GlobalSyncModal
								globalSyncInstances={globalSync.globalSyncInstances}
								isGlobalSyncing={globalSync.isGlobalSyncing}
								onClose={() => globalSync.setShowGlobalSyncModal(false)}
								onConfirm={globalSync.handleConfirmGlobalSync}
							/>
						)}

						{inventorySync.showSyncInventoryModal && (
							<SyncInventoryModal
								order={order}
								packageItems={queries.packageItems}
								clientInventory={queries.clientInventory}
								packageInstances={queries.packageInstances}
								syncInventoryTab={inventorySync.syncInventoryTab}
								setSyncInventoryTab={inventorySync.setSyncInventoryTab}
								outOfSyncItems={inventorySync.outOfSyncItems}
								mappingConfigs={inventorySync.mappingConfigs}
								setMappingConfigs={inventorySync.setMappingConfigs}
								isSavingSync={inventorySync.isSavingSync}
								onClose={() => inventorySync.setShowSyncInventoryModal(false)}
								onConfirm={inventorySync.handleConfirmSyncInventory}
							/>
						)}

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Main Content */}
							<div className="lg:col-span-2 space-y-6">
								<OrderStatusCard
									order={order}
									updateOrderStatusMutation={
										orderMutations.updateOrderStatusMutation
									}
								/>

								<PackagesTable
									order={order}
									updatePackageStatusMutation={
										packageMutations.updatePackageStatusMutation
									}
								/>

								<AllocationsSection
									orderId={orderId}
									clientId={order.clients?.id ?? null}
									canEdit={canEditAllocations}
								/>

								<TeamMembersCard teamMembers={queries.teamMembers} />

								<AttendanceSection
									attendanceLogs={queries.attendanceLogs}
									attendanceDates={derived.attendanceDates}
									selectedAttendanceDate={page.selectedAttendanceDate}
									setSelectedAttendanceDate={page.setSelectedAttendanceDate}
									filteredAttendance={derived.filteredAttendance}
									onCleanAttendance={attendanceCleaner.calculateProposedChanges}
								/>

								<TasksSection
									order={order}
									taskLogs={queries.taskLogs}
									selectedPackageId={page.selectedPackageId}
									setSelectedPackageId={page.setSelectedPackageId}
									selectedTaskDay={page.selectedTaskDay}
									setSelectedTaskDay={page.setSelectedTaskDay}
									taskDays={derived.taskDays}
									tasksForPackage={derived.tasksForPackage}
									onOpenEndTaskModal={page.handleOpenEndTaskModal}
								/>

								<PackageDetailsSection
									order={order}
									selectedPackage={derived.selectedPackage}
									selectedPackageId={page.selectedPackageId}
									setSelectedPackageId={page.setSelectedPackageId}
									selectedPackageTab={page.selectedPackageTab}
									setSelectedPackageTab={page.setSelectedPackageTab}
									combinedPackageItems={derived.combinedPackageItems}
									selectedPackageInstances={derived.selectedPackageInstances}
									selectedPackageManufacturing={
										derived.selectedPackageManufacturing
									}
									selectedPackageMaterials={derived.selectedPackageMaterials}
									selectedPackageServices={derived.selectedPackageServices}
									clientCategories={queries.clientCategories || []}
									tagTaxonomy={queries.tagTaxonomy}
									currentOrderId={orderId}
									movePackageMutation={movePackageMutation}
									updatePackageInfoMutation={
										packageMutations.updatePackageInfoMutation
									}
									duplicatePackageMutation={
										packageMutations.duplicatePackageMutation
									}
									removePackageMutation={packageMutations.removePackageMutation}
									updateInstanceMutation={
										instanceMutations.updateInstanceMutation
									}
									removeInstanceMutation={
										instanceMutations.removeInstanceMutation
									}
									regenerateReferenceMutation={
										instanceMutations.regenerateReferenceMutation
									}
									updatePackageItemMutation={
										itemMutations.updatePackageItemMutation
									}
									deletePackageItemMutation={
										itemMutations.deletePackageItemMutation
									}
									deletePkdItemMutation={itemMutations.deletePkdItemMutation}
									updatePackageMaterialMutation={
										materialMutations.updatePackageMaterialMutation
									}
									deletePackageMaterialMutation={
										materialMutations.deletePackageMaterialMutation
									}
									onRegenerateAll={
										regenerateReferences.handleRegenerateReferences
									}
									isRegeneratingAll={
										regenerateReferences.regeneratingReferences
									}
									updatedInstanceIds={regenerateReferences.updatedInstanceIds}
									setShowAddItemModal={addItemForm.setShowAddItemModal}
									setMaterialType={addMaterialForm.setMaterialType}
									resetMaterialForm={addMaterialForm.resetMaterialForm}
									setShowAddMaterialModal={
										addMaterialForm.setShowAddMaterialModal
									}
								/>

								{/* Media Gallery - Packer Images */}
								<MediaGallery
									mediaItems={queries.mediaItems}
									orderPackages={order.order_packages}
									selectedPackageId={page.selectedPackageId}
									onSelectPackage={page.setSelectedPackageId}
								/>

								<AddItemModal
									open={addItemForm.showAddItemModal}
									onOpenChange={addItemForm.setShowAddItemModal}
									itemSource={addItemForm.itemSource}
									setItemSource={addItemForm.setItemSource}
									itemForm={addItemForm.itemForm}
									setItemForm={addItemForm.setItemForm}
									itemValidationErrors={addItemForm.itemValidationErrors}
									setItemValidationErrors={addItemForm.setItemValidationErrors}
									selectedInstanceId={addItemForm.selectedInstanceId}
									setSelectedInstanceId={addItemForm.setSelectedInstanceId}
									clientInventory={queries.clientInventory}
									selectedPackageInstances={derived.selectedPackageInstances}
									onSubmit={addItemForm.handleAddItem}
									isSubmitting={
										itemMutations.addPackageItemMutation.isPending ||
										itemMutations.addPkdItemMutation.isPending
									}
								/>

								<AddMaterialModal
									open={addMaterialForm.showAddMaterialModal}
									onOpenChange={addMaterialForm.setShowAddMaterialModal}
									materialType={addMaterialForm.materialType}
									setMaterialType={addMaterialForm.setMaterialType}
									materialForm={addMaterialForm.materialForm}
									setMaterialForm={addMaterialForm.setMaterialForm}
									materialValidationErrors={
										addMaterialForm.materialValidationErrors
									}
									setMaterialValidationErrors={
										addMaterialForm.setMaterialValidationErrors
									}
									availableMaterials={queries.availableMaterials}
									availableUnits={queries.availableUnits}
									onSubmit={addMaterialForm.handleAddMaterial}
									isSubmitting={
										materialMutations.addPackageMaterialMutation.isPending
									}
								/>

								<EndTaskModal
									open={page.showEndTaskModal}
									onOpenChange={page.setShowEndTaskModal}
									endingTask={page.endingTask}
									endTaskTime={page.endTaskTime}
									setEndTaskTime={page.setEndTaskTime}
									onConfirm={() => {
										if (page.endingTask && page.endTaskTime) {
											orderMutations.endTaskMutation.mutate({
												taskLogId: page.endingTask.id,
												endTime: new Date(page.endTaskTime).toISOString(),
											});
										}
									}}
									isPending={orderMutations.endTaskMutation.isPending}
								/>

								{/* Description Section */}
								{order.description && (
									<div className="bg-white rounded-lg border shadow-sm p-6">
										<h2 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
											<FileText className="w-5 h-5" />
											Description
										</h2>
										<p className="text-neutral-700 whitespace-pre-wrap">
											{order.description}
										</p>
									</div>
								)}
							</div>

							{/* Sidebar */}
							<div className="space-y-6">
								<ClientInfoCard order={order} />
								<OrderDetailsCard order={order} />
								<WorkSummaryCard
									teamMembers={queries.teamMembers}
									attendanceLogs={queries.attendanceLogs}
								/>
								<DangerZone
									deleteOrderOpen={page.deleteOrderOpen}
									setDeleteOrderOpen={page.setDeleteOrderOpen}
									deleteOrderError={deleteOrder.deleteOrderError}
									deletingOrder={deleteOrder.deletingOrder}
									onDeleteOrder={deleteOrder.deleteOrderCascade}
									regeneratingReferences={
										regenerateReferences.regeneratingReferences
									}
									onRegenerateReferences={
										regenerateReferences.handleRegenerateReferences
									}
								/>

								{canEditAllocations && (
									<OrderAllocationRequestsSection
										orderId={orderId}
										canReview={canEditAllocations}
									/>
								)}

								{/* Sync tools — dev-oriented, intentionally compact */}
								{canEditAllocations && (
									<div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
										<p className="text-xs font-medium text-neutral-500 mb-3 uppercase tracking-wide">
											Sync tools
										</p>
										<div className="flex flex-col gap-2">
											<button
												type="button"
												onClick={inventorySync.handleScanInventory}
												disabled={inventorySync.isScanningInventory}
												className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-neutral-200 rounded-md text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
											>
												{inventorySync.isScanningInventory ? (
													<Loader2 className="w-3.5 h-3.5 animate-spin" />
												) : (
													<Sparkles className="w-3.5 h-3.5" />
												)}
												Sync &amp; Link Inventory
											</button>
											<button
												type="button"
												onClick={globalSync.handlePrepareGlobalSync}
												className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-neutral-200 rounded-md text-neutral-600 hover:bg-neutral-50 transition-colors"
											>
												<RefreshCw className="w-3.5 h-3.5" />
												Sync Destinations
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</main>
			</Suspense>

			<AttendanceCleanerModal
				open={attendanceCleaner.cleanerModalOpen}
				onOpenChange={attendanceCleaner.setCleanerModalOpen}
				proposedChanges={attendanceCleaner.proposedChanges}
				toggleApproval={attendanceCleaner.toggleApproval}
				approveAll={attendanceCleaner.approveAll}
				applySelectedChanges={attendanceCleaner.applySelectedChanges}
				applyingChanges={attendanceCleaner.applyingChanges}
			/>
		</div>
	);
}
