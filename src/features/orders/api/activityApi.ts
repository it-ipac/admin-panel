import { supabase } from "@/lib/supabase";
import type { AttendanceLog, Media, TaskLog, TeamMember } from "../types";
import { queryRowsInChunks } from "../utils/chunked";
import { fetchOrderPackageIds } from "./common";

/** Fetches attendance logs for an order (newest first). */
export async function fetchAttendanceLogs(
	orderId: string,
): Promise<AttendanceLog[]> {
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
}

/** Fetches team members assigned to an order. */
export async function fetchTeamMembers(orderId: string): Promise<TeamMember[]> {
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
}

/** Fetches task logs (with assignments and task_packages) for an order's packages. */
export async function fetchTaskLogs(orderId: string): Promise<TaskLog[]> {
	const packageIds = await fetchOrderPackageIds(orderId);
	if (packageIds.length === 0) return [];

	// Get task_packages for these packages
	const taskPackages = await queryRowsInChunks<{
		task_log_id: string | null;
		order_package_id: string;
	}>(packageIds, (chunk) =>
		supabase
			.from("task_packages")
			.select("task_log_id, order_package_id")
			.in("order_package_id", chunk),
	);

	if (taskPackages.length === 0) return [];

	const taskLogIds = [
		...new Set(
			taskPackages
				.map((tp) => tp.task_log_id)
				.filter((id): id is string => Boolean(id)),
		),
	];
	if (taskLogIds.length === 0) return [];

	// Get full task_logs with assignments
	const logs = await queryRowsInChunks<any>(taskLogIds, (chunk) =>
		supabase
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
			.in("id", chunk)
			.order("start_time", { ascending: false }),
	);

	if (logs.length === 0) return [];

	const sortedLogs = [...logs].sort(
		(a, b) =>
			new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
	);

	// Map task_packages to each task_log
	return sortedLogs.map((log) => ({
		...log,
		task: Array.isArray(log.task) ? log.task[0] : log.task,
		task_packages: taskPackages.filter((tp) => tp.task_log_id === log.id),
		task_assignments:
			log.task_assignments?.map((a: any) => ({
				...a,
				packer: Array.isArray(a.packer) ? a.packer[0] : a.packer,
			})) || [],
	})) as TaskLog[];
}

/** Fetches media for all packages in an order, with batch-signed URLs. */
export async function fetchOrderMedia(orderId: string): Promise<Media[]> {
	const packageIds = await fetchOrderPackageIds(orderId);
	if (packageIds.length === 0) return [];

	// Get all media for these packages
	const data = await queryRowsInChunks<any>(packageIds, (chunk) =>
		supabase
			.from("media")
			.select(`
          id,
          image_url,
          notes,
          created_at,
          order_package_id,
          designation
        `)
			.in("order_package_id", chunk)
			.order("created_at", { ascending: false }),
	);

	if (data.length === 0) return [];

	const sortedMedia = [...data].sort(
		(a, b) =>
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
	);

	// Generate signed URLs in one batch request (bucket is private)
	const paths = sortedMedia
		.map((item) => item.image_url)
		.filter((p): p is string => !!p);

	const signedByPath = new Map<string, string>();
	if (paths.length > 0) {
		// Signed URLs valid for 1 hour (3600 seconds)
		const { data: signedData, error: signedError } = await supabase.storage
			.from("media")
			.createSignedUrls(paths, 3600);

		if (signedError) {
			console.error("Error creating signed URLs:", signedError);
		} else {
			for (const entry of signedData || []) {
				if (entry.path && entry.signedUrl) {
					signedByPath.set(entry.path, entry.signedUrl);
				}
			}
		}
	}

	return sortedMedia.map(
		(item) =>
			({
				...item,
				signed_url: item.image_url
					? (signedByPath.get(item.image_url) ?? null)
					: null,
			}) as Media,
	);
}
