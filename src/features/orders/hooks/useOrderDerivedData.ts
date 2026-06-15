import { useMemo } from "react";
import type { ManufacturingTemplate } from "../api/manufacturingApi";
import type {
	AttendanceLog,
	Order,
	PackageInstance,
	PackageItem,
	PackageMaterial,
	PackageService,
	TaskLog,
} from "../types";

/**
 * Derived/memoised views over the order-detail query data, scoped to
 * the current selections (package, attendance date, task day).
 */
export function useOrderDerivedData(deps: {
	order: Order | null | undefined;
	attendanceLogs: AttendanceLog[] | undefined;
	taskLogs: TaskLog[] | undefined;
	packageItems: PackageItem[] | undefined;
	pkdItems: any[] | undefined;
	packageInstances: PackageInstance[] | undefined;
	packageMaterials: PackageMaterial[] | undefined;
	packageManufacturing: ManufacturingTemplate[] | undefined;
	packageServices: PackageService[] | undefined;
	selectedPackageId: string | null;
	selectedAttendanceDate: string | null;
	selectedTaskDay: string;
}) {
	const {
		order,
		attendanceLogs,
		taskLogs,
		packageItems,
		pkdItems,
		packageInstances,
		packageMaterials,
		packageManufacturing,
		packageServices,
		selectedPackageId,
		selectedAttendanceDate,
		selectedTaskDay,
	} = deps;

	// Get selected package data
	const selectedPackage = useMemo(() => {
		if (!order?.order_packages || !selectedPackageId) return null;
		return (
			order.order_packages.find((pkg) => pkg.id === selectedPackageId) || null
		);
	}, [order?.order_packages, selectedPackageId]);

	const selectedPackageInstances = useMemo(() => {
		if (!packageInstances || !selectedPackageId) return [];
		return packageInstances
			.filter((instance) => instance.order_package_id === selectedPackageId)
			.sort(
				(a, b) =>
					Number(a.instance_number || 0) - Number(b.instance_number || 0),
			);
	}, [packageInstances, selectedPackageId]);

	// Get manufacturing templates for selected package
	const selectedPackageManufacturing = useMemo(() => {
		if (!packageManufacturing || !selectedPackageId) return [];
		return packageManufacturing.filter(
			(m) => m.order_package_id === selectedPackageId,
		);
	}, [packageManufacturing, selectedPackageId]);

	// Get materials for selected package, grouped by type (excluding manufacturing which is now in securing_template)
	const selectedPackageMaterials = useMemo(() => {
		if (!packageMaterials || !selectedPackageId) {
			return {
				accessories: [],
				securing: [],
				vacuumPacking: [],
				gasPacking: [],
			};
		}

		const pkgMaterials = packageMaterials.filter(
			(m) => m.order_package_id === selectedPackageId,
		);

		return {
			accessories: pkgMaterials.filter(
				(m) => m.material_type === "Accessories",
			),
			securing: pkgMaterials.filter(
				(m) => m.material_type === "Securing" && !m.from_template,
			),
			vacuumPacking: pkgMaterials.filter(
				(m) => m.material_type === "Vacuum Packing",
			),
			gasPacking: pkgMaterials.filter((m) => m.material_type === "Gas Packing"),
		};
	}, [packageMaterials, selectedPackageId]);

	// Get services for selected package
	const selectedPackageServices = useMemo(() => {
		if (!packageServices || !selectedPackageId) return [];
		return packageServices.filter(
			(s) => s.order_package_id === selectedPackageId,
		);
	}, [packageServices, selectedPackageId]);

	// Get unique attendance dates
	const attendanceDates = useMemo(() => {
		if (!attendanceLogs) return [];
		const dates = [...new Set(attendanceLogs.map((log) => log.log_date))];
		return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
	}, [attendanceLogs]);

	// Filter attendance by selected date - SORTED: Morning first (A-Z), then Afternoon (A-Z)
	const filteredAttendance = useMemo(() => {
		if (!attendanceLogs || !selectedAttendanceDate) return [];
		const filtered = attendanceLogs.filter(
			(log) => log.log_date === selectedAttendanceDate,
		);

		// Sort: shift order (morning, afternoon, full_day), then by name A-Z
		const shiftOrder: Record<string, number> = {
			morning: 0,
			afternoon: 1,
			full_day: 2,
		};
		return filtered.sort((a, b) => {
			const shiftDiff =
				(shiftOrder[a.shift_period] ?? 99) - (shiftOrder[b.shift_period] ?? 99);
			if (shiftDiff !== 0) return shiftDiff;
			// Same shift, sort by name A-Z
			const nameA = a.packer?.full_name?.toLowerCase() || "";
			const nameB = b.packer?.full_name?.toLowerCase() || "";
			return nameA.localeCompare(nameB);
		});
	}, [attendanceLogs, selectedAttendanceDate]);

	// Combine standard items and inventory items for the Items tab
	const combinedPackageItems = useMemo(() => {
		const standardItems = (packageItems || [])
			.filter((item) => item.order_package_id === selectedPackageId)
			.map((item) => ({ ...item, source: "custom" as const }));

		const invItems = (pkdItems || [])
			.filter((item) => {
				const instance = packageInstances?.find(
					(inst) => inst.id === item.pkg_instance_id,
				);
				return instance?.order_package_id === selectedPackageId;
			})
			.map((item) => {
				const instance = packageInstances?.find(
					(inst) => inst.id === item.pkg_instance_id,
				);
				return {
					id: item.id,
					designation: item.items_db?.description || "Unknown Inventory Item",
					quantity: item.quantity,
					length: item.items_db?.length,
					width: item.items_db?.width,
					height: item.items_db?.height,
					source: "inventory" as const,
					instance_number: instance?.instance_number ?? undefined,
					warehouse_location: item.items_db?.warehouse_location,
					item_num: item.items_db?.item_num,
				};
			});

		return [...standardItems, ...invItems];
	}, [packageItems, pkdItems, selectedPackageId, packageInstances]);

	// Get tasks for selected package with day filtering and sorting
	const tasksForPackage = useMemo(() => {
		if (!taskLogs || !selectedPackageId) return [];
		let tasks = taskLogs.filter((log) =>
			log.task_packages.some((tp) => tp.order_package_id === selectedPackageId),
		);

		// Filter by selected day if not 'all'
		if (selectedTaskDay !== "all") {
			tasks = tasks.filter((log) => {
				const logDate = new Date(log.start_time).toISOString().split("T")[0];
				return logDate === selectedTaskDay;
			});
		}

		// Sort by start_time descending (most recent first)
		return tasks.sort(
			(a, b) =>
				new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
		);
	}, [taskLogs, selectedPackageId, selectedTaskDay]);

	// Get unique days for the selected package tasks
	const taskDays = useMemo(() => {
		if (!taskLogs || !selectedPackageId) return [];
		const tasks = taskLogs.filter((log) =>
			log.task_packages.some((tp) => tp.order_package_id === selectedPackageId),
		);
		const days = [
			...new Set(
				tasks.map(
					(log) => new Date(log.start_time).toISOString().split("T")[0],
				),
			),
		].sort((a, b) => b.localeCompare(a)); // Sort descending (most recent first)
		return days;
	}, [taskLogs, selectedPackageId]);

	return {
		selectedPackage,
		selectedPackageInstances,
		selectedPackageManufacturing,
		selectedPackageMaterials,
		selectedPackageServices,
		attendanceDates,
		filteredAttendance,
		combinedPackageItems,
		tasksForPackage,
		taskDays,
	};
}
