import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSmartEndTime } from "@/components/orders/orderId/orderDetailPresentation";
import { useToastContext } from "@/components/ui/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import type { TaskLog } from "../types";
import { exportOrderExcel } from "../utils/excel/exportOrderExcel";
import { useAddItemForm } from "./useAddItemForm";
import { useAddMaterialForm } from "./useAddMaterialForm";
import { useAttendanceCleaner } from "./useAttendanceCleaner";
import { useDeleteOrderCascade } from "./useDeleteOrderCascade";
import { useGlobalDestinationSync } from "./useGlobalDestinationSync";
import { useInstanceMutations } from "./useInstanceMutations";
import { useInventorySync } from "./useInventorySync";
import { useMaterialMutations } from "./useMaterialMutations";
import { useOrderDerivedData } from "./useOrderDerivedData";
import { useOrderItemMutations } from "./useOrderItemMutations";
import { useOrderMutations } from "./useOrderMutations";
import { useOrderQueries } from "./useOrderQueries";
import { usePackageMutations } from "./usePackageMutations";
import { useRegenerateReferences } from "./useRegenerateReferences";

export type PackageDetailsTabKey =
	| "info"
	| "items"
	| "manufacturing"
	| "accessories"
	| "securing"
	| "services"
	| "comments";

/**
 * Container hook for the order detail route: composes auth guard,
 * queries, mutations, admin flows, form state, derived data and page
 * effects into a single object consumed by the route's JSX.
 */
