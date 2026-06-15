import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastContext } from "@/components/ui/ToastProvider";
import { supabase } from "@/lib/supabase";
import type { TaskLog } from "../types";

/**
 * Order-level mutations: production/commercial status, order name and
 * ending an open task log.
 */
export function useOrderMutations(
	orderId: string,
	options: {
		/** Task logs are needed to derive duration when ending a task. */
		taskLogs: TaskLog[] | undefined;
		onNameSaved?: () => void;
		onTaskEnded?: () => void;
	},
) {
	const queryClient = useQueryClient();
	const { toast } = useToastContext();

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

	const updateOrderNameMutation = useMutation({
		mutationFn: async (newName: string) => {
			const { error } = await supabase
				.from("orders")
				.update({ order_name: newName })
				.eq("id", orderId);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			toast({
				title: "Success",
				description: "Order name updated successfully",
				variant: "success",
			});
			options.onNameSaved?.();
		},
		onError: (err: any) => {
			toast({
				title: "Error",
				description: err.message || "Failed to update order name",
				variant: "error",
			});
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
			const startTime = options.taskLogs?.find(
				(t) => t.id === taskLogId,
			)?.start_time;
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
			options.onTaskEnded?.();
		},
	});

	return {
		updateOrderStatusMutation,
		updateOrderNameMutation,
		endTaskMutation,
	};
}
