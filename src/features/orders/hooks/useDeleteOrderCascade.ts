import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { mutateInChunks, queryRowsInChunks } from "../utils/chunked";

/** Tables cleaned up by the order delete cascade — shown in the confirm dialog. */
export const deleteOrderTargets = [
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
	"order_pkg_instance",
	"pkd_item",
	"order_pkg_overview",
	"order_packages",
	"package_info",
	"category_order_map",
	"orders",
];

/**
 * Client-side cascade delete of an order and all related records
 * (storage media included). Navigates back to /orders on success.
 */
export function useDeleteOrderCascade(orderId: string) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [deleteOrderError, setDeleteOrderError] = useState<string | null>(null);
	const [deletingOrder, setDeletingOrder] = useState(false);

	const deleteOrderCascade = async (): Promise<void> => {
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

			const { data: overviewRows, error: overviewRowsError } = await supabase
				.from("order_pkg_overview")
				.select("id")
				.eq("order_id", orderId);
			if (overviewRowsError) throw overviewRowsError;

			const overviewIds = (overviewRows || [])
				.map((row: any) => row.id)
				.filter(Boolean);

			if (packageIds.length > 0) {
				const mediaRows = await queryRowsInChunks<any>(packageIds, (chunk) =>
					supabase
						.from("media")
						.select("id, image_url")
						.in("order_package_id", chunk),
				);

				const mediaPaths = (mediaRows || [])
					.map((row: any) => row.image_url)
					.filter(Boolean);

				if (mediaPaths.length > 0) {
					const { error: storageError } = await supabase.storage
						.from("media")
						.remove(mediaPaths);
					if (storageError) throw storageError;
				}

				await mutateInChunks(packageIds, (chunk) =>
					supabase.from("media").delete().in("order_package_id", chunk),
				);

				await mutateInChunks(packageIds, (chunk) =>
					supabase.from("package_items").delete().in("order_package_id", chunk),
				);

				await mutateInChunks(packageIds, (chunk) =>
					supabase
						.from("order_package_materials")
						.delete()
						.in("order_package_id", chunk),
				);

				await mutateInChunks(packageIds, (chunk) =>
					supabase
						.from("order_package_services")
						.delete()
						.in("order_package_id", chunk),
				);

				const securingRows = await queryRowsInChunks<any>(packageIds, (chunk) =>
					supabase
						.from("order_package_securing")
						.select("id, securing_template_id")
						.in("order_package_id", chunk),
				);

				const templateIds = Array.from(
					new Set(
						(securingRows || [])
							.map((row: any) => row.securing_template_id)
							.filter(Boolean),
					),
				);

				let beamIds: string[] = [];
				if (templateIds.length > 0) {
					const templateRows = await queryRowsInChunks<any>(
						templateIds,
						(chunk) =>
							supabase
								.from("securing_template")
								.select("id, horizontal_bar, vertical_bar, skids")
								.in("id", chunk),
					);

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

				await mutateInChunks(packageIds, (chunk) =>
					supabase
						.from("order_package_securing")
						.delete()
						.in("order_package_id", chunk),
				);

				await mutateInChunks(templateIds, (chunk) =>
					supabase.from("securing_template").delete().in("id", chunk),
				);

				await mutateInChunks(beamIds, (chunk) =>
					supabase.from("beam").delete().in("id", chunk),
				);

				const taskPackages = await queryRowsInChunks<any>(packageIds, (chunk) =>
					supabase
						.from("task_packages")
						.select("id, task_log_id")
						.in("order_package_id", chunk),
				);

				const taskLogIds = Array.from(
					new Set(
						(taskPackages || [])
							.map((row: any) => row.task_log_id)
							.filter(Boolean),
					),
				);

				// Collect task_ids from task_logs so we can clean up task_assignments
				// (task_assignments links to tasks.id via task_id, not to task_logs)
				const taskLogRows =
					taskLogIds.length > 0
						? await queryRowsInChunks<any>(taskLogIds, (chunk) =>
								supabase
									.from("task_logs")
									.select("id, task_id")
									.in("id", chunk),
							)
						: [];

				const taskIds = Array.from(
					new Set(
						(taskLogRows || []).map((row: any) => row.task_id).filter(Boolean),
					),
				);

				await mutateInChunks(packageIds, (chunk) =>
					supabase.from("task_packages").delete().in("order_package_id", chunk),
				);

				await mutateInChunks(taskIds, (chunk) =>
					supabase.from("task_assignments").delete().in("task_id", chunk),
				);

				await mutateInChunks(taskLogIds, (chunk) =>
					supabase.from("task_logs").delete().in("id", chunk),
				);

				const packageInstances = await queryRowsInChunks<any>(
					packageIds,
					(chunk) =>
						supabase
							.from("order_pkg_instance")
							.select("id")
							.in("order_package_id", chunk),
				);
				const packageInstanceIds = (packageInstances || [])
					.map((row: any) => row.id)
					.filter(Boolean);

				await mutateInChunks(packageInstanceIds, (chunk) =>
					supabase.from("pkd_item").delete().in("pkg_instance_id", chunk),
				);

				await mutateInChunks(packageIds, (chunk) =>
					supabase
						.from("order_pkg_instance")
						.delete()
						.in("order_package_id", chunk),
				);
			}

			if (overviewIds.length > 0) {
				const overviewInstances = await queryRowsInChunks<any>(
					overviewIds,
					(chunk) =>
						supabase
							.from("order_pkg_instance")
							.select("id")
							.in("order_pkg_overview_id", chunk),
				);
				const overviewInstanceIds = (overviewInstances || [])
					.map((row: any) => row.id)
					.filter(Boolean);

				await mutateInChunks(overviewInstanceIds, (chunk) =>
					supabase.from("pkd_item").delete().in("pkg_instance_id", chunk),
				);

				await mutateInChunks(overviewIds, (chunk) =>
					supabase
						.from("order_pkg_instance")
						.delete()
						.in("order_pkg_overview_id", chunk),
				);

				await mutateInChunks(overviewIds, (chunk) =>
					supabase.from("order_pkg_overview").delete().in("id", chunk),
				);
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

			await mutateInChunks(packageIds, (chunk) =>
				supabase.from("order_packages").delete().in("id", chunk),
			);

			await mutateInChunks(packageInfoIds, (chunk) =>
				supabase.from("package_info").delete().in("id", chunk),
			);

			const { error: categoryOrderMapError } = await supabase
				.from("category_order_map")
				.delete()
				.eq("order_id", orderId);
			if (categoryOrderMapError) throw categoryOrderMapError;

			const { error: orderDeleteError } = await supabase
				.from("orders")
				.delete()
				.eq("id", orderId);
			if (orderDeleteError) throw orderDeleteError;

			queryClient.removeQueries({
				predicate: (q) => q.queryKey.includes(orderId),
			});
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			navigate({ to: "/orders" });
		} catch (err: any) {
			setDeleteOrderError(err?.message || "Delete failed. Please try again.");
		} finally {
			setDeletingOrder(false);
		}
	};

	return { deleteOrderCascade, deletingOrder, deleteOrderError };
}