export function useOrderDetailPage(orderId: string) {
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();
	const { toast } = useToastContext();

	// ========== LOCAL UI STATE ==========
	const [deleteOrderOpen, setDeleteOrderOpen] = useState(false);
	const [isEditingName, setIsEditingName] = useState(false);
	const [editedName, setEditedName] = useState("");

	const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<
		string | null
	>(null);
	const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
		() => {
			if (typeof window !== "undefined") {
				const params = new URLSearchParams(window.location.search);
				return params.get("packageId");
			}
			return null;
		},
	);
	const [selectedPackageTab, setSelectedPackageTab] =
		useState<PackageDetailsTabKey>("info");

	// End Task Modal State
	const [showEndTaskModal, setShowEndTaskModal] = useState(false);
	const [endingTask, setEndingTask] = useState<TaskLog | null>(null);
	const [endTaskTime, setEndTaskTime] = useState("");
	const [selectedTaskDay, setSelectedTaskDay] = useState<string>("all");

	useEffect(() => {
		if (!authLoading && !user) {
			navigate({ to: "/login" });
		}
	}, [user, authLoading, navigate]);

	// ========== QUERIES ==========
	const queries = useOrderQueries(orderId, !!user);
	const { order, orderLoading, attendanceLogs, taskLogs } = queries;

	useEffect(() => {
		if (order?.order_name) {
			setEditedName(order.order_name);
		}
	}, [order?.order_name]);

	useEffect(() => {
		if (!orderLoading && user && !order) {
			navigate({ to: "/orders" });
		}
	}, [orderLoading, order, user, navigate]);

	// ========== MUTATION HOOKS ==========
	const itemMutations = useOrderItemMutations(orderId);

	const packageMutations = usePackageMutations(orderId, {
		onPackageRemoved: () => setSelectedPackageId(null),
	});

	const materialMutations = useMaterialMutations(orderId);

	const instanceMutations = useInstanceMutations(orderId);

	const orderMutations = useOrderMutations(orderId, {
		taskLogs,
		onNameSaved: () => setIsEditingName(false),
		onTaskEnded: () => {
			setShowEndTaskModal(false);
			setEndingTask(null);
		},
	});

	const deleteOrder = useDeleteOrderCascade(orderId);

	// ========== FORM + FLOW HOOKS ==========
	const addItemForm = useAddItemForm({
		selectedPackageId,
		addPackageItemMutation: itemMutations.addPackageItemMutation,
		addPkdItemMutation: itemMutations.addPkdItemMutation,
	});

	const addMaterialForm = useAddMaterialForm({
		selectedPackageId,
		addPackageMaterialMutation: materialMutations.addPackageMaterialMutation,
	});

	const globalSync = useGlobalDestinationSync({
		order,
		packageItems: queries.packageItems,
		pkdItems: queries.pkdItems,
		packageInstances: queries.packageInstances,
		updateInstanceMutation: instanceMutations.updateInstanceMutation,
	});

	const inventorySync = useInventorySync({
		order,
		packageItems: queries.packageItems,
		clientInventory: queries.clientInventory,
		packageInstances: queries.packageInstances,
		syncInventoryCountersMutation: itemMutations.syncInventoryCountersMutation,
		mapCustomItemMutation: itemMutations.mapCustomItemMutation,
	});

	const regenerateReferences = useRegenerateReferences(orderId);

	const attendanceCleaner = useAttendanceCleaner(
		orderId,
		attendanceLogs,
		selectedAttendanceDate,
	);

	// ========== DERIVED DATA ==========
	const derived = useOrderDerivedData({
		order,
		attendanceLogs,
		taskLogs,
		packageItems: queries.packageItems,
		pkdItems: queries.pkdItems,
		packageInstances: queries.packageInstances,
		packageMaterials: queries.packageMaterials,
		packageManufacturing: queries.packageManufacturing,
		packageServices: queries.packageServices,
		selectedPackageId,
		selectedAttendanceDate,
		selectedTaskDay,
	});

	// Set default selected date when attendance loads
	useEffect(() => {
		if (derived.attendanceDates.length > 0 && !selectedAttendanceDate) {
			setSelectedAttendanceDate(derived.attendanceDates[0]);
		}
	}, [derived.attendanceDates, selectedAttendanceDate]);

	// Set default selected package when order loads
	useEffect(() => {
		if (order?.order_packages?.length && !selectedPackageId) {
			const sortedPackages = [...order.order_packages].sort(
				(a, b) => a.package_number - b.package_number,
			);
			setSelectedPackageId(sortedPackages[0].id);
		}
	}, [order, selectedPackageId]);

	// Show toast if redirected from client DB snapshot
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const moveToBox = params.get("moveToBox");
		if (moveToBox) {
			const boxText = moveToBox.toLowerCase().includes("box")
				? moveToBox
				: `box ${moveToBox}`;
			toast({
				title: "Move to Box",
				description: `Please move to ${boxText}`,
				variant: "info",
			});
			params.delete("moveToBox");
			params.delete("packageId");
			const search = params.toString();
			const newUrl = `${window.location.pathname}${search ? `?${search}` : ""}`;
			window.history.replaceState({}, document.title, newUrl);
		}
	}, [toast]);

	// Open end task modal with smart defaults
	const handleOpenEndTaskModal = (task: TaskLog): void => {
		setEndingTask(task);
		setEndTaskTime(getSmartEndTime(task, attendanceLogs));
		setShowEndTaskModal(true);
	};

	// Excel export — sheets are built in features/orders/utils/excel
	const exportToExcel = async (): Promise<void> => {
		if (!order) return;
		await exportOrderExcel({
			order,
			attendanceLogs,
			packageMaterials: queries.packageMaterials,
		});
	};

	return {
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
		// local UI state
		deleteOrderOpen,
		setDeleteOrderOpen,
		isEditingName,
		setIsEditingName,
		editedName,
		setEditedName,
		selectedAttendanceDate,
		setSelectedAttendanceDate,
		selectedPackageId,
		setSelectedPackageId,
		selectedPackageTab,
		setSelectedPackageTab,
		showEndTaskModal,
		setShowEndTaskModal,
		endingTask,
		endTaskTime,
		setEndTaskTime,
		selectedTaskDay,
		setSelectedTaskDay,
		// handlers
		handleOpenEndTaskModal,
		exportToExcel,
	};
}
