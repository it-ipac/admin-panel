/**
 * Order Detail Page - Container Component
 *
 * ARCHITECTURE: Container-Presenter Pattern
 *
 * This file follows the Container-Presenter (Smart-Dumb) pattern where:
 * - Container (this file): Handles all data fetching, mutations, and business logic
 * - Presenters (tab components): Receive data via props and focus purely on UI
 *
 * WHY THIS PATTERN?
 *
 * 1. Single Source of Truth
 *    - All data fetching happens once in this container
 *    - Child components receive consistent, synchronized data via props
 *    - Prevents race conditions and stale data across tabs
 *
 * 2. Centralized Cache Management
 *    - TanStack Query cache invalidation is managed in one place
 *    - Mutations trigger refetches from this container
 *    - Easier to debug and trace data flow
 *
 * 3. Performance Optimization
 *    - No duplicate network requests from child components
 *    - Data is fetched once and shared across all tabs
 *    - React Suspense wraps the entire container for optimal loading states
 *
 * 4. Minimal Prop Drilling
 *    - Only 2-3 levels deep (container → tab → inline form)
 *    - Trade-off: Slightly verbose props vs. complex state management
 *    - Alternative (context/zustand) would add unnecessary complexity for this scale
 *
 * 5. Testability & Maintainability
 *    - Tab components are pure presenters - easy to test in isolation
 *    - Business logic is centralized, not scattered across children
 *    - Clear separation of concerns
 *
 * COMPONENT STRUCTURE:
 * - Data Layer: useQuery hooks for orders, packages, items, etc.
 * - Mutation Layer: useMutation hooks for CRUD operations
 * - UI Layer: Tabs, modals, and presentational components
 * - Loading: Suspense boundary with skeleton UI
 */

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import ExcelJS from "exceljs";
import {
	AlertTriangle,
	ArrowLeft,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ClipboardList,
	Clock,
	Download,
	Edit,
	FileSpreadsheet,
	FileText,
	Loader2,
	Mail,
	MapPin,
	Moon,
	Package,
	Phone,
	Play,
	Printer,
	Sparkles,
	StopCircle,
	Sun,
	Sunset,
	Timer,
	Trash2,
	User,
	UserCheck,
	Users,
	Wrench,
	X,
	XCircle,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
	packageItemSchema,
	packageMaterialSchema,
	validateInput,
} from "@/lib/validation";
import { MediaGallery } from "../../components/orders/orderId/MediaGallery";
import { AccessoriesTab } from "../../components/orders/orderId/tabs/AccessoriesTab";
import { CommentsTab } from "../../components/orders/orderId/tabs/CommentsTab";
import { ManufacturingTab } from "../../components/orders/orderId/tabs/ManufacturingTab";
import { PackageInfoTab } from "../../components/orders/orderId/tabs/PackageInfoTab";
import { PackageItemsTab } from "../../components/orders/orderId/tabs/PackageItemsTab";
import { SecuringTab } from "../../components/orders/orderId/tabs/SecuringTab";
import { ServicesTab } from "../../components/orders/orderId/tabs/ServicesTab";
import { Sidebar } from "../../components/Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/orders/$orderId")({
	component: OrderDetailPage,
});

export interface PackageInfo {
	id: string;
	internal_length: number | null;
	internal_width: number | null;
	internal_height: number | null;
	external_length: number | null;
	external_width: number | null;
	external_height: number | null;
	net_weight: number | null;
	gross_weight: number | null;
	tare: number | null;
	quantity: number | null;
	packing_type_id: string | null;
	box_type_id: string | null;
	center_of_gravity: boolean | null;
}

export interface OrderPackage {
	id: string;
	package_number: number;
	description: string | null;
	status: string | null;
	comments: PackageComment[] | null;
	original_pkg_info: PackageInfo | null;
	final_pkg_info: PackageInfo | null;
}

interface Client {
	id: string;
	name: string;
	contact_person: string | null;
	email: string | null;
	phone: string | null;
	address: string | null;
}

interface AttendanceLog {
	id: string;
	log_date: string;
	shift_period: string;
	status: string;
	start_time: string | null;
	end_time: string | null;
	toolbox_briefing_completed: boolean;
	is_project_start: boolean;
	packer: { id: string; full_name: string } | null;
}

interface TeamMember {
	id: string;
	is_team_lead: boolean;
	packer: { id: string; full_name: string } | null;
}

interface TaskLog {
	id: string;
	start_time: string;
	end_time: string | null;
	duration_minutes: number | null;
	notes: string | null;
	task: { id: string; name: string } | null;
	task_packages: { order_package_id: string }[];
	task_assignments: { packer: { id: string; full_name: string } | null }[];
}

export interface Media {
	id: string;
	image_url: string | null;
	signed_url: string | null;
	notes: string | null;
	created_at: string;
	order_package_id: string;
	designation: string | null;
}

interface AttendanceChange {
	id: string;
	packerName: string;
	shift: string;
	currentStart: string | null;
	currentEnd: string | null;
	currentHours: string;
	newEnd: string;
	newHours: string;
	approved: boolean;
}

export interface PackageItem {
	id: string;
	order_package_id: string;
	quantity: number;
	designation: string;
	length: number | null;
	width: number | null;
	height: number | null;
}

export interface PackageMaterial {
	id: string;
	order_package_id: string;
	material_variant_id: string;
	material_type: string;
	is_final: boolean;
	quantity: number;
	unit_id: string | null;
	length: number | null;
	width: number | null;
	height: number | null;
	comment: string | null;
	item_used: boolean;
	quantity_used: number | null;
	variant_name: string | null;
	material_name: string | null;
	unit_name: string | null;
}

export interface PackageService {
	id: string;
	order_package_id: string;
	service_id: string;
	is_final: boolean;
	result: Record<string, any> | null;
	service_name: string | null;
}

export interface PackageComment {
	id: string;
	text: string;
	author: string;
	created_at: string;
}

interface Order {
	id: string;
	order_name: string;
	description: string | null;
	production_status: string;
	commercial_status: string;
	created_at: string;
	updated_at: string | null;
	start_date: string | null;
	completion_date: string | null;
	clients: Client | null;
	project_lead: { full_name: string } | null;
	order_packages: OrderPackage[];
}

