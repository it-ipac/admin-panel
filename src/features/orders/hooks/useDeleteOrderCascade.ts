import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
	deleteOrderCascade as deleteOrderCascadeCore,
	deleteOrderTargets,
} from "../utils/deleteOrderCascade";

export { deleteOrderTargets };

/**
 * Client-side cascade delete of an order and all related records (storage media
 * included). Navigates back to /orders on success. Wraps the pure
 * {@link deleteOrderCascadeCore} with navigation + query-cache invalidation.
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
			await deleteOrderCascadeCore(orderId);
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
