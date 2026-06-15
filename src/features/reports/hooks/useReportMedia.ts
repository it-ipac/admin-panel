import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	fetchUnfiledPackageMedia,
	type ReassignTarget,
	reassignMedia,
} from "../api";

/**
 * Unfiled (Task / orphaned) photos for the given order_packages. These are not
 * attached to any box instance or item, so they never show on the report — the
 * Photo Manager surfaces them so an admin can file them onto the right box/item.
 */
export const useUnfiledMediaQuery = (orderPackageIds: string[]) => {
	const key = [...new Set(orderPackageIds.filter(Boolean))].sort();
	return useQuery({
		queryKey: ["report_unfiled_media", key],
		queryFn: () => fetchUnfiledPackageMedia(key),
		enabled: key.length > 0,
	});
};

/**
 * Moves (UPDATE) or copies (INSERT) a media row onto a box/item, then refreshes
 * the report instances and the unfiled list so the photo appears in its new
 * place (and leaves the unfiled list when moved).
 */
export const useReassignMediaMutation = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			mediaId,
			mode,
			target,
		}: {
			mediaId: string;
			mode: "move" | "copy";
			target: ReassignTarget;
		}) => reassignMedia(mediaId, mode, target),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["report_instances"] });
			queryClient.invalidateQueries({ queryKey: ["report_unfiled_media"] });
		},
	});
};