function OrderDetailPage() {
	const { orderId } = Route.useParams();
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();
	const queryClient = useQueryClient();
	const [deleteOrderOpen, setDeleteOrderOpen] = useState(false);
	const [deleteOrderError, setDeleteOrderError] = useState<string | null>(null);
	const [deletingOrder, setDeletingOrder] = useState(false);

	useEffect(() => {
		if (!authLoading && !user) {
			navigate({ to: "/login" });
		}
	}, [user, authLoading, navigate]);

	const {
		data: order,
		isLoading: orderLoading,
		error,
	} = useQuery({
		queryKey: ["order", orderId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("orders")
				.select(`
          id,
          order_name,
          description,
          production_status,
          commercial_status,
          created_at,
          updated_at,
          start_date,
          completion_date,
          clients (
            id,
            name,
            contact_person,
            email,
            phone,
            address
          ),
          project_lead:profiles!project_lead_id (
            full_name
          ),
          order_packages (
            id,
            package_number,
            description,
            status,
            comments,
            original_pkg_info:package_info!order_packages_original_pkg_info_fkey (
              id,
              internal_length,
              internal_width,
              internal_height,
              external_length,
              external_width,
              external_height,
              net_weight,
              gross_weight,
              tare,
              quantity,
              packing_type_id,
              box_type_id,
              center_of_gravity
            ),
            final_pkg_info:package_info!order_packages_final_pkg_info_fkey (
              id,
              internal_length,
              internal_width,
              internal_height,
              external_length,
              external_width,
              external_height,
              net_weight,
              gross_weight,
              tare,
              quantity,
              packing_type_id,
              box_type_id,
              center_of_gravity
            )
          )
        `)
				.eq("id", orderId)
				.maybeSingle();

			if (error && error.code !== "PGRST116") throw error;
			if (!data) return null;

			// Unwrap single relations
			const unwrapped = {
				...data,
				clients: Array.isArray(data.clients) ? data.clients[0] : data.clients,
				project_lead: Array.isArray(data.project_lead)
					? data.project_lead[0]
					: data.project_lead,
				order_packages:
					data.order_packages?.map((pkg: any) => ({
						...pkg,
						original_pkg_info: Array.isArray(pkg.original_pkg_info)
							? pkg.original_pkg_info[0]
							: pkg.original_pkg_info,
						final_pkg_info: Array.isArray(pkg.final_pkg_info)
							? pkg.final_pkg_info[0]
							: pkg.final_pkg_info,
					})) || [],
			};

			return unwrapped as Order;
		},
		enabled: !!user,
	});

	useEffect(() => {
		if (!orderLoading && user && !order) {
			navigate({ to: "/orders" });
		}
	}, [orderLoading, order, user, navigate]);

	const deleteOrderTargets = [
		"attendance_logs",
		"order_team_members",
		"task_assignments",
		"task_packages",
		"task_logs",
		"order_package_materials",
		"order_package_services",
		"order_package_securing",
		"securing_template",
		"beam",
		"package_items",
		"media",
		"order_packages",
		"package_info",
		"orders",
	];

	const deleteOrderCascade = async () => {
		if (!orderId) return;
		setDeleteOrderError(null);
		setDeletingOrder(true);

		try {
			const { data: packages, error: packagesError } = await supabase
				.from("order_packages")
				.select("id, original_pkg_info, final_pkg_info")
				.eq("order_id", orderId);

			if (packagesError) throw packagesError;

			const packageIds = (packages || []).map((pkg: any) => pkg.id);
			const packageInfoIds = (packages || [])
				.flatMap((pkg: any) => [pkg.original_pkg_info, pkg.final_pkg_info])
				.filter(Boolean);

			if (packageIds.length > 0) {
				const { data: mediaRows, error: mediaError } = await supabase
					.from("media")
					.select("id, image_url")
					.in("order_package_id", packageIds);

				if (mediaError) throw mediaError;

				const mediaPaths = (mediaRows || [])
					.map((row: any) => row.image_url)
					.filter(Boolean);

				if (mediaPaths.length > 0) {
					const { error: storageError } = await supabase.storage
						.from("media")
						.remove(mediaPaths);
					if (storageError) throw storageError;
				}

				const { error: mediaDeleteError } = await supabase
					.from("media")
					.delete()
					.in("order_package_id", packageIds);
				if (mediaDeleteError) throw mediaDeleteError;

				const { error: packageItemsError } = await supabase
					.from("package_items")
					.delete()
					.in("order_package_id", packageIds);
				if (packageItemsError) throw packageItemsError;

				const { error: materialsError } = await supabase
					.from("order_package_materials")
					.delete()
					.in("order_package_id", packageIds);
				if (materialsError) throw materialsError;

				const { error: servicesError } = await supabase
					.from("order_package_services")
					.delete()
					.in("order_package_id", packageIds);
				if (servicesError) throw servicesError;

				const { data: securingRows, error: securingError } = await supabase
					.from("order_package_securing")
					.select("id, securing_template_id")
					.in("order_package_id", packageIds);
				if (securingError) throw securingError;

				const templateIds = Array.from(
					new Set(
						(securingRows || [])
							.map((row: any) => row.securing_template_id)
							.filter(Boolean),
					),
				);

				let beamIds: string[] = [];
				if (templateIds.length > 0) {
					const { data: templateRows, error: templateRowsError } =
						await supabase
							.from("securing_template")
							.select("id, horizontal_bar, vertical_bar, skids")
							.in("id", templateIds);
					if (templateRowsError) throw templateRowsError;

					beamIds = Array.from(
						new Set(
							(templateRows || [])
								.flatMap((row: any) => [
									row.horizontal_bar,
									row.vertical_bar,
									row.skids,
								])
								.filter(Boolean),
						),
					) as string[];
				}

				const { error: securingDeleteError } = await supabase
					.from("order_package_securing")
					.delete()
					.in("order_package_id", packageIds);
				if (securingDeleteError) throw securingDeleteError;

				if (templateIds.length > 0) {
					const { error: templateDeleteError } = await supabase
						.from("securing_template")
						.delete()
						.in("id", templateIds);
					if (templateDeleteError) throw templateDeleteError;
				}

				if (beamIds.length > 0) {
					const { error: beamError } = await supabase
						.from("beam")
						.delete()
						.in("id", beamIds);
					if (beamError) throw beamError;
				}

				const { data: taskPackages, error: taskPackagesError } = await supabase
					.from("task_packages")
					.select("id, task_log_id")
					.in("order_package_id", packageIds);
				if (taskPackagesError) throw taskPackagesError;

				const taskLogIds = Array.from(
					new Set(
						(taskPackages || [])
							.map((row: any) => row.task_log_id)
							.filter(Boolean),
					),
				);

				const { error: taskPackagesDeleteError } = await supabase
					.from("task_packages")
					.delete()
					.in("order_package_id", packageIds);
				if (taskPackagesDeleteError) throw taskPackagesDeleteError;

				if (taskLogIds.length > 0) {
					const { error: taskAssignmentsError } = await supabase
						.from("task_assignments")
						.delete()
						.in("task_log_id", taskLogIds);
					if (taskAssignmentsError) throw taskAssignmentsError;

					const { error: taskLogsError } = await supabase
						.from("task_logs")
						.delete()
						.in("id", taskLogIds);
					if (taskLogsError) throw taskLogsError;
				}
			}

			const { error: attendanceError } = await supabase
				.from("attendance_logs")
				.delete()
				.eq("order_id", orderId);
			if (attendanceError) throw attendanceError;

			const { error: teamMembersError } = await supabase
				.from("order_team_members")
				.delete()
				.eq("order_id", orderId);
			if (teamMembersError) throw teamMembersError;

			if (packageIds.length > 0) {
				const { error: packagesDeleteError } = await supabase
					.from("order_packages")
					.delete()
					.in("id", packageIds);
				if (packagesDeleteError) throw packagesDeleteError;
			}

			if (packageInfoIds.length > 0) {
				const { error: packageInfoError } = await supabase
					.from("package_info")
					.delete()
					.in("id", packageInfoIds);
				if (packageInfoError) throw packageInfoError;
			}

			const { error: orderDeleteError } = await supabase
				.from("orders")
				.delete()
				.eq("id", orderId);
			if (orderDeleteError) throw orderDeleteError;

			queryClient.invalidateQueries();
			navigate({ to: "/orders" });
		} catch (err: any) {
			setDeleteOrderError(err?.message || "Delete failed. Please try again.");
		} finally {
			setDeletingOrder(false);
		}
	};

	// Fetch attendance logs for this order
	const { data: attendanceLogs } = useQuery({
		queryKey: ["attendance", orderId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("attendance_logs")
				.select(`
          id,
          log_date,
          shift_period,
          status,
          start_time,
          end_time,
          toolbox_briefing_completed,
          is_project_start,
          packer:profiles!attendance_logs_packer_id_fkey (
            id,
            full_name
          )
        `)
				.eq("order_id", orderId)
				.order("log_date", { ascending: false })
				.order("start_time", { ascending: false });

			if (error) throw error;

			// Unwrap packer relation
			return data.map((log) => ({
				...log,
				packer: Array.isArray(log.packer) ? log.packer[0] : log.packer,
			})) as AttendanceLog[];
		},
		enabled: !!user,
	});

	// Fetch team members for this order
	const { data: teamMembers } = useQuery({
		queryKey: ["teamMembers", orderId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("order_team_members")
				.select(`
          id,
          is_team_lead,
          packer:profiles!order_team_members_packer_id_fkey (
            id,
            full_name
          )
        `)
				.eq("order_id", orderId);

			if (error) throw error;

			// Unwrap packer relation
			return data.map((member) => ({
				...member,
				packer: Array.isArray(member.packer) ? member.packer[0] : member.packer,
			})) as TeamMember[];
		},
		enabled: !!user,
	});

	// Fetch task logs for packages in this order
	const { data: taskLogs } = useQuery({
		queryKey: ["taskLogs", orderId],
		queryFn: async () => {
			// First get all order_package_ids for this order
			const { data: packages, error: pkgError } = await supabase
				.from("order_packages")
				.select("id")
				.eq("order_id", orderId);

			if (pkgError) throw pkgError;
			if (!packages || packages.length === 0) return [];

			const packageIds = packages.map((p) => p.id);

			// Get task_packages for these packages
			const { data: taskPackages, error: tpError } = await supabase
				.from("task_packages")
				.select("task_log_id, order_package_id")
				.in("order_package_id", packageIds);

			if (tpError) throw tpError;
			if (!taskPackages || taskPackages.length === 0) return [];

			const taskLogIds = [
				...new Set(taskPackages.map((tp) => tp.task_log_id).filter(Boolean)),
			];
			if (taskLogIds.length === 0) return [];

			// Get full task_logs with assignments
			const { data: logs, error: logsError } = await supabase
				.from("task_logs")
				.select(`
          id,
          start_time,
          end_time,
          duration_minutes,
          notes,
          task:tasks!task_logs_task_id_fkey (
            id,
            name
          ),
          task_assignments (
            packer:profiles!task_assignments_packer_id_fkey (
              id,
              full_name
            )
          )
        `)
				.in("id", taskLogIds)
				.order("start_time", { ascending: false });

			if (logsError) throw logsError;

			// Map task_packages to each task_log
			return logs.map((log) => ({
				...log,
				task: Array.isArray(log.task) ? log.task[0] : log.task,
				task_packages: taskPackages.filter((tp) => tp.task_log_id === log.id),
				task_assignments:
					log.task_assignments?.map((a: any) => ({
						...a,
						packer: Array.isArray(a.packer) ? a.packer[0] : a.packer,
					})) || [],
			})) as TaskLog[];
		},
		enabled: !!user && !!order,
	});

	// Fetch media for all packages in this order
	const { data: mediaItems } = useQuery({
		queryKey: ["media", orderId],
		queryFn: async () => {
			// First get all order_package_ids for this order
			const { data: packages, error: pkgError } = await supabase
				.from("order_packages")
				.select("id")
				.eq("order_id", orderId);

			if (pkgError) throw pkgError;
			if (!packages || packages.length === 0) return [];

			const packageIds = packages.map((p) => p.id);

			// Get all media for these packages
			const { data, error } = await supabase
				.from("media")
				.select(`
          id,
          image_url,
          notes,
          created_at,
          order_package_id,
          designation
        `)
				.in("order_package_id", packageIds)
				.order("created_at", { ascending: false });

			if (error) throw error;
			if (!data || data.length === 0) return [];

			// Generate signed URLs for each media item (bucket is private)
			const mediaWithSignedUrls = await Promise.all(
				data.map(async (item) => {
					if (!item.image_url) {
						return { ...item, signed_url: null } as Media;
					}

					// Generate a signed URL valid for 1 hour (3600 seconds)
					const { data: signedData, error: signedError } =
						await supabase.storage
							.from("media")
							.createSignedUrl(item.image_url, 3600);

					if (signedError) {
						console.error("Error creating signed URL:", signedError);
						return { ...item, signed_url: null } as Media;
					}

					return { ...item, signed_url: signedData.signedUrl } as Media;
				}),
			);

			return mediaWithSignedUrls;
		},
		enabled: !!user && !!order,
	});

	// Fetch package items for all packages in this order
	const { data: packageItems } = useQuery({
		queryKey: ["packageItems", orderId],
		queryFn: async () => {
			const { data: packages, error: pkgError } = await supabase
				.from("order_packages")
				.select("id")
				.eq("order_id", orderId);

			if (pkgError) throw pkgError;
			if (!packages || packages.length === 0) return [];

			const packageIds = packages.map((p) => p.id);

			const { data, error } = await supabase
				.from("package_items")
				.select("*")
				.in("order_package_id", packageIds);

			if (error) throw error;
			return data as PackageItem[];
		},
		enabled: !!user && !!order,
	});

	// Fetch package materials for all packages in this order
	const { data: packageMaterials } = useQuery({
		queryKey: ["packageMaterials", orderId],
		queryFn: async () => {
			const { data: packages, error: pkgError } = await supabase
				.from("order_packages")
				.select("id")
				.eq("order_id", orderId);

			if (pkgError) throw pkgError;
			if (!packages || packages.length === 0) return [];

			const packageIds = packages.map((p) => p.id);

			// Fetch standard materials
			const materialsPromise = supabase
				.from("order_package_materials")
				.select(`
          id,
          order_package_id,
          material_variant_id,
          material_type,
          is_final,
          quantity,
          unit_id,
          length,
          width,
          height,
          comment,
          item_used,
          quantity_used,
          material_variant:material_variants!order_package_materials_material_variant_id_fkey (
            variant_name,
            material:materials!material_variants_material_id_fkey (
              name
            )
          ),
          unit:units_of_measure!order_package_materials_unit_id_fkey (
            name
          )
        `)
				.in("order_package_id", packageIds);

			// Fetch securing materials (beams)
			const securingPromise = supabase
				.from("order_package_securing")
				.select(`
          id,
          order_package_id,
          securing_side,
          is_final,
          securing_template:securing_template!order_package_securing_securing_template_id_fkey (
            id,
            quantity,
            thickness,
            type:material_variants!securing_template_type_id_fkey (
               id, variant_name, material:materials!material_variants_material_id_fkey(name)
            ),
            horizontal_bar:beam!securing_template_horizontal_bar_fkey (
               id, quantity, width, thickness, space, type:material_variants!beam_type_fkey(id, variant_name, material:materials!material_variants_material_id_fkey(name))
            ),
            vertical_bar:beam!securing_template_vertical_bar_fkey (
               id, quantity, width, thickness, space, type:material_variants!beam_type_fkey(id, variant_name, material:materials!material_variants_material_id_fkey(name))
            ),
            skids:beam!securing_template_skids_fkey (
               id, quantity, width, thickness, space, type:material_variants!beam_type_fkey(id, variant_name, material:materials!material_variants_material_id_fkey(name))
            )
          )
        `)
				.in("order_package_id", packageIds);

			const [materialsResult, securingResult] = await Promise.all([
				materialsPromise,
				securingPromise,
			]);

			if (materialsResult.error) throw materialsResult.error;
			if (securingResult.error) throw securingResult.error;

			// Flatten the nested relations for standard materials
			const standardMaterials = materialsResult.data.map((item: any) => ({
				...item,
				variant_name: Array.isArray(item.material_variant)
					? item.material_variant[0]?.variant_name
					: item.material_variant?.variant_name,
				material_name: Array.isArray(item.material_variant)
					? Array.isArray(item.material_variant[0]?.material)
						? item.material_variant[0]?.material[0]?.name
						: item.material_variant[0]?.material?.name
					: Array.isArray(item.material_variant?.material)
						? item.material_variant?.material[0]?.name
						: item.material_variant?.material?.name,
				unit_name: Array.isArray(item.unit)
					? item.unit[0]?.name
					: item.unit?.name,
			}));

			// Process securing materials
			const securingMaterials = securingResult.data.flatMap((securing: any) => {
				const template = securing.securing_template;
				if (!template) return [];

				const materials: any[] = [];

				// Helper to process a beam
				const processBeam = (beam: any, role: string) => {
					if (!beam) return;

					const variantName = Array.isArray(beam.type)
						? beam.type[0]?.variant_name
						: beam.type?.variant_name;

					const materialName = Array.isArray(beam.type)
						? Array.isArray(beam.type[0]?.material)
							? beam.type[0]?.material[0]?.name
							: beam.type[0]?.material?.name
						: Array.isArray(beam.type?.material)
							? beam.type?.material[0]?.name
							: beam.type?.material?.name;

					materials.push({
						id: beam.id,
						order_package_id: securing.order_package_id,
						material_variant_id: Array.isArray(beam.type)
							? beam.type[0]?.id
							: beam.type?.id,
						material_type: "Securing",
						is_final: securing.is_final,
						quantity: beam.quantity || 0,
						unit_id: null,
						length: null, // Beam schema doesn't have length
						width: beam.width,
						height: beam.thickness,
						comment: `Securing: ${role}`,
						item_used: true,
						quantity_used: beam.quantity,
						variant_name: variantName,
						material_name: materialName,
						unit_name: null,
					});
				};

				processBeam(template.horizontal_bar, "Horizontal Bar");
				processBeam(template.vertical_bar, "Vertical Bar");
				processBeam(template.skids, "Skids");

				return materials;
			});

			return [...standardMaterials, ...securingMaterials] as PackageMaterial[];
		},
		enabled: !!user && !!order,
	});

	// Fetch manufacturing templates (order_package_securing with securing_template and beams)
	const { data: packageManufacturing } = useQuery({
		queryKey: ["packageManufacturing", orderId],
		queryFn: async () => {
			const { data: packages, error: pkgError } = await supabase
				.from("order_packages")
				.select("id")
				.eq("order_id", orderId);

			if (pkgError) throw pkgError;
			if (!packages || packages.length === 0) return [];

			const packageIds = packages.map((p) => p.id);

			const { data, error } = await supabase
				.from("order_package_securing")
				.select(`
          id,
          order_package_id,
          securing_side,
          is_final,
          securing_template (
            id,
            quantity,
            thickness,
            type_id,
            horizontal_bar,
            vertical_bar,
            skids,
            type:material_variants!securing_template_type_id_fkey (
              id,
              variant_name,
              material:materials (
                name
              )
            )
          )
        `)
				.in("order_package_id", packageIds);

			if (error) throw error;

			// Fetch beam details for all referenced beams
			const beamIds = new Set<string>();
			data?.forEach((securing: any) => {
				if (securing.securing_template?.horizontal_bar)
					beamIds.add(securing.securing_template.horizontal_bar);
				if (securing.securing_template?.vertical_bar)
					beamIds.add(securing.securing_template.vertical_bar);
				if (securing.securing_template?.skids)
					beamIds.add(securing.securing_template.skids);
			});

			let beamsData: any[] = [];
			if (beamIds.size > 0) {
				const { data: beams, error: beamsError } = await supabase
					.from("beam")
					.select(`
            id,
            quantity,
            width,
            thickness,
            space,
            type:material_variants!beam_type_fkey (
              id,
              variant_name,
              material:materials (
                name
              )
            )
          `)
					.in("id", Array.from(beamIds));

				if (beamsError) throw beamsError;
				beamsData = beams || [];
			}

			// Build lookup map for beams
			const beamMap = new Map(beamsData.map((b) => [b.id, b]));

			// Transform the data to include beam details
			return data.map((securing: any) => {
				const template = securing.securing_template;
				const type = Array.isArray(template?.type)
					? template.type[0]
					: template?.type;
				const typeMaterial = Array.isArray(type?.material)
					? type.material[0]
					: type?.material;

				const getBeamData = (beamId: string | null) => {
					if (!beamId) return null;
					const beam = beamMap.get(beamId);
					if (!beam) return null;
					const beamType = Array.isArray(beam.type) ? beam.type[0] : beam.type;
					const beamMaterial = Array.isArray(beamType?.material)
						? beamType.material[0]
						: beamType?.material;
					return {
						id: beam.id,
						quantity: beam.quantity,
						width: beam.width,
						thickness: beam.thickness,
						space: beam.space,
						type_name: beamType?.variant_name || null,
						material_name: beamMaterial?.name || null,
					};
				};

				return {
					id: securing.id,
					order_package_id: securing.order_package_id,
					securing_side: securing.securing_side,
					is_final: securing.is_final,
					template: {
						id: template?.id,
						quantity: template?.quantity,
						thickness: template?.thickness,
						type_name: type?.variant_name || null,
						material_name: typeMaterial?.name || null,
					},
					horizontal_bar: getBeamData(template?.horizontal_bar),
					vertical_bar: getBeamData(template?.vertical_bar),
					skids: getBeamData(template?.skids),
				};
			});
		},
		enabled: !!user && !!order,
	});

	// Fetch package services for all packages in this order
	const { data: packageServices } = useQuery({
		queryKey: ["packageServices", orderId],
		queryFn: async () => {
			const { data: packages, error: pkgError } = await supabase
				.from("order_packages")
				.select("id")
				.eq("order_id", orderId);

			if (pkgError) throw pkgError;
			if (!packages || packages.length === 0) return [];

			const packageIds = packages.map((p) => p.id);

			const { data, error } = await supabase
				.from("order_package_services")
				.select(`
          id,
          order_package_id,
          service_id,
          is_final,
          result,
          service:services!order_package_services_service_id_fkey (
            service
          )
        `)
				.in("order_package_id", packageIds);

			if (error) throw error;

			return data.map((item: any) => ({
				...item,
				service_name: Array.isArray(item.service)
					? item.service[0]?.service
					: item.service?.service,
			})) as PackageService[];
		},
		enabled: !!user && !!order,
	});

	// ========== MUTATIONS FOR CRUD OPERATIONS ==========

	// Package Item Mutations
	const addPackageItemMutation = useMutation({
		mutationFn: async (item: {
			order_package_id: string;
			designation: string;
			quantity: number;
			length?: number | null;
			width?: number | null;
			height?: number | null;
		}) => {
			const { data, error } = await supabase
				.from("package_items")
				.insert(item)
				.select()
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["packageItems", orderId] });
		},
	});

	const updatePackageItemMutation = useMutation({
		mutationFn: async ({
			id,
			...updates
		}: {
			id: string;
			designation?: string;
			quantity?: number;
			length?: number | null;
			width?: number | null;
			height?: number | null;
		}) => {
			const { data, error } = await supabase
				.from("package_items")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["packageItems", orderId] });
		},
	});

	const deletePackageItemMutation = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await supabase
				.from("package_items")
				.delete()
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["packageItems", orderId] });
		},
	});

	// Package Info Mutation
	const updatePackageInfoMutation = useMutation({
		mutationFn: async ({
			packageId,
			infoType,
			updates,
		}: {
			packageId: string;
			infoType: "original" | "final";
			updates: Partial<PackageInfo>;
		}) => {
			// Get the current package to check if info exists
			const { data: pkg, error: pkgError } = await supabase
				.from("order_packages")
				.select("original_pkg_info, final_pkg_info")
				.eq("id", packageId)
				.single();

			if (pkgError) throw pkgError;

			const infoId =
				infoType === "original" ? pkg.original_pkg_info : pkg.final_pkg_info;

			if (infoId) {
				// Update existing package_info
				const { data, error } = await supabase
					.from("package_info")
					.update(updates)
					.eq("id", infoId)
					.select()
					.single();
				if (error) throw error;
				return data;
			} else {
				// Create new package_info and link to package
				const { data: newInfo, error: createError } = await supabase
					.from("package_info")
					.insert(updates)
					.select()
					.single();
				if (createError) throw createError;

				// Link to order_package
				const updateField =
					infoType === "original" ? "original_pkg_info" : "final_pkg_info";
				const { error: linkError } = await supabase
					.from("order_packages")
					.update({ [updateField]: newInfo.id })
					.eq("id", packageId);
				if (linkError) throw linkError;

				return newInfo;
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
		},
	});

	// Package Material Mutations
	const addPackageMaterialMutation = useMutation({
		mutationFn: async (material: {
			order_package_id: string;
			material_variant_id: string;
			material_type: string;
			is_final: boolean;
			quantity: number;
			unit_id?: string | null;
			length?: number | null;
			width?: number | null;
			height?: number | null;
			comment?: string | null;
		}) => {
			const { data, error } = await supabase
				.from("order_package_materials")
				.insert(material)
				.select()
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["packageMaterials", orderId],
			});
		},
	});

	const updatePackageMaterialMutation = useMutation({
		mutationFn: async ({
			id,
			...updates
		}: {
			id: string;
			quantity?: number;
			length?: number | null;
			width?: number | null;
			height?: number | null;
			comment?: string | null;
			is_final?: boolean;
		}) => {
			const { data, error } = await supabase
				.from("order_package_materials")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["packageMaterials", orderId],
			});
		},
	});

	const deletePackageMaterialMutation = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await supabase
				.from("order_package_materials")
				.delete()
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["packageMaterials", orderId],
			});
		},
	});

	// Order Status Mutation
	const updateOrderStatusMutation = useMutation({
		mutationFn: async ({
			production_status,
			commercial_status,
		}: {
			production_status?: string;
			commercial_status?: string;
		}) => {
			const updateData: Record<string, string> = {};
			if (production_status !== undefined)
				updateData.production_status = production_status;
			if (commercial_status !== undefined)
				updateData.commercial_status = commercial_status;

			const { error } = await supabase
				.from("orders")
				.update(updateData)
				.eq("id", orderId);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
		},
	});

	// End Task Mutation
	const endTaskMutation = useMutation({
		mutationFn: async ({
			taskLogId,
			endTime,
		}: {
			taskLogId: string;
			endTime: string;
		}) => {
			const startTime = taskLogs?.find((t) => t.id === taskLogId)?.start_time;
			let durationMinutes: number | null = null;

			if (startTime) {
				const start = new Date(startTime);
				const end = new Date(endTime);
				durationMinutes = Math.round(
					(end.getTime() - start.getTime()) / (1000 * 60),
				);
			}

			const { error } = await supabase
				.from("task_logs")
				.update({
					end_time: endTime,
					duration_minutes: durationMinutes,
				})
				.eq("id", taskLogId);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["taskLogs", orderId] });
			setShowEndTaskModal(false);
			setEndingTask(null);
		},
	});

	// Package Status Mutation
	const updatePackageStatusMutation = useMutation({
		mutationFn: async ({
			packageId,
			status,
		}: {
			packageId: string;
			status: string;
		}) => {
			const { error } = await supabase
				.from("order_packages")
				.update({ status })
				.eq("id", packageId);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
		},
	});

	// ========== STATE FOR MODALS AND EDITING ==========

	// Package Item State
	const [showAddItemModal, setShowAddItemModal] = useState(false);
	const [itemForm, setItemForm] = useState({
		designation: "",
		quantity: 1,
		length: "" as string | number,
		width: "" as string | number,
		height: "" as string | number,
	});
	const [itemValidationErrors, setItemValidationErrors] = useState<
		Record<string, string>
	>({});

	// Material State
	const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
	const [materialType, setMaterialType] = useState<string>("Accessories");
	const [materialForm, setMaterialForm] = useState({
		material_variant_id: "",
		quantity: 1,
		unit_id: "",
		length: "" as string | number,
		width: "" as string | number,
		height: "" as string | number,
		comment: "",
		is_final: false,
	});
	const [materialValidationErrors, setMaterialValidationErrors] = useState<
		Record<string, string>
	>({});

	// End Task Modal State
	const [showEndTaskModal, setShowEndTaskModal] = useState(false);
	const [endingTask, setEndingTask] = useState<TaskLog | null>(null);
	const [endTaskTime, setEndTaskTime] = useState("");
	const [selectedTaskDay, setSelectedTaskDay] = useState<string>("all");

	// Available materials for dropdown
	const { data: availableMaterials } = useQuery({
		queryKey: ["materials"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("material_variants")
				.select(`
          id,
          variant_name,
          material:materials!material_variants_material_id_fkey (
            id,
            name
          )
        `)
				.eq("approval_status", "approved")
				.order("variant_name");

			if (error) throw error;
			return data.map((v: any) => ({
				id: v.id,
				variant_name: v.variant_name,
				material_name: Array.isArray(v.material)
					? v.material[0]?.name
					: v.material?.name,
			}));
		},
		enabled: !!user,
	});

	// Available units for dropdown
	const { data: availableUnits } = useQuery({
		queryKey: ["units"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("units_of_measure")
				.select("id, name")
				.order("name");

			if (error) throw error;
			return data;
		},
		enabled: !!user,
	});

	// ========== HANDLER FUNCTIONS ==========

	const handleAddItem = async () => {
		if (!selectedPackageId) return;

		// Validate input
		const validation = validateInput(packageItemSchema, {
			designation: itemForm.designation,
			quantity: itemForm.quantity,
			length: itemForm.length !== "" ? Number(itemForm.length) : null,
			width: itemForm.width !== "" ? Number(itemForm.width) : null,
			height: itemForm.height !== "" ? Number(itemForm.height) : null,
		});

		if (!validation.success) {
			setItemValidationErrors(validation.errors);
			return;
		}

		setItemValidationErrors({});

		await addPackageItemMutation.mutateAsync({
			order_package_id: selectedPackageId,
			...validation.data,
		});

		setShowAddItemModal(false);
		setItemForm({
			designation: "",
			quantity: 1,
			length: "",
			width: "",
			height: "",
		});
	};

	const resetMaterialForm = () => {
		setMaterialForm({
			material_variant_id: "",
			quantity: 1,
			unit_id: "",
			length: "",
			width: "",
			height: "",
			comment: "",
			is_final: false,
		});
		setMaterialValidationErrors({});
	};

	const handleAddMaterial = async () => {
		if (!selectedPackageId) return;

		// Validate input
		const validation = validateInput(packageMaterialSchema, {
			material_variant_id: materialForm.material_variant_id,
			quantity: materialForm.quantity,
			unit_id: materialForm.unit_id || null,
			length: materialForm.length !== "" ? Number(materialForm.length) : null,
			width: materialForm.width !== "" ? Number(materialForm.width) : null,
			height: materialForm.height !== "" ? Number(materialForm.height) : null,
			comment: materialForm.comment || null,
			is_final: materialForm.is_final,
		});

		if (!validation.success) {
			setMaterialValidationErrors(validation.errors);
			return;
		}

		setMaterialValidationErrors({});

		await addPackageMaterialMutation.mutateAsync({
			order_package_id: selectedPackageId,
			material_type: materialType,
			...validation.data,
		});

		setShowAddMaterialModal(false);
		resetMaterialForm();
	};

	// State for attendance cleaner modal
	const [cleanerModalOpen, setCleanerModalOpen] = useState(false);
	const [proposedChanges, setProposedChanges] = useState<AttendanceChange[]>(
		[],
	);
	const [applyingChanges, setApplyingChanges] = useState(false);

	// Calculate proposed attendance changes - handles both morning and afternoon shifts
	const calculateProposedChanges = () => {
		if (!attendanceLogs || !selectedAttendanceDate) return;

		// Filter logs for the selected date - EXCLUDE ABSENT packers
		const presentLogs = attendanceLogs.filter(
			(log) =>
				log.log_date === selectedAttendanceDate && log.status === "present",
		);

		const changes: AttendanceChange[] = [];

		for (const log of presentLogs) {
			let needsChange = false;
			let newEndTime: Date | null = null;

			// Get the date from the start_time (more reliable than log_date for time calculations)
			const startTime = log.start_time ? new Date(log.start_time) : null;
			const startDate = startTime
				? new Date(
						startTime.getFullYear(),
						startTime.getMonth(),
						startTime.getDate(),
					)
				: new Date(selectedAttendanceDate);

			// Calculate current hours
			let currentHours = "—";
			if (log.start_time && log.end_time) {
				const start = new Date(log.start_time);
				const end = new Date(log.end_time);
				const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
				currentHours = `${hours.toFixed(1)}h`;
			}

			if (log.shift_period === "morning") {
				// Morning shift should end at 12:00 PM of the START TIME's date
				const correctEndTime = new Date(startDate);
				correctEndTime.setHours(12, 0, 0, 0);

				if (!log.end_time) {
					// No end time set
					needsChange = true;
					newEndTime = correctEndTime;
				} else {
					const endTime = new Date(log.end_time);
					const endDateOnly = new Date(
						endTime.getFullYear(),
						endTime.getMonth(),
						endTime.getDate(),
					);

					// Check if end time is on a different day
					if (endDateOnly.getTime() !== startDate.getTime()) {
						needsChange = true;
						newEndTime = correctEndTime;
					}
					// Check if end time is already exactly 12:00 PM - skip if same
					else if (endTime.getHours() === 12 && endTime.getMinutes() === 0) {
						// Already correct, no change needed
						needsChange = false;
					}
					// Check if end time is after noon
					else if (
						endTime.getHours() > 12 ||
						(endTime.getHours() === 12 && endTime.getMinutes() > 0)
					) {
						needsChange = true;
						newEndTime = correctEndTime;
					}
				}
			} else if (log.shift_period === "afternoon") {
				// Afternoon shift should end at 11:59 PM of the START TIME's date
				const correctEndTime = new Date(startDate);
				correctEndTime.setHours(23, 59, 0, 0);

				if (!log.end_time) {
					// No end time set
					needsChange = true;
					newEndTime = correctEndTime;
				} else {
					const endTime = new Date(log.end_time);
					const endDateOnly = new Date(
						endTime.getFullYear(),
						endTime.getMonth(),
						endTime.getDate(),
					);

					// Check if end time is on a different day (e.g., 12:00 AM next day causing negative hours)
					if (endDateOnly.getTime() !== startDate.getTime()) {
						needsChange = true;
						newEndTime = correctEndTime;
					}
					// Check if end time is before start time (negative hours)
					else if (startTime && endTime.getTime() < startTime.getTime()) {
						needsChange = true;
						newEndTime = correctEndTime;
					}
					// Check if end time is at midnight (00:00) - common bug
					else if (endTime.getHours() === 0 && endTime.getMinutes() === 0) {
						needsChange = true;
						newEndTime = correctEndTime;
					}
				}
			}
			// full_day shift - could add logic here if needed

			if (needsChange && newEndTime) {
				// Calculate new hours
				let newHours = "—";
				if (log.start_time) {
					const start = new Date(log.start_time);
					const hours =
						(newEndTime.getTime() - start.getTime()) / (1000 * 60 * 60);
					newHours = `${hours.toFixed(1)}h`;
				}

				changes.push({
					id: log.id,
					packerName: log.packer?.full_name || "Unknown",
					shift: log.shift_period,
					currentStart: log.start_time,
					currentEnd: log.end_time,
					currentHours,
					newEnd: newEndTime.toISOString(),
					newHours,
					approved: false,
				});
			}
		}

		// Sort changes: morning first (A-Z), then afternoon (A-Z)
		const shiftOrder: Record<string, number> = {
			morning: 0,
			afternoon: 1,
			full_day: 2,
		};
		changes.sort((a, b) => {
			const shiftDiff =
				(shiftOrder[a.shift] ?? 99) - (shiftOrder[b.shift] ?? 99);
			if (shiftDiff !== 0) return shiftDiff;
			return a.packerName
				.toLowerCase()
				.localeCompare(b.packerName.toLowerCase());
		});

		setProposedChanges(changes);
		setCleanerModalOpen(true);
	};

	// Toggle individual approval
	const toggleApproval = (id: string) => {
		setProposedChanges((prev) =>
			prev.map((change) =>
				change.id === id ? { ...change, approved: !change.approved } : change,
			),
		);
	};

	// Approve all changes
	const approveAll = () => {
		setProposedChanges((prev) =>
			prev.map((change) => ({ ...change, approved: true })),
		);
	};

	// Apply approved changes mutation
	const applyChangesMutation = useMutation({
		mutationFn: async (changesToApply: AttendanceChange[]) => {
			const approvedChanges = changesToApply.filter((c) => c.approved);

			if (approvedChanges.length === 0) {
				throw new Error("No changes selected to apply");
			}

			const updates = approvedChanges.map((change) =>
				supabase
					.from("attendance_logs")
					.update({ end_time: change.newEnd })
					.eq("id", change.id),
			);

			const results = await Promise.all(updates);
			const errors = results.filter((r) => r.error);
			if (errors.length > 0) {
				throw new Error(`Failed to update ${errors.length} record(s)`);
			}

			return { updated: approvedChanges.length };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["attendance", orderId] });
			setCleanerModalOpen(false);
			setProposedChanges([]);
		},
		onError: (error) => {
			console.error("Error applying changes:", error);
		},
	});

	// Apply selected changes
	const applySelectedChanges = async () => {
		setApplyingChanges(true);
		try {
			await applyChangesMutation.mutateAsync(proposedChanges);
		} finally {
			setApplyingChanges(false);
		}
	};

	// State for tabs
	const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<
		string | null
	>(null);
	const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
		null,
	);
	const [selectedPackageTab, setSelectedPackageTab] = useState<
		| "info"
		| "items"
		| "manufacturing"
		| "accessories"
		| "securing"
		| "services"
		| "comments"
	>("info");

	// Get selected package data
	const selectedPackage = useMemo(() => {
		if (!order?.order_packages || !selectedPackageId) return null;
		return (
			order.order_packages.find((pkg) => pkg.id === selectedPackageId) || null
		);
	}, [order?.order_packages, selectedPackageId]);

	// Get items for selected package
	const selectedPackageItems = useMemo(() => {
		if (!packageItems || !selectedPackageId) return [];
		return packageItems.filter(
			(item) => item.order_package_id === selectedPackageId,
		);
	}, [packageItems, selectedPackageId]);

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
			securing: pkgMaterials.filter((m) => m.material_type === "Securing"),
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

	// Set default selected date when attendance loads
	useEffect(() => {
		if (attendanceDates.length > 0 && !selectedAttendanceDate) {
			setSelectedAttendanceDate(attendanceDates[0]);
		}
	}, [attendanceDates, selectedAttendanceDate]);

	// Set default selected package when order loads
	useEffect(() => {
		if (order?.order_packages?.length && !selectedPackageId) {
			const sortedPackages = [...order.order_packages].sort(
				(a, b) => a.package_number - b.package_number,
			);
			setSelectedPackageId(sortedPackages[0].id);
		}
	}, [order, selectedPackageId]);

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

	// Helper function to get smart default end time for a task
	const getSmartEndTime = (task: TaskLog): string => {
		const taskDate = new Date(task.start_time);
		const taskDateStr = taskDate.toISOString().split("T")[0];
		const taskHour = taskDate.getHours();

		// Determine if morning or afternoon based on task start time
		const isMorning = taskHour < 12;

		// Look for attendance logs on that day to get shift end time
		const dayAttendance =
			attendanceLogs?.filter((log) => log.log_date === taskDateStr) || [];

		if (isMorning) {
			// Morning shift - default to 12:00 PM
			return `${taskDateStr}T12:00`;
		} else {
			// Afternoon shift - try to get end time from attendance
			const afternoonLogs = dayAttendance.filter(
				(log) => log.shift_period === "afternoon" && log.end_time,
			);
			if (afternoonLogs.length > 0) {
				// Use the latest end time from afternoon attendance
				const latestEnd = afternoonLogs
					.map((log) => new Date(log.end_time!))
					.sort((a, b) => b.getTime() - a.getTime())[0];
				return latestEnd.toISOString().slice(0, 16);
			}
			// Default to 11:59 PM
			return `${taskDateStr}T23:59`;
		}
	};

	// Open end task modal with smart defaults
	const handleOpenEndTaskModal = (task: TaskLog) => {
		setEndingTask(task);
		setEndTaskTime(getSmartEndTime(task));
		setShowEndTaskModal(true);
	};

	const getStatusColor = (status: string) => {
		switch (status?.toLowerCase()) {
			case "completed":
			case "packed":
			case "delivered":
				return "bg-green-100 text-green-800 border-green-200";
			case "in_progress":
			case "in_production":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "pending":
			case "design":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "on_hold":
				return "bg-orange-100 text-orange-800 border-orange-200";
			case "approved":
				return "bg-purple-100 text-purple-800 border-purple-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getCommercialStatusColor = (status: string) => {
		switch (status?.toLowerCase()) {
			case "paid":
				return "bg-green-100 text-green-700";
			case "invoiced":
				return "bg-blue-100 text-blue-700";
			case "approved":
				return "bg-purple-100 text-purple-700";
			case "quoted":
				return "bg-yellow-100 text-yellow-700";
			case "draft":
				return "bg-gray-100 text-gray-700";
			default:
				return "bg-gray-100 text-gray-700";
		}
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "Not set";
		return new Date(dateString).toLocaleDateString("en-US", {
			weekday: "short",
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const formatDateTime = (dateString: string | null) => {
		if (!dateString) return "Not set";
		return new Date(dateString).toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatTime = (dateString: string | null) => {
		if (!dateString) return "—";
		return new Date(dateString).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getShiftIcon = (shift: string) => {
		switch (shift) {
			case "morning":
				return <Sun className="w-4 h-4 text-yellow-500" />;
			case "afternoon":
				return <Sunset className="w-4 h-4 text-orange-500" />;
			case "full_day":
				return <Moon className="w-4 h-4 text-blue-500" />;
			default:
				return <Clock className="w-4 h-4 text-gray-500" />;
		}
	};

	const getShiftLabel = (shift: string) => {
		switch (shift) {
			case "morning":
				return "Morning";
			case "afternoon":
				return "Afternoon";
			case "full_day":
				return "Full Day";
			default:
				return shift;
		}
	};

	const getDimensions = (pkg: OrderPackage) => {
		const info = pkg.final_pkg_info || pkg.original_pkg_info;
		if (!info) return null;

		// Prefer external dimensions, fall back to internal
		const l = info.external_length || info.internal_length;
		const w = info.external_width || info.internal_width;
		const h = info.external_height || info.internal_height;

		if (l && w && h) {
			return `${l} × ${w} × ${h} cm`;
		}
		return null;
	};

	const getWeight = (pkg: OrderPackage) => {
		const info = pkg.final_pkg_info || pkg.original_pkg_info;
		if (!info) return null;
		return info.gross_weight || info.net_weight;
	};

	// ========== EXCEL EXPORT FUNCTION ==========
	const exportToExcel = async () => {
		if (!order) return;

		// Fetch supplier pricing for cost calculation
		const { data: pricingData } = await supabase
			.from("supplier_pricing")
			.select(`
        material_variant_id, 
        price_per_unit,
        material_variant:material_variants!supplier_pricing_material_variant_id_fkey (
          length,
          width,
          unit:units_of_measure!material_variants_unit_id_fkey (
            name
          )
        )
      `)
			.eq("approval_status", "approved");

		// Create a map of lowest price per variant with unit info
		const priceMap: Record<
			string,
			{ price: number; unit: string; length: number; width: number }
		> = {};

		pricingData?.forEach((p: any) => {
			const variant = Array.isArray(p.material_variant)
				? p.material_variant[0]
				: p.material_variant;
			const unitName = Array.isArray(variant?.unit)
				? variant?.unit[0]?.name
				: variant?.unit?.name;

			const info = {
				price: Number(p.price_per_unit),
				unit: unitName || "",
				length: Number(variant?.length || 0),
				width: Number(variant?.width || 0),
			};

			const current = priceMap[p.material_variant_id];
			if (!current || info.price < current.price) {
				priceMap[p.material_variant_id] = info;
			}
		});

		const getMaterialCost = (mat: PackageMaterial) => {
			const priceInfo = priceMap[mat.material_variant_id];
			if (!priceInfo) return 0;

			let unitPrice = priceInfo.price;
			const matUnit = mat.unit_name || "";
			const priceUnit = priceInfo.unit;

			// Unit conversion logic
			if (matUnit !== priceUnit) {
				// Piece to Linear Meter (assuming price is per Meter, length is cm)
				if (
					matUnit.toLowerCase() === "pce" &&
					priceUnit.toLowerCase() === "ml"
				) {
					const lengthM = (mat.length || 0) / 100;
					if (lengthM > 0) {
						unitPrice = priceInfo.price * lengthM;
					}
				}
				// M2 to Roll (assuming price is per Roll, dimensions are cm)
				else if (
					matUnit.toLowerCase() === "m2" &&
					priceUnit.toLowerCase() === "roll"
				) {
					const rollAreaM2 = (priceInfo.length / 100) * (priceInfo.width / 100);
					if (rollAreaM2 > 0) {
						unitPrice = priceInfo.price / rollAreaM2;
					}
				}
				// Add more conversions as needed
			}

			return (mat.quantity || 0) * unitPrice;
		};

		const workbook = new ExcelJS.Workbook();
		workbook.creator = "IPAC Admin Panel";
		workbook.created = new Date();

		// Styles
		const headerStyle: Partial<ExcelJS.Style> = {
			font: { bold: true, color: { argb: "FFFFFFFF" } },
			fill: {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FF2563EB" },
			},
			alignment: { horizontal: "center", vertical: "middle" },
			border: {
				top: { style: "thin" },
				left: { style: "thin" },
				bottom: { style: "thin" },
				right: { style: "thin" },
			},
		};

		const subHeaderStyle: Partial<ExcelJS.Style> = {
			font: { bold: true },
			fill: {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FFE5E7EB" },
			},
			alignment: { horizontal: "center", vertical: "middle" },
			border: {
				top: { style: "thin" },
				left: { style: "thin" },
				bottom: { style: "thin" },
				right: { style: "thin" },
			},
		};

		// ==========================================
		// 1. MANPOWER SUMMARY SHEET
		// ==========================================
		const manpowerSheet = workbook.addWorksheet("Manpower Summary");

		manpowerSheet.mergeCells("A1:C1");
		const titleCell = manpowerSheet.getCell("A1");
		titleCell.value = `Manpower Summary - ${order.order_name}`;
		titleCell.font = { bold: true, size: 14 };
		titleCell.alignment = { horizontal: "center" };

		// Calculate manpower summary
		const workDays = [
			...new Set(attendanceLogs?.map((log) => log.log_date) || []),
		];
		const uniquePackers = [
			...new Set(
				attendanceLogs?.map((log) => log.packer?.full_name).filter(Boolean) ||
					[],
			),
		];

		let totalManHours = 0;
		const packerHours: Record<string, number> = {};

		attendanceLogs?.forEach((log) => {
			if (log.start_time && log.end_time && log.packer?.full_name) {
				const hours =
					(new Date(log.end_time).getTime() -
						new Date(log.start_time).getTime()) /
					(1000 * 60 * 60);
				totalManHours += hours;
				packerHours[log.packer.full_name] =
					(packerHours[log.packer.full_name] || 0) + hours;
			}
		});

		// Summary section
		manpowerSheet.getCell("A3").value = "OVERVIEW";
		manpowerSheet.getCell("A3").font = { bold: true, size: 12 };

		manpowerSheet.getCell("A4").value = "Total Work Days:";
		manpowerSheet.getCell("B4").value = workDays.length;
		manpowerSheet.getCell("A5").value = "Total Packers:";
		manpowerSheet.getCell("B5").value = uniquePackers.length;
		manpowerSheet.getCell("A6").value = "Total Man-Hours:";
		manpowerSheet.getCell("B6").value = `${totalManHours.toFixed(1)} hrs`;
		manpowerSheet.getCell("B6").font = {
			bold: true,
			color: { argb: "FF16A34A" },
		};

		if (workDays.length > 0) {
			const sortedDays = [...workDays].sort();
			manpowerSheet.getCell("A7").value = "Start Date:";
			manpowerSheet.getCell("B7").value = new Date(
				sortedDays[0],
			).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
			manpowerSheet.getCell("A8").value = "End Date:";
			manpowerSheet.getCell("B8").value = new Date(
				sortedDays[sortedDays.length - 1],
			).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		}

		// Packer summary
		let rowIndex = 10;
		manpowerSheet.getCell(`A${rowIndex}`).value = "PACKER HOURS";
		manpowerSheet.getCell(`A${rowIndex}`).font = { bold: true, size: 12 };
		rowIndex++;

		const packerHeaderRow = manpowerSheet.getRow(rowIndex);
		packerHeaderRow.getCell(1).value = "Packer";
		packerHeaderRow.getCell(2).value = "Total Hours";
		Object.assign(packerHeaderRow.getCell(1), subHeaderStyle);
		Object.assign(packerHeaderRow.getCell(2), subHeaderStyle);
		rowIndex++;

		Object.entries(packerHours)
			.sort((a, b) => b[1] - a[1])
			.forEach(([name, hours]) => {
				const row = manpowerSheet.getRow(rowIndex);
				row.values = [name, `${hours.toFixed(1)} hrs`];
				rowIndex++;
			});

		manpowerSheet.columns = [{ width: 25 }, { width: 20 }, { width: 15 }];

		// ==========================================
		// 2. MANPOWER BREAKDOWN SHEET
		// ==========================================
		const attendanceSheet = workbook.addWorksheet("Manpower Breakdown");

		attendanceSheet.mergeCells("A1:F1");
		const attTitle = attendanceSheet.getCell("A1");
		attTitle.value = `Daily Attendance Log - ${order.order_name}`;
		attTitle.font = { bold: true, size: 14 };
		attTitle.alignment = { horizontal: "center" };

		const dailyHeaders = [
			"Date",
			"Packer",
			"Shift",
			"Start Time",
			"End Time",
			"Hours",
		];
		const dailyHeaderRow = attendanceSheet.getRow(3);
		dailyHeaders.forEach((header, i) => {
			const cell = dailyHeaderRow.getCell(i + 1);
			cell.value = header;
			Object.assign(cell, headerStyle);
		});

		rowIndex = 4;
		const sortedAttendance = [...(attendanceLogs || [])].sort((a, b) => {
			const dateCompare = a.log_date.localeCompare(b.log_date);
			if (dateCompare !== 0) return dateCompare;
			return (a.start_time || "").localeCompare(b.start_time || "");
		});

		sortedAttendance.forEach((log) => {
			const row = attendanceSheet.getRow(rowIndex);
			const hours =
				log.start_time && log.end_time
					? (
							(new Date(log.end_time).getTime() -
								new Date(log.start_time).getTime()) /
							(1000 * 60 * 60)
						).toFixed(1)
					: "—";

			row.values = [
				new Date(log.log_date).toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				}),
				log.packer?.full_name || "Unknown",
				log.shift_period,
				log.start_time
					? new Date(log.start_time).toLocaleTimeString("en-US", {
							hour: "2-digit",
							minute: "2-digit",
						})
					: "—",
				log.end_time
					? new Date(log.end_time).toLocaleTimeString("en-US", {
							hour: "2-digit",
							minute: "2-digit",
						})
					: "—",
				hours,
			];
			rowIndex++;
		});

		attendanceSheet.columns = [
			{ width: 15 },
			{ width: 25 },
			{ width: 15 },
			{ width: 15 },
			{ width: 15 },
			{ width: 12 },
		];

		// ==========================================
		// 3. MATERIALS SUMMARY SHEET
		// ==========================================
		const matSummarySheet = workbook.addWorksheet("Materials Summary");

		matSummarySheet.mergeCells("A1:E1");
		const matSumTitle = matSummarySheet.getCell("A1");
		matSumTitle.value = `Materials Summary - ${order.order_name}`;
		matSumTitle.font = { bold: true, size: 14 };
		matSumTitle.alignment = { horizontal: "center" };

		// Aggregate all materials
		const materialSummary: Record<
			string,
			{ qty: number; unit: string; cost: number }
		> = {};
		packageMaterials?.forEach((mat) => {
			const key = `${mat.material_name || "Unknown"} - ${mat.variant_name || "Default"}`;
			if (!materialSummary[key]) {
				materialSummary[key] = { qty: 0, unit: mat.unit_name || "", cost: 0 };
			}
			materialSummary[key].qty += mat.quantity || 0;

			// Calculate cost
			materialSummary[key].cost += getMaterialCost(mat);
		});

		rowIndex = 3;
		const sumHeaderRow = matSummarySheet.getRow(rowIndex);
		sumHeaderRow.getCell(1).value = "Material";
		sumHeaderRow.getCell(2).value = "Total Quantity";
		sumHeaderRow.getCell(3).value = "Unit";
		sumHeaderRow.getCell(4).value = "Est. Cost (AED)";
		Object.assign(sumHeaderRow.getCell(1), subHeaderStyle);
		Object.assign(sumHeaderRow.getCell(2), subHeaderStyle);
		Object.assign(sumHeaderRow.getCell(3), subHeaderStyle);
		Object.assign(sumHeaderRow.getCell(4), subHeaderStyle);
		rowIndex++;

		let totalMaterialCost = 0;

		Object.entries(materialSummary)
			.sort((a, b) => a[0].localeCompare(b[0]))
			.forEach(([name, data]) => {
				const row = matSummarySheet.getRow(rowIndex);
				row.values = [
					name,
					data.qty,
					data.unit,
					data.cost > 0 ? `AED ${data.cost.toFixed(2)}` : "—",
				];
				totalMaterialCost += data.cost;
				rowIndex++;
			});

		// Total Cost Row
		rowIndex++;
		const totalRow = matSummarySheet.getRow(rowIndex);
		totalRow.getCell(3).value = "TOTAL COST:";
		totalRow.getCell(3).font = { bold: true };
		totalRow.getCell(3).alignment = { horizontal: "right" };
		totalRow.getCell(4).value = `AED ${totalMaterialCost.toFixed(2)}`;
		totalRow.getCell(4).font = { bold: true, color: { argb: "FF16A34A" } };
		totalRow.getCell(4).fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FFE5E7EB" },
		};

		matSummarySheet.columns = [
			{ width: 40 },
			{ width: 15 },
			{ width: 10 },
			{ width: 20 },
		];

		// ==========================================
		// 4. MATERIALS BREAKDOWN SHEET
		// ==========================================
		const matBreakdownSheet = workbook.addWorksheet("Materials Breakdown");

		matBreakdownSheet.mergeCells("A1:H1");
		const matBreakTitle = matBreakdownSheet.getCell("A1");
		matBreakTitle.value = `Materials Breakdown by Package - ${order.order_name}`;
		matBreakTitle.font = { bold: true, size: 14 };
		matBreakTitle.alignment = { horizontal: "center" };

		// Manufacturing types mapping
		const materialTypeLabels: Record<string, string> = {
			"Big Sides": "Big Sides",
			"Small Sides": "Small Sides",
			Lis: "Lid",
			Base: "Base",
			Body: "Body",
			Accessories: "Accessories",
			"Vacuum Packing": "Vacuum Packing",
			"Gas Packing": "Gas Packing",
			Securing: "Securing",
		};

		// Group materials by package
		const materialsByPackage: Record<string, PackageMaterial[]> = {};
		packageMaterials?.forEach((mat) => {
			if (!materialsByPackage[mat.order_package_id]) {
				materialsByPackage[mat.order_package_id] = [];
			}
			materialsByPackage[mat.order_package_id].push(mat);
		});

		rowIndex = 3;
		const packages = [...(order.order_packages || [])].sort(
			(a, b) => a.package_number - b.package_number,
		);

		packages.forEach((pkg) => {
			const pkgMaterials = materialsByPackage[pkg.id] || [];

			// Package header
			matBreakdownSheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
			const pkgHeaderCell = matBreakdownSheet.getCell(`A${rowIndex}`);
			pkgHeaderCell.value = `Box #${pkg.package_number}${pkg.description ? ` - ${pkg.description}` : ""}`;
			pkgHeaderCell.font = {
				bold: true,
				size: 12,
				color: { argb: "FFFFFFFF" },
			};
			pkgHeaderCell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FF1F2937" },
			};
			rowIndex++;

			// Materials headers
			const matHeaders = [
				"Category",
				"Material",
				"Variant",
				"Qty",
				"Dimensions",
				"Unit",
				"Est. Cost (AED)",
				"Comment",
			];
			const matHeaderRow = matBreakdownSheet.getRow(rowIndex);
			matHeaders.forEach((header, i) => {
				const cell = matHeaderRow.getCell(i + 1);
				cell.value = header;
				Object.assign(cell, headerStyle);
			});
			rowIndex++;

			// Group materials by type
			const materialsByType: Record<string, PackageMaterial[]> = {};
			pkgMaterials.forEach((mat) => {
				const type = materialTypeLabels[mat.material_type] || mat.material_type;
				if (!materialsByType[type]) {
					materialsByType[type] = [];
				}
				materialsByType[type].push(mat);
			});

			// Helper to add rows
			const addMaterialRows = (types: string[]) => {
				types.forEach((type) => {
					const label = materialTypeLabels[type] || type;
					const mats = materialsByType[label];
					if (mats && mats.length > 0) {
						mats.forEach((mat, idx) => {
							const row = matBreakdownSheet.getRow(rowIndex);
							const dims =
								mat.length && mat.width && mat.height
									? `${mat.length} × ${mat.width} × ${mat.height}`
									: mat.length && mat.width
										? `${mat.length} × ${mat.width}`
										: "—";

							const cost = getMaterialCost(mat);

							row.values = [
								idx === 0 ? label : "",
								mat.material_name || "—",
								mat.variant_name || "—",
								mat.quantity || 0,
								dims,
								mat.unit_name || "—",
								cost > 0 ? `AED ${cost.toFixed(2)}` : "—",
								mat.comment || "",
							];
							if (idx === 0) {
								row.getCell(1).font = { bold: true };
							}
							rowIndex++;
						});
					}
				});
			};

			// Manufacturing materials
			addMaterialRows(["Body", "Big Sides", "Small Sides", "Lid", "Base"]);

			// Others
			addMaterialRows([
				"Accessories",
				"Vacuum Packing",
				"Gas Packing",
				"Securing",
			]);

			if (pkgMaterials.length === 0) {
				const row = matBreakdownSheet.getRow(rowIndex);
				row.getCell(1).value = "No materials assigned";
				row.getCell(1).font = { italic: true, color: { argb: "FF6B7280" } };
				rowIndex++;
			}

			rowIndex++; // Add spacing between packages
		});

		matBreakdownSheet.columns = [
			{ width: 18 },
			{ width: 25 },
			{ width: 20 },
			{ width: 10 },
			{ width: 20 },
			{ width: 10 },
			{ width: 20 },
			{ width: 30 },
		];

		// Generate and download the file
		const buffer = await workbook.xlsx.writeBuffer();
		const blob = new Blob([buffer], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${order.order_name.replace(/[^a-zA-Z0-9]/g, "_")}_Report.xlsx`;
		document.body.appendChild(a);
		a.click();
		window.URL.revokeObjectURL(url);
		document.body.removeChild(a);
	};

	if (authLoading || orderLoading) {
		return (
			<div className="flex h-screen bg-gray-50">
				<Sidebar />
				<main className="flex-1 overflow-y-auto">
					<div className="p-6">
						<div className="flex items-center gap-4 mb-6">
							<Link to="/orders" className="p-2 hover:bg-gray-100 rounded-lg">
								<ArrowLeft className="w-4 h-4" />
							</Link>
							<div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
						</div>
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							<div className="lg:col-span-2 space-y-6">
								<div className="h-48 bg-gray-200 animate-pulse rounded-lg"></div>
								<div className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
							</div>
							<div className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
						</div>
					</div>
				</main>
			</div>
		);
	}

	if (error || !order) {
		return (
			<div className="flex h-screen bg-gray-50">
				<Sidebar />
				<main className="flex-1 overflow-y-auto">
					<div className="p-6">
						<div className="flex items-center gap-4 mb-6">
							<Link to="/orders" className="p-2 hover:bg-gray-100 rounded-lg">
								<ArrowLeft className="w-5 h-5" />
							</Link>
							<h1 className="text-2xl font-bold text-gray-900">
								Order Not Found
							</h1>
						</div>
						<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
							<XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
							<p className="text-red-700 mb-2">
								The order you're looking for doesn't exist or has been removed.
							</p>
							<p className="text-red-600 text-sm mb-4">
								{error instanceof Error ? error.message : "Unknown error"}
							</p>
							<Link
								to="/orders"
								className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
							>
								Back to Orders
							</Link>
						</div>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-gray-50">
			<Sidebar />
			<Suspense
				fallback={
					<main className="flex-1 overflow-y-auto">
						<div className="p-6">
							<div className="flex items-center gap-4 mb-6">
								<Link to="/orders" className="p-2 hover:bg-gray-100 rounded-lg">
									<ArrowLeft className="w-4 h-4" />
								</Link>
								<div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
							</div>
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								<div className="lg:col-span-2 space-y-6">
									<div className="h-48 bg-gray-200 animate-pulse rounded-lg"></div>
									<div className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
								</div>
								<div className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
							</div>
						</div>
					</main>
				}
			>
				<main className="flex-1 overflow-y-auto">
					<div className="p-6 animate-fade-in">
						{/* Header */}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
							<div className="flex items-center gap-4">
								<Link
									to="/orders"
									className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
								>
									<ArrowLeft className="w-5 h-5" />
								</Link>
								<div>
									<h1 className="text-2xl font-bold text-gray-900">
										{order.order_name}
									</h1>
									<p className="text-gray-500 text-sm">
										Created {formatDateTime(order.created_at)}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
									<Printer className="w-4 h-4" />
									Print
								</button>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger asChild>
										<button className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
											<Download className="w-4 h-4" />
											Export
											<ChevronDown className="w-4 h-4" />
										</button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Portal>
										<DropdownMenu.Content
											className="min-w-40 bg-white rounded-lg shadow-lg border p-1 z-50"
											sideOffset={5}
										>
											<DropdownMenu.Item
												onClick={exportToExcel}
												className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-green-50 hover:text-green-700 cursor-pointer outline-none"
											>
												<FileSpreadsheet className="w-4 h-4" />
												Export to Excel
											</DropdownMenu.Item>
										</DropdownMenu.Content>
									</DropdownMenu.Portal>
								</DropdownMenu.Root>
								<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
									<Edit className="w-4 h-4" />
									Edit Order
								</button>
							</div>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Main Content */}
							<div className="lg:col-span-2 space-y-6">
								{/* Order Status Card */}
								<div className="bg-white rounded-lg border shadow-sm p-6">
									<div className="flex items-center justify-between mb-4">
										<h2 className="text-lg font-semibold text-gray-900">
											Order Status
										</h2>
										<div className="flex items-center gap-3">
											<div className="flex items-center gap-2">
												<label
													htmlFor="order-production-status"
													className="text-xs text-gray-500"
												>
													Production:
												</label>
												<select
													id="order-production-status"
													value={order.production_status || "pending"}
													onChange={(e) =>
														updateOrderStatusMutation.mutate({
															production_status: e.target.value,
														})
													}
													disabled={updateOrderStatusMutation.isPending}
													className={`px-2 py-1 rounded text-xs font-medium cursor-pointer border ${getStatusColor(order.production_status)} ${updateOrderStatusMutation.isPending ? "opacity-50" : ""}`}
												>
													<option value="pending">Pending</option>
													<option value="in_progress">In Progress</option>
													<option value="on_hold">On Hold</option>
													<option value="completed">Completed</option>
													<option value="cancelled">Cancelled</option>
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label
													htmlFor="order-commercial-status"
													className="text-xs text-gray-500"
												>
													Commercial:
												</label>
												<select
													id="order-commercial-status"
													value={order.commercial_status || "draft"}
													onChange={(e) =>
														updateOrderStatusMutation.mutate({
															commercial_status: e.target.value,
														})
													}
													disabled={updateOrderStatusMutation.isPending}
													className={`px-2 py-1 rounded text-xs font-medium cursor-pointer border ${getCommercialStatusColor(order.commercial_status)} ${updateOrderStatusMutation.isPending ? "opacity-50" : ""}`}
												>
													<option value="draft">Draft</option>
													<option value="approved">Approved</option>
													<option value="invoiced">Invoiced</option>
													<option value="paid">Paid</option>
													<option value="cancelled">Cancelled</option>
												</select>
											</div>
										</div>
									</div>
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
										<div className="text-center p-3 bg-gray-50 rounded-lg">
											<p className="text-2xl font-bold text-blue-600">
												{order.order_packages?.length || 0}
											</p>
											<p className="text-sm text-gray-500">Packages</p>
										</div>
										<div className="text-center p-3 bg-gray-50 rounded-lg">
											<p className="text-2xl font-bold text-green-600">
												{order.order_packages?.filter(
													(p) =>
														p.status === "packed" || p.status === "delivered",
												).length || 0}
											</p>
											<p className="text-sm text-gray-500">Completed</p>
										</div>
										<div className="text-center p-3 bg-gray-50 rounded-lg">
											<p className="text-2xl font-bold text-blue-600">
												{order.order_packages?.filter(
													(p) => p.status === "in_production",
												).length || 0}
											</p>
											<p className="text-sm text-gray-500">In Production</p>
										</div>
										<div className="text-center p-3 bg-gray-50 rounded-lg">
											<p className="text-2xl font-bold text-amber-600">
												{order.order_packages?.filter(
													(p) =>
														!p.status ||
														p.status === "design" ||
														p.status === "approved",
												).length || 0}
											</p>
											<p className="text-sm text-gray-500">Pending</p>
										</div>
									</div>
								</div>

								{/* Packages Table */}
								<div className="bg-white rounded-lg border shadow-sm overflow-hidden">
									<div className="px-6 py-4 border-b">
										<h2 className="text-lg font-semibold text-gray-900">
											Packages
										</h2>
									</div>
									{order.order_packages && order.order_packages.length > 0 ? (
										<div className="overflow-x-auto">
											<table className="excel-table">
												<thead>
													<tr>
														<th>#</th>
														<th>Description</th>
														<th>Dimensions (L×W×H)</th>
														<th>Weight</th>
														<th>Status</th>
													</tr>
												</thead>
												<tbody>
													{order.order_packages
														.sort((a, b) => a.package_number - b.package_number)
														.map((pkg) => (
															<tr key={pkg.id}>
																<td className="font-medium">
																	{pkg.package_number}
																</td>
																<td className="text-gray-600 max-w-xs truncate">
																	{pkg.description || "—"}
																</td>
																<td>{getDimensions(pkg) || "—"}</td>
																<td>
																	{getWeight(pkg)
																		? `${getWeight(pkg)} kg`
																		: "—"}
																</td>
																<td>
																	<select
																		value={pkg.status || "pending"}
																		onChange={(e) =>
																			updatePackageStatusMutation.mutate({
																				packageId: pkg.id,
																				status: e.target.value,
																			})
																		}
																		disabled={
																			updatePackageStatusMutation.isPending
																		}
																		className={`px-2 py-1 text-xs font-medium rounded border cursor-pointer capitalize ${getStatusColor(pkg.status || "pending")} ${updatePackageStatusMutation.isPending ? "opacity-50" : ""}`}
																	>
																		<option value="pending">Pending</option>
																		<option value="design">Design</option>
																		<option value="approved">Approved</option>
																		<option value="in_production">
																			In Production
																		</option>
																		<option value="packed">Packed</option>
																		<option value="delivered">Delivered</option>
																		<option value="on_hold">On Hold</option>
																		<option value="cancelled">Cancelled</option>
																	</select>
																</td>
															</tr>
														))}
												</tbody>
											</table>
										</div>
									) : (
										<div className="p-6 text-center text-gray-500">
											<Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
											<p>No packages added yet</p>
										</div>
									)}
								</div>

								{/* Team Members */}
								<div className="bg-white rounded-lg border shadow-sm overflow-hidden">
									<div className="px-6 py-4 border-b flex items-center gap-2">
										<Users className="w-5 h-5 text-gray-500" />
										<h2 className="text-lg font-semibold text-gray-900">
											Team Members
										</h2>
										<span className="ml-auto text-sm text-gray-500">
											{teamMembers?.length || 0} packers
										</span>
									</div>
									{teamMembers && teamMembers.length > 0 ? (
										<div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
											{teamMembers
												.sort(
													(a, b) =>
														(b.is_team_lead ? 1 : 0) - (a.is_team_lead ? 1 : 0),
												)
												.map((member) => (
													<div
														key={member.id}
														className={`flex items-center gap-3 p-3 rounded-lg border ${
															member.is_team_lead
																? "bg-blue-50 border-blue-200"
																: "bg-gray-50 border-gray-200"
														}`}
													>
														<div
															className={`w-10 h-10 rounded-full flex items-center justify-center ${
																member.is_team_lead
																	? "bg-blue-500"
																	: "bg-gray-400"
															}`}
														>
															<User className="w-5 h-5 text-white" />
														</div>
														<div className="min-w-0 flex-1">
															<p className="font-medium text-gray-900 truncate">
																{member.packer?.full_name || "Unknown"}
															</p>
															{member.is_team_lead && (
																<span className="text-xs text-blue-600 font-medium">
																	Team Lead
																</span>
															)}
														</div>
													</div>
												))}
										</div>
									) : (
										<div className="p-6 text-center text-gray-500">
											<Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
											<p>No team members assigned</p>
										</div>
									)}
								</div>

								{/* Attendance Logs with Day Tabs */}
								<div className="bg-white rounded-lg border shadow-sm overflow-hidden">
									<div className="px-6 py-4 border-b flex items-center gap-2">
										<ClipboardList className="w-5 h-5 text-gray-600" />
										<h2 className="text-lg font-semibold text-gray-900">
											Attendance & Work Sessions
										</h2>
										<div className="ml-auto flex items-center gap-3">
											<span className="text-sm text-gray-600">
												{attendanceDates.length} days •{" "}
												{attendanceLogs?.length || 0} records
											</span>
											{selectedAttendanceDate && (
												<button
													onClick={calculateProposedChanges}
													className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
													title="Fix morning shift end times (set missing/invalid end times to 12:00 PM)"
												>
													<Sparkles className="w-4 h-4" />
													Clean Attendance
												</button>
											)}
										</div>
									</div>

									{attendanceDates.length > 0 ? (
										<>
											{/* Day Tabs */}
											<div className="border-b bg-gray-50 px-4 py-2 overflow-x-auto">
												<div className="flex gap-1 min-w-max">
													{attendanceDates.map((date) => {
														const dayLogs =
															attendanceLogs?.filter(
																(l) => l.log_date === date,
															) || [];
														const hasProjectStart = dayLogs.some(
															(l) => l.is_project_start,
														);
														return (
															<button
																key={date}
																onClick={() => setSelectedAttendanceDate(date)}
																className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
																	selectedAttendanceDate === date
																		? "bg-blue-600 text-white"
																		: "bg-white text-gray-700 hover:bg-gray-100 border"
																}`}
															>
																{new Date(date).toLocaleDateString("en-US", {
																	weekday: "short",
																	month: "short",
																	day: "numeric",
																})}
																{hasProjectStart && (
																	<span
																		className={`ml-1.5 text-xs px-1 py-0.5 rounded ${
																			selectedAttendanceDate === date
																				? "bg-white/20"
																				: "bg-purple-100 text-purple-700"
																		}`}
																	>
																		Start
																	</span>
																)}
																<span
																	className={`ml-1.5 text-xs ${selectedAttendanceDate === date ? "text-blue-200" : "text-gray-400"}`}
																>
																	({dayLogs.length})
																</span>
															</button>
														);
													})}
												</div>
											</div>

											{/* Attendance Table for Selected Day */}
											<div className="overflow-x-auto max-h-96 overflow-y-auto">
												<table className="excel-table">
													<thead className="sticky top-0 bg-gray-50 z-10">
														<tr>
															<th>Packer</th>
															<th>Shift</th>
															<th>Start</th>
															<th>End</th>
															<th>Hours</th>
															<th>Status</th>
															<th>Toolbox</th>
														</tr>
													</thead>
													<tbody>
														{filteredAttendance.map((log) => {
															const hours =
																log.start_time && log.end_time
																	? (
																			(new Date(log.end_time).getTime() -
																				new Date(log.start_time).getTime()) /
																			(1000 * 60 * 60)
																		).toFixed(1)
																	: null;
															return (
																<tr key={log.id}>
																	<td className="font-medium text-gray-900">
																		{log.packer?.full_name || "Unknown"}
																	</td>
																	<td>
																		<div className="flex items-center gap-1.5">
																			{getShiftIcon(log.shift_period)}
																			<span className="text-gray-700">
																				{getShiftLabel(log.shift_period)}
																			</span>
																		</div>
																	</td>
																	<td className="text-gray-700">
																		{formatTime(log.start_time)}
																	</td>
																	<td className="text-gray-700">
																		{formatTime(log.end_time)}
																	</td>
																	<td className="text-gray-700">
																		{hours ? `${hours}h` : "—"}
																	</td>
																	<td>
																		<span
																			className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
																				log.status === "present"
																					? "bg-green-100 text-green-700"
																					: "bg-red-100 text-red-700"
																			}`}
																		>
																			{log.status === "present" ? (
																				<UserCheck className="w-3 h-3 mr-1" />
																			) : (
																				<XCircle className="w-3 h-3 mr-1" />
																			)}
																			{log.status}
																		</span>
																	</td>
																	<td>
																		{log.toolbox_briefing_completed ? (
																			<CheckCircle2 className="w-5 h-5 text-green-500" />
																		) : (
																			<span className="text-gray-400">—</span>
																		)}
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</div>
										</>
									) : (
										<div className="p-6 text-center text-gray-500">
											<ClipboardList className="w-12 h-12 mx-auto mb-2 text-gray-300" />
											<p>No attendance records yet</p>
										</div>
									)}
								</div>

								{/* Tasks by Package */}
								<div className="bg-white rounded-lg border shadow-sm overflow-hidden">
									<div className="px-6 py-4 border-b flex items-center gap-2">
										<Wrench className="w-5 h-5 text-gray-600" />
										<h2 className="text-lg font-semibold text-gray-900">
											Tasks by Package
										</h2>
										<span className="ml-auto text-sm text-gray-600">
											{taskLogs?.length || 0} task sessions
										</span>
									</div>

									{order.order_packages && order.order_packages.length > 0 ? (
										<>
											{/* Package Tabs */}
											<div className="border-b bg-gray-50 px-4 py-2 overflow-x-auto">
												<div className="flex gap-1 min-w-max">
													{[...order.order_packages]
														.sort((a, b) => a.package_number - b.package_number)
														.map((pkg) => {
															const pkgTasks =
																taskLogs?.filter((log) =>
																	log.task_packages.some(
																		(tp) => tp.order_package_id === pkg.id,
																	),
																) || [];
															return (
																<button
																	key={pkg.id}
																	onClick={() => {
																		setSelectedPackageId(pkg.id);
																		setSelectedTaskDay("all");
																	}}
																	className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
																		selectedPackageId === pkg.id
																			? "bg-blue-600 text-white"
																			: "bg-white text-gray-700 hover:bg-gray-100 border"
																	}`}
																>
																	<Package className="w-4 h-4 inline mr-1" />
																	Box #{pkg.package_number}
																	<span
																		className={`ml-1.5 text-xs ${selectedPackageId === pkg.id ? "text-blue-200" : "text-gray-400"}`}
																	>
																		({pkgTasks.length})
																	</span>
																</button>
															);
														})}
												</div>
											</div>

											{/* Day Filter Tabs */}
											{taskDays.length > 0 && (
												<div className="border-b bg-white px-4 py-2 overflow-x-auto">
													<div className="flex gap-1 min-w-max">
														<button
															onClick={() => setSelectedTaskDay("all")}
															className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
																selectedTaskDay === "all"
																	? "bg-gray-800 text-white"
																	: "bg-gray-100 text-gray-600 hover:bg-gray-200"
															}`}
														>
															All Days (
															{taskLogs?.filter((log) =>
																log.task_packages.some(
																	(tp) =>
																		tp.order_package_id === selectedPackageId,
																),
															).length || 0}
															)
														</button>
														{taskDays.map((day) => {
															const dayTasks =
																taskLogs?.filter(
																	(log) =>
																		log.task_packages.some(
																			(tp) =>
																				tp.order_package_id ===
																				selectedPackageId,
																		) &&
																		new Date(log.start_time)
																			.toISOString()
																			.split("T")[0] === day,
																) || [];
															return (
																<button
																	key={day}
																	onClick={() => setSelectedTaskDay(day)}
																	className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
																		selectedTaskDay === day
																			? "bg-gray-800 text-white"
																			: "bg-gray-100 text-gray-600 hover:bg-gray-200"
																	}`}
																>
																	{new Date(day).toLocaleDateString("en-US", {
																		month: "short",
																		day: "numeric",
																	})}
																	<span className="ml-1 opacity-70">
																		({dayTasks.length})
																	</span>
																</button>
															);
														})}
													</div>
												</div>
											)}

											{/* Tasks Table for Selected Package */}
											{tasksForPackage.length > 0 ? (
												<div className="overflow-x-auto max-h-96 overflow-y-auto">
													<table className="excel-table">
														<thead className="sticky top-0 bg-white z-10">
															<tr>
																<th>Task</th>
																<th>Packer(s)</th>
																<th>Started</th>
																<th>Ended</th>
																<th>Duration</th>
																<th>Total Hrs</th>
																<th>Notes</th>
																<th>Actions</th>
															</tr>
														</thead>
														<tbody>
															{tasksForPackage.map((log) => {
																const packerCount =
																	log.task_assignments.filter(
																		(a) => a.packer?.full_name,
																	).length || 1;
																const totalMinutes = log.duration_minutes
																	? log.duration_minutes * packerCount
																	: null;
																return (
																	<tr key={log.id}>
																		<td className="font-medium text-gray-900">
																			<div className="flex items-center gap-2">
																				<Play className="w-4 h-4 text-blue-500" />
																				{log.task?.name || "Unknown Task"}
																			</div>
																		</td>
																		<td className="text-gray-700 max-w-[200px]">
																			<span className="line-clamp-2">
																				{log.task_assignments
																					.map((a) => a.packer?.full_name)
																					.filter(Boolean)
																					.join(", ") || "—"}
																			</span>
																		</td>
																		<td className="text-gray-700 whitespace-nowrap">
																			{new Date(log.start_time).toLocaleString(
																				"en-US",
																				{
																					month: "short",
																					day: "numeric",
																					hour: "2-digit",
																					minute: "2-digit",
																				},
																			)}
																		</td>
																		<td className="text-gray-700 whitespace-nowrap">
																			{log.end_time ? (
																				new Date(log.end_time).toLocaleString(
																					"en-US",
																					{
																						month: "short",
																						day: "numeric",
																						hour: "2-digit",
																						minute: "2-digit",
																					},
																				)
																			) : (
																				<span className="text-blue-600 flex items-center gap-1">
																					<Timer className="w-3 h-3" /> In
																					Progress
																				</span>
																			)}
																		</td>
																		<td className="text-gray-700">
																			{log.duration_minutes
																				? `${Math.floor(log.duration_minutes / 60)}h ${Math.round(log.duration_minutes % 60)}m`
																				: "—"}
																		</td>
																		<td className="text-gray-900 font-medium">
																			{totalMinutes
																				? `${Math.floor(totalMinutes / 60)}h ${Math.round(totalMinutes % 60)}m`
																				: "—"}
																			{packerCount > 1 && totalMinutes && (
																				<span className="text-xs text-gray-400 ml-1">
																					({packerCount}×)
																				</span>
																			)}
																		</td>
																		<td className="text-gray-600 max-w-[150px]">
																			<span className="line-clamp-1">
																				{log.notes || "—"}
																			</span>
																		</td>
																		<td>
																			{!log.end_time && (
																				<button
																					onClick={() =>
																						handleOpenEndTaskModal(log)
																					}
																					className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
																					title="End Task"
																				>
																					<StopCircle className="w-3 h-3" />
																					End
																				</button>
																			)}
																			{log.end_time && (
																				<span className="text-gray-400 text-xs">
																					Completed
																				</span>
																			)}
																		</td>
																	</tr>
																);
															})}
														</tbody>
													</table>
												</div>
											) : (
												<div className="p-6 text-center text-gray-500">
													<Wrench className="w-12 h-12 mx-auto mb-2 text-gray-300" />
													<p>
														No tasks recorded for this{" "}
														{selectedTaskDay !== "all" ? "day" : "package"}
													</p>
												</div>
											)}
										</>
									) : (
										<div className="p-6 text-center text-gray-500">
											<Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
											<p>No packages in this order</p>
										</div>
									)}
								</div>

								{/* Package Details Section */}
								<div className="bg-white rounded-lg border shadow-sm overflow-hidden">
									<div className="px-6 py-4 border-b flex items-center gap-2">
										<Package className="w-5 h-5 text-gray-600" />
										<h2 className="text-lg font-semibold text-gray-900">
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
																		? "bg-blue-600 text-white"
																		: "text-gray-600 hover:bg-gray-100"
																}`}
															>
																Box #{pkg.package_number}
																<span
																	className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
																		selectedPackageId === pkg.id
																			? "bg-blue-500 text-white"
																			: "bg-gray-200 text-gray-600"
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
													<div className="border-b bg-gray-50">
														<div className="flex p-2 gap-1 overflow-x-auto">
															{[
																{ key: "info", label: "Info" },
																{
																	key: "items",
																	label: "Items",
																	count: selectedPackageItems.length,
																},
																{
																	key: "manufacturing",
																	label: "Manufacturing",
																	count: selectedPackageManufacturing.length,
																},
																{
																	key: "accessories",
																	label: "Accessories",
																	count:
																		selectedPackageMaterials.accessories.length,
																},
																{
																	key: "securing",
																	label: "Securing",
																	count:
																		selectedPackageMaterials.securing.length,
																},
																{
																	key: "services",
																	label: "Services",
																	count: selectedPackageServices.length,
																},
																{
																	key: "comments",
																	label: "Comments",
																	count: (selectedPackage.comments || [])
																		.length,
																},
															].map((tab) => (
																<button
																	key={tab.key}
																	onClick={() =>
																		setSelectedPackageTab(tab.key as any)
																	}
																	className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
																		selectedPackageTab === tab.key
																			? "bg-white text-gray-900 shadow-sm"
																			: "text-gray-600 hover:text-gray-900"
																	}`}
																>
																	{tab.label}
																	{tab.count !== undefined && (
																		<span
																			className={`ml-1 text-xs ${
																				selectedPackageTab === tab.key
																					? "text-gray-500"
																					: "text-gray-400"
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
																updatePackageInfoMutation={
																	updatePackageInfoMutation
																}
															/>
														)}

														{/* Items Tab */}
														{selectedPackageTab === "items" && (
															<PackageItemsTab
																selectedPackageItems={selectedPackageItems}
																updatePackageItemMutation={
																	updatePackageItemMutation
																}
																deletePackageItemMutation={
																	deletePackageItemMutation
																}
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
																selectedPackageMaterials={
																	selectedPackageMaterials
																}
																updatePackageMaterialMutation={
																	updatePackageMaterialMutation
																}
																deletePackageMaterialMutation={
																	deletePackageMaterialMutation
																}
																setMaterialType={setMaterialType}
																resetMaterialForm={resetMaterialForm}
																setShowAddMaterialModal={
																	setShowAddMaterialModal
																}
															/>
														)}

														{/* Securing Tab */}
														{selectedPackageTab === "securing" && (
															<SecuringTab
																selectedPackageMaterials={
																	selectedPackageMaterials
																}
																updatePackageMaterialMutation={
																	updatePackageMaterialMutation
																}
																deletePackageMaterialMutation={
																	deletePackageMaterialMutation
																}
																setMaterialType={setMaterialType}
																resetMaterialForm={resetMaterialForm}
																setShowAddMaterialModal={
																	setShowAddMaterialModal
																}
															/>
														)}

														{/* Services Tab */}
														{selectedPackageTab === "services" && (
															<ServicesTab
																selectedPackageMaterials={
																	selectedPackageMaterials
																}
																selectedPackageServices={
																	selectedPackageServices
																}
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
										<div className="p-6 text-center text-gray-500">
											<Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
											<p>No packages in this order</p>
										</div>
									)}
								</div>

								{/* Media Gallery - Packer Images */}
								<MediaGallery
									mediaItems={mediaItems}
									orderPackages={order.order_packages}
								/>

								{/* Add Item Modal */}
								<Dialog.Root
									open={showAddItemModal}
									onOpenChange={setShowAddItemModal}
								>
									<Dialog.Portal>
										<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
										<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
											<Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
												Add Package Item
											</Dialog.Title>
											<Dialog.Description className="sr-only">
												Add a new item to this package
											</Dialog.Description>

											<div className="space-y-4">
												<div>
													<label
														htmlFor="add-item-designation"
														className="block text-sm font-medium text-gray-700 mb-1"
													>
														Item Name / Designation
													</label>
													<input
														id="add-item-designation"
														type="text"
														value={itemForm.designation}
														onChange={(e) => {
															setItemForm((f) => ({
																...f,
																designation: e.target.value,
															}));
															setItemValidationErrors((prev) => ({
																...prev,
																designation: "",
															}));
														}}
														className={`w-full px-3 py-2 border rounded-lg ${
															itemValidationErrors.designation
																? "border-red-500 focus:ring-red-500"
																: ""
														}`}
														placeholder="Enter item name"
													/>
													{itemValidationErrors.designation && (
														<p className="mt-1 text-sm text-red-600">
															{itemValidationErrors.designation}
														</p>
													)}
												</div>
												<div>
													<label
														htmlFor="add-item-quantity"
														className="block text-sm font-medium text-gray-700 mb-1"
													>
														Quantity
													</label>
													<input
														id="add-item-quantity"
														type="number"
														value={itemForm.quantity}
														onChange={(e) => {
															setItemForm((f) => ({
																...f,
																quantity: Number(e.target.value),
															}));
															setItemValidationErrors((prev) => ({
																...prev,
																quantity: "",
															}));
														}}
														className={`w-full px-3 py-2 border rounded-lg ${
															itemValidationErrors.quantity
																? "border-red-500 focus:ring-red-500"
																: ""
														}`}
														min={1}
													/>
													{itemValidationErrors.quantity && (
														<p className="mt-1 text-sm text-red-600">
															{itemValidationErrors.quantity}
														</p>
													)}
												</div>
												<div>
													<p className="block text-sm font-medium text-gray-700 mb-1">
														Dimensions (L × W × H) - Optional
													</p>
													<div className="grid grid-cols-3 gap-2">
														<div>
															<input
																type="number"
																placeholder="Length"
																value={itemForm.length}
																onChange={(e) => {
																	setItemForm((f) => ({
																		...f,
																		length: e.target.value,
																	}));
																	setItemValidationErrors((prev) => ({
																		...prev,
																		length: "",
																	}));
																}}
																className={`px-3 py-2 border rounded-lg w-full ${
																	itemValidationErrors.length
																		? "border-red-500"
																		: ""
																}`}
															/>
															{itemValidationErrors.length && (
																<p className="mt-0.5 text-xs text-red-600">
																	{itemValidationErrors.length}
																</p>
															)}
														</div>
														<div>
															<input
																type="number"
																placeholder="Width"
																value={itemForm.width}
																onChange={(e) => {
																	setItemForm((f) => ({
																		...f,
																		width: e.target.value,
																	}));
																	setItemValidationErrors((prev) => ({
																		...prev,
																		width: "",
																	}));
																}}
																className={`px-3 py-2 border rounded-lg w-full ${
																	itemValidationErrors.width
																		? "border-red-500"
																		: ""
																}`}
															/>
															{itemValidationErrors.width && (
																<p className="mt-0.5 text-xs text-red-600">
																	{itemValidationErrors.width}
																</p>
															)}
														</div>
														<div>
															<input
																type="number"
																placeholder="Height"
																value={itemForm.height}
																onChange={(e) => {
																	setItemForm((f) => ({
																		...f,
																		height: e.target.value,
																	}));
																	setItemValidationErrors((prev) => ({
																		...prev,
																		height: "",
																	}));
																}}
																className={`px-3 py-2 border rounded-lg w-full ${
																	itemValidationErrors.height
																		? "border-red-500"
																		: ""
																}`}
															/>
															{itemValidationErrors.height && (
																<p className="mt-0.5 text-xs text-red-600">
																	{itemValidationErrors.height}
																</p>
															)}
														</div>
													</div>
												</div>
											</div>

											<div className="flex justify-end gap-2 mt-6">
												<Dialog.Close asChild>
													<button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
														Cancel
													</button>
												</Dialog.Close>
												<button
													onClick={handleAddItem}
													disabled={addPackageItemMutation.isPending}
													className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
												>
													{addPackageItemMutation.isPending && (
														<Loader2 className="w-4 h-4 animate-spin" />
													)}
													Add Item
												</button>
											</div>
										</Dialog.Content>
									</Dialog.Portal>
								</Dialog.Root>

								{/* Add Material Modal */}
								<Dialog.Root
									open={showAddMaterialModal}
									onOpenChange={setShowAddMaterialModal}
								>
									<Dialog.Portal>
										<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
										<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
											<Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
												Add{" "}
												{materialType === "Accessories"
													? "Accessory"
													: "Manufacturing Material"}
											</Dialog.Title>
											<Dialog.Description className="sr-only">
												Add a new material to this package
											</Dialog.Description>

											<div className="space-y-4">
												<div>
													<label
														htmlFor="add-material-type"
														className="block text-sm font-medium text-gray-700 mb-1"
													>
														Material Type
													</label>
													<select
														id="add-material-type"
														value={materialType}
														onChange={(e) => setMaterialType(e.target.value)}
														className="w-full px-3 py-2 border rounded-lg"
													>
														<option value="Accessories">Accessories</option>
														<option value="Big Sides">Big Sides</option>
														<option value="Small Sides">Small Sides</option>
														<option value="Lis">Lid</option>
														<option value="Base">Base</option>
														<option value="Body">Body</option>
														<option value="Securing">Securing</option>
														<option value="Vacuum Packing">
															Vacuum Packing
														</option>
														<option value="Gas Packing">Gas Packing</option>
													</select>
												</div>
												<div>
													<label
														htmlFor="add-material-variant"
														className="block text-sm font-medium text-gray-700 mb-1"
													>
														Material Variant
													</label>
													<select
														id="add-material-variant"
														value={materialForm.material_variant_id}
														onChange={(e) => {
															setMaterialForm((f) => ({
																...f,
																material_variant_id: e.target.value,
															}));
															setMaterialValidationErrors((prev) => ({
																...prev,
																material_variant_id: "",
															}));
														}}
														className={`w-full px-3 py-2 border rounded-lg ${
															materialValidationErrors.material_variant_id
																? "border-red-500 focus:ring-red-500"
																: ""
														}`}
													>
														<option value="">Select a material...</option>
														{availableMaterials?.map((m) => (
															<option key={m.id} value={m.id}>
																{m.variant_name}{" "}
																{m.material_name ? `(${m.material_name})` : ""}
															</option>
														))}
													</select>
													{materialValidationErrors.material_variant_id && (
														<p className="mt-1 text-sm text-red-600">
															{materialValidationErrors.material_variant_id}
														</p>
													)}
												</div>
												<div className="grid grid-cols-2 gap-4">
													<div>
														<label
															htmlFor="add-material-quantity"
															className="block text-sm font-medium text-gray-700 mb-1"
														>
															Quantity
														</label>
														<input
															id="add-material-quantity"
															type="number"
															value={materialForm.quantity}
															onChange={(e) => {
																setMaterialForm((f) => ({
																	...f,
																	quantity: Number(e.target.value),
																}));
																setMaterialValidationErrors((prev) => ({
																	...prev,
																	quantity: "",
																}));
															}}
															className={`w-full px-3 py-2 border rounded-lg ${
																materialValidationErrors.quantity
																	? "border-red-500 focus:ring-red-500"
																	: ""
															}`}
															min={1}
														/>
														{materialValidationErrors.quantity && (
															<p className="mt-1 text-sm text-red-600">
																{materialValidationErrors.quantity}
															</p>
														)}
													</div>
													<div>
														<label
															htmlFor="add-material-unit"
															className="block text-sm font-medium text-gray-700 mb-1"
														>
															Unit
														</label>
														<select
															id="add-material-unit"
															value={materialForm.unit_id}
															onChange={(e) =>
																setMaterialForm((f) => ({
																	...f,
																	unit_id: e.target.value,
																}))
															}
															className="w-full px-3 py-2 border rounded-lg"
														>
															<option value="">Select unit...</option>
															{availableUnits?.map((u) => (
																<option key={u.id} value={u.id}>
																	{u.name}
																</option>
															))}
														</select>
													</div>
												</div>
												<div>
													<p className="block text-sm font-medium text-gray-700 mb-1">
														Dimensions (L × W × H)
													</p>
													<div className="grid grid-cols-3 gap-2">
														<input
															type="number"
															placeholder="Length"
															value={materialForm.length}
															onChange={(e) =>
																setMaterialForm((f) => ({
																	...f,
																	length: e.target.value,
																}))
															}
															className="px-3 py-2 border rounded-lg"
														/>
														<input
															type="number"
															placeholder="Width"
															value={materialForm.width}
															onChange={(e) =>
																setMaterialForm((f) => ({
																	...f,
																	width: e.target.value,
																}))
															}
															className="px-3 py-2 border rounded-lg"
														/>
														<input
															type="number"
															placeholder="Height"
															value={materialForm.height}
															onChange={(e) =>
																setMaterialForm((f) => ({
																	...f,
																	height: e.target.value,
																}))
															}
															className="px-3 py-2 border rounded-lg"
														/>
													</div>
												</div>
												<div>
													<label
														htmlFor="add-material-comment"
														className="block text-sm font-medium text-gray-700 mb-1"
													>
														Comment
													</label>
													<input
														id="add-material-comment"
														type="text"
														value={materialForm.comment}
														onChange={(e) => {
															setMaterialForm((f) => ({
																...f,
																comment: e.target.value,
															}));
															setMaterialValidationErrors((prev) => ({
																...prev,
																comment: "",
															}));
														}}
														className={`w-full px-3 py-2 border rounded-lg ${
															materialValidationErrors.comment
																? "border-red-500 focus:ring-red-500"
																: ""
														}`}
														placeholder="Optional comment (max 2000 chars)"
													/>
													{materialValidationErrors.comment && (
														<p className="mt-1 text-sm text-red-600">
															{materialValidationErrors.comment}
														</p>
													)}
												</div>
												<div className="flex items-center gap-2">
													<input
														type="checkbox"
														id="is_final"
														checked={materialForm.is_final}
														onChange={(e) =>
															setMaterialForm((f) => ({
																...f,
																is_final: e.target.checked,
															}))
														}
														className="rounded"
													/>
													<label
														htmlFor="is_final"
														className="text-sm text-gray-700"
													>
														Mark as Final
													</label>
												</div>
											</div>

											<div className="flex justify-end gap-2 mt-6">
												<Dialog.Close asChild>
													<button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
														Cancel
													</button>
												</Dialog.Close>
												<button
													onClick={handleAddMaterial}
													disabled={addPackageMaterialMutation.isPending}
													className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
												>
													{addPackageMaterialMutation.isPending && (
														<Loader2 className="w-4 h-4 animate-spin" />
													)}
													Add Material
												</button>
											</div>
										</Dialog.Content>
									</Dialog.Portal>
								</Dialog.Root>

								{/* End Task Modal */}
								<Dialog.Root
									open={showEndTaskModal}
									onOpenChange={setShowEndTaskModal}
								>
									<Dialog.Portal>
										<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
										<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
											<Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
												End Task
											</Dialog.Title>
											<Dialog.Description className="text-sm text-gray-500 mb-4">
												Mark this task as completed and set the end time
											</Dialog.Description>

											{endingTask && (
												<div className="space-y-4">
													{/* Task Info */}
													<div className="bg-gray-50 rounded-lg p-4">
														<div className="flex items-center gap-2 mb-2">
															<Play className="w-4 h-4 text-blue-500" />
															<span className="font-medium text-gray-900">
																{endingTask.task?.name || "Unknown Task"}
															</span>
														</div>
														<div className="text-sm text-gray-600">
															<p>
																<strong>Started:</strong>{" "}
																{new Date(endingTask.start_time).toLocaleString(
																	"en-US",
																	{
																		month: "short",
																		day: "numeric",
																		year: "numeric",
																		hour: "2-digit",
																		minute: "2-digit",
																	},
																)}
															</p>
															<p>
																<strong>Packers:</strong>{" "}
																{endingTask.task_assignments
																	.map((a) => a.packer?.full_name)
																	.filter(Boolean)
																	.join(", ") || "None assigned"}
															</p>
														</div>
													</div>

													{/* End Time Input */}
													<div>
														<label
															htmlFor="end-task-time"
															className="block text-sm font-medium text-gray-700 mb-1"
														>
															End Time
														</label>
														<input
															id="end-task-time"
															type="datetime-local"
															value={endTaskTime}
															onChange={(e) => setEndTaskTime(e.target.value)}
															min={endingTask.start_time.slice(0, 16)}
															className="w-full px-3 py-2 border rounded-lg text-gray-900"
														/>
														<p className="mt-1 text-xs text-gray-500">
															Defaulted to shift end time. Adjust if needed.
														</p>
													</div>

													{/* Duration Preview */}
													{endTaskTime && (
														<div className="bg-blue-50 rounded-lg p-3">
															<p className="text-sm text-blue-700">
																<strong>Duration:</strong> {(() => {
																	const start = new Date(endingTask.start_time);
																	const end = new Date(endTaskTime);
																	const minutes = Math.round(
																		(end.getTime() - start.getTime()) /
																			(1000 * 60),
																	);
																	const hours = Math.floor(minutes / 60);
																	const mins = minutes % 60;
																	return `${hours}h ${mins}m`;
																})()}
																{endingTask.task_assignments.filter(
																	(a) => a.packer?.full_name,
																).length > 1 && (
																	<span className="ml-2">
																		(Total: {(() => {
																			const start = new Date(
																				endingTask.start_time,
																			);
																			const end = new Date(endTaskTime);
																			const minutes = Math.round(
																				(end.getTime() - start.getTime()) /
																					(1000 * 60),
																			);
																			const packerCount =
																				endingTask.task_assignments.filter(
																					(a) => a.packer?.full_name,
																				).length;
																			const totalMinutes =
																				minutes * packerCount;
																			const hours = Math.floor(
																				totalMinutes / 60,
																			);
																			const mins = totalMinutes % 60;
																			return `${hours}h ${mins}m for ${packerCount} packers`;
																		})()})
																	</span>
																)}
															</p>
														</div>
													)}
												</div>
											)}

											<div className="flex justify-end gap-2 mt-6">
												<Dialog.Close asChild>
													<button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
														Cancel
													</button>
												</Dialog.Close>
												<button
													onClick={() => {
														if (endingTask && endTaskTime) {
															endTaskMutation.mutate({
																taskLogId: endingTask.id,
																endTime: new Date(endTaskTime).toISOString(),
															});
														}
													}}
													disabled={!endTaskTime || endTaskMutation.isPending}
													className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
												>
													{endTaskMutation.isPending && (
														<Loader2 className="w-4 h-4 animate-spin" />
													)}
													<StopCircle className="w-4 h-4" />
													End Task
												</button>
											</div>
										</Dialog.Content>
									</Dialog.Portal>
								</Dialog.Root>

								{/* Description Section */}
								{order.description && (
									<div className="bg-white rounded-lg border shadow-sm p-6">
										<h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
											<FileText className="w-5 h-5" />
											Description
										</h2>
										<p className="text-gray-700 whitespace-pre-wrap">
											{order.description}
										</p>
									</div>
								)}
							</div>

							{/* Sidebar */}
							<div className="space-y-6">
								{/* Client Information */}
								<div className="bg-white rounded-lg border shadow-sm p-6">
									<h2 className="text-lg font-semibold text-gray-900 mb-4">
										Client Information
									</h2>
									<div className="space-y-4">
										<div className="flex items-start gap-3">
											<User className="w-5 h-5 text-gray-400 mt-0.5" />
											<div>
												<p className="text-sm text-gray-500">Client Name</p>
												<p className="font-medium text-gray-900">
													{order.clients?.name || "N/A"}
												</p>
											</div>
										</div>
										{order.clients?.contact_person && (
											<div className="flex items-start gap-3">
												<User className="w-5 h-5 text-gray-400 mt-0.5" />
												<div>
													<p className="text-sm text-gray-500">
														Contact Person
													</p>
													<p className="font-medium text-gray-900">
														{order.clients.contact_person}
													</p>
												</div>
											</div>
										)}
										{order.clients?.email && (
											<div className="flex items-start gap-3">
												<Mail className="w-5 h-5 text-gray-400 mt-0.5" />
												<div>
													<p className="text-sm text-gray-500">Email</p>
													<a
														href={`mailto:${order.clients.email}`}
														className="font-medium text-blue-600 hover:underline"
													>
														{order.clients.email}
													</a>
												</div>
											</div>
										)}
										{order.clients?.phone && (
											<div className="flex items-start gap-3">
												<Phone className="w-5 h-5 text-gray-400 mt-0.5" />
												<div>
													<p className="text-sm text-gray-500">Phone</p>
													<a
														href={`tel:${order.clients.phone}`}
														className="font-medium text-blue-600 hover:underline"
													>
														{order.clients.phone}
													</a>
												</div>
											</div>
										)}
										{order.clients?.address && (
											<div className="flex items-start gap-3">
												<MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
												<div>
													<p className="text-sm text-gray-500">Address</p>
													<p className="font-medium text-gray-900">
														{order.clients.address}
													</p>
												</div>
											</div>
										)}
									</div>
								</div>

								{/* Order Details */}
								<div className="bg-white rounded-lg border shadow-sm p-6">
									<h2 className="text-lg font-semibold text-gray-900 mb-4">
										Order Details
									</h2>
									<div className="space-y-4">
										<div className="flex items-start gap-3">
											<Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
											<div>
												<p className="text-sm text-gray-500">Start Date</p>
												<p className="font-medium text-gray-900">
													{formatDate(order.start_date)}
												</p>
											</div>
										</div>
										<div className="flex items-start gap-3">
											<Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
											<div>
												<p className="text-sm text-gray-500">Completion Date</p>
												<p className="font-medium text-gray-900">
													{formatDate(order.completion_date)}
												</p>
											</div>
										</div>
										{order.project_lead && (
											<div className="flex items-start gap-3">
												<User className="w-5 h-5 text-gray-400 mt-0.5" />
												<div>
													<p className="text-sm text-gray-500">Project Lead</p>
													<p className="font-medium text-gray-900">
														{order.project_lead.full_name}
													</p>
												</div>
											</div>
										)}
										<div className="flex items-start gap-3">
											<Clock className="w-5 h-5 text-gray-400 mt-0.5" />
											<div>
												<p className="text-sm text-gray-500">Last Updated</p>
												<p className="font-medium text-gray-900">
													{formatDateTime(order.updated_at)}
												</p>
											</div>
										</div>
									</div>
								</div>

								{/* Work Summary */}
								{teamMembers?.length || attendanceLogs?.length ? (
									<div className="bg-white rounded-lg border shadow-sm p-6">
										<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
											<ClipboardList className="w-5 h-5" />
											Work Summary
										</h2>
										<div className="space-y-4">
											<div className="flex items-center justify-between">
												<span className="text-gray-600">Team Size</span>
												<span className="font-medium text-gray-900">
													{teamMembers?.length || 0} packers
												</span>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-gray-600">Work Sessions</span>
												<span className="font-medium text-gray-900">
													{attendanceLogs?.length || 0}
												</span>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-gray-600">Work Days</span>
												<span className="font-medium text-gray-900">
													{new Set(attendanceLogs?.map((l) => l.log_date))
														.size || 0}
												</span>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-gray-600">Total Hours</span>
												<span className="font-medium text-gray-900">
													{attendanceLogs
														?.filter((l) => l.start_time && l.end_time)
														.reduce((sum, l) => {
															const start = new Date(l.start_time!).getTime();
															const end = new Date(l.end_time!).getTime();
															return sum + (end - start) / (1000 * 60 * 60);
														}, 0)
														.toFixed(1) || "0"}{" "}
													hrs
												</span>
											</div>
										</div>
									</div>
								) : null}

								{/* Danger Zone */}
								<div className="bg-white rounded-lg border border-red-200 shadow-sm p-6">
									<h2 className="text-lg font-semibold text-red-700 mb-2 flex items-center gap-2">
										<AlertTriangle className="w-5 h-5" />
										Danger Zone
									</h2>
									<p className="text-sm text-gray-600 mb-4">
										Deleting this order removes all related records, including
										packages, materials, tasks, and manufacturing data.
									</p>
									<Dialog.Root
										open={deleteOrderOpen}
										onOpenChange={setDeleteOrderOpen}
									>
										<Dialog.Trigger asChild>
											<button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
												<Trash2 className="w-4 h-4" />
												Delete Order
											</button>
										</Dialog.Trigger>
										<Dialog.Portal>
											<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
											<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-2xl p-6">
												<Dialog.Title className="text-lg font-semibold text-gray-900 flex items-center gap-2">
													<Trash2 className="w-5 h-5 text-red-600" />
													Delete Order
												</Dialog.Title>
												<Dialog.Description className="text-sm text-gray-500 mt-1">
													This action is permanent. The following tables will be
													cleaned up for this order.
												</Dialog.Description>

												<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
													{deleteOrderTargets.map((target) => (
														<div
															key={target}
															className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
														>
															<span className="h-1.5 w-1.5 rounded-full bg-red-500" />
															{target}
														</div>
													))}
												</div>

												{deleteOrderError && (
													<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
														{deleteOrderError}
													</div>
												)}

												<div className="mt-6 flex justify-end gap-2">
													<Dialog.Close asChild>
														<button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
															Cancel
														</button>
													</Dialog.Close>
													<button
														onClick={deleteOrderCascade}
														disabled={deletingOrder}
														className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
													>
														{deletingOrder ? (
															<>
																<Loader2 className="w-4 h-4 animate-spin" />
																Deleting...
															</>
														) : (
															<>
																<Trash2 className="w-4 h-4" />
																Delete Order
															</>
														)}
													</button>
												</div>
											</Dialog.Content>
										</Dialog.Portal>
									</Dialog.Root>
								</div>
							</div>
						</div>
					</div>
				</main>
			</Suspense>

			{/* Attendance Cleaner Modal */}
			<Dialog.Root open={cleanerModalOpen} onOpenChange={setCleanerModalOpen}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
					<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
						<div className="px-6 py-4 border-b flex items-center justify-between">
							<Dialog.Title className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<Sparkles className="w-5 h-5 text-amber-500" />
								Clean Attendance Issues
							</Dialog.Title>
							<Dialog.Close className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
								<X className="w-5 h-5 text-gray-500" />
							</Dialog.Close>
						</div>

						<div className="flex-1 overflow-auto p-6">
							{proposedChanges.length > 0 ? (
								<>
									<p className="text-sm text-gray-600 mb-4">
										The following attendance records have issues (missing end
										times, end times on wrong day, negative hours, or invalid
										times). Morning shifts will be corrected to 12:00 PM,
										afternoon shifts to 11:59 PM of the start date.
									</p>
									<div className="overflow-x-auto border rounded-lg">
										<table className="w-full text-sm">
											<thead className="bg-gray-50 text-left">
												<tr>
													<th className="px-4 py-3 font-semibold text-gray-700">
														Packer
													</th>
													<th className="px-4 py-3 font-semibold text-gray-700">
														Shift
													</th>
													<th className="px-4 py-3 font-semibold text-gray-700">
														Start
													</th>
													<th className="px-4 py-3 font-semibold text-gray-700">
														Current End
													</th>
													<th className="px-4 py-3 font-semibold text-gray-700">
														Hours
													</th>
													<th className="px-4 py-3 font-semibold text-green-700">
														New End
													</th>
													<th className="px-4 py-3 font-semibold text-green-700">
														New Hours
													</th>
													<th className="px-4 py-3 font-semibold text-gray-700 text-center">
														Approve
													</th>
												</tr>
											</thead>
											<tbody className="divide-y">
												{proposedChanges.map((change) => (
													<tr
														key={change.id}
														className={change.approved ? "bg-green-50" : ""}
													>
														<td className="px-4 py-3 font-medium text-gray-900">
															{change.packerName}
														</td>
														<td className="px-4 py-3 text-gray-700 capitalize">
															{change.shift}
														</td>
														<td className="px-4 py-3 text-gray-700">
															{change.currentStart
																? new Date(
																		change.currentStart,
																	).toLocaleTimeString("en-US", {
																		hour: "2-digit",
																		minute: "2-digit",
																	})
																: "—"}
														</td>
														<td className="px-4 py-3 text-gray-700">
															{change.currentEnd ? (
																<span className="text-red-600">
																	{new Date(change.currentEnd).toLocaleString(
																		"en-US",
																		{
																			month: "short",
																			day: "numeric",
																			hour: "2-digit",
																			minute: "2-digit",
																		},
																	)}
																</span>
															) : (
																<span className="text-amber-600">Not set</span>
															)}
														</td>
														<td className="px-4 py-3">
															<span
																className={
																	parseFloat(change.currentHours) > 12
																		? "text-red-600 font-semibold"
																		: "text-gray-700"
																}
															>
																{change.currentHours}
															</span>
														</td>
														<td className="px-4 py-3 text-green-700 font-medium">
															{new Date(change.newEnd).toLocaleTimeString(
																"en-US",
																{ hour: "2-digit", minute: "2-digit" },
															)}
														</td>
														<td className="px-4 py-3 text-green-700 font-medium">
															{change.newHours}
														</td>
														<td className="px-4 py-3 text-center">
															<button
																onClick={() => toggleApproval(change.id)}
																className={`p-2 rounded-lg transition-colors ${
																	change.approved
																		? "bg-green-500 text-white hover:bg-green-600"
																		: "bg-gray-100 text-gray-400 hover:bg-gray-200"
																}`}
															>
																<Check className="w-4 h-4" />
															</button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</>
							) : (
								<div className="text-center py-12">
									<CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
									<p className="text-gray-700 font-medium">
										All morning attendance records look good!
									</p>
									<p className="text-gray-500 text-sm mt-1">
										No records need cleaning for the selected date.
									</p>
								</div>
							)}
						</div>

						{proposedChanges.length > 0 && (
							<div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
								<div className="text-sm text-gray-600">
									{proposedChanges.filter((c) => c.approved).length} of{" "}
									{proposedChanges.length} records selected
								</div>
								<div className="flex items-center gap-3">
									<button
										onClick={approveAll}
										className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
									>
										Select All
									</button>
									<button
										onClick={applySelectedChanges}
										disabled={
											applyingChanges ||
											proposedChanges.filter((c) => c.approved).length === 0
										}
										className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
									>
										{applyingChanges ? (
											<>
												<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
												Applying...
											</>
										) : (
											<>
												<Check className="w-4 h-4" />
												Apply Selected (
												{proposedChanges.filter((c) => c.approved).length})
											</>
										)}
									</button>
								</div>
							</div>
						)}
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
