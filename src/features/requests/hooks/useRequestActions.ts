import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../hooks/useToast";
import { requestQueryKeys } from "../services/queryKeys";
import {
	approveMaterialRequest,
	approvePricingRequest,
	approveVariantRequest,
	rejectMaterialRequest,
	rejectPricingRequest,
	rejectVariantRequest,
} from "../services/requestsService";
import type { ReviewRequestParams } from "../types";

// ─── Shared invalidation helper ───────────────────────────────────────────────

const INVALIDATE_KEYS = [
	requestQueryKeys.materialRequests(),
	requestQueryKeys.variantRequests(),
	requestQueryKeys.pricingRequests(),
	requestQueryKeys.auditLog(),
] as const;

function useInvalidateAll() {
	const queryClient = useQueryClient();
	return () => {
		for (const key of INVALIDATE_KEYS) {
			queryClient.invalidateQueries({ queryKey: key });
		}
	};
}

// ─── Material mutations ───────────────────────────────────────────────────────

export function useApproveMaterialRequest() {
	const toast = useToast();
	const invalidateAll = useInvalidateAll();

	return useMutation({
		mutationFn: (params: ReviewRequestParams) => approveMaterialRequest(params),
		onSuccess: () => {
			invalidateAll();
			toast.success({ title: "Material request approved successfully." });
		},
		onError: (err: Error) => {
			toast.error({ title: "Approval failed", description: err.message });
		},
	});
}

export function useRejectMaterialRequest() {
	const toast = useToast();
	const invalidateAll = useInvalidateAll();

	return useMutation({
		mutationFn: (params: ReviewRequestParams) => rejectMaterialRequest(params),
		onSuccess: () => {
			invalidateAll();
			toast.success({
				title: "Material request rejected.",
				description:
					"All dependent variant and pricing requests have been removed.",
			});
		},
		onError: (err: Error) => {
			toast.error({ title: "Rejection failed", description: err.message });
		},
	});
}

// ─── Variant mutations ────────────────────────────────────────────────────────

export function useApproveVariantRequest() {
	const toast = useToast();
	const invalidateAll = useInvalidateAll();

	return useMutation({
		mutationFn: (params: ReviewRequestParams) => approveVariantRequest(params),
		onSuccess: () => {
			invalidateAll();
			toast.success({ title: "Variant request approved successfully." });
		},
		onError: (err: Error) => {
			toast.error({ title: "Approval failed", description: err.message });
		},
	});
}

export function useRejectVariantRequest() {
	const toast = useToast();
	const invalidateAll = useInvalidateAll();

	return useMutation({
		mutationFn: (params: ReviewRequestParams) => rejectVariantRequest(params),
		onSuccess: () => {
			invalidateAll();
			toast.success({
				title: "Variant request rejected.",
				description: "All dependent pricing requests have been removed.",
			});
		},
		onError: (err: Error) => {
			toast.error({ title: "Rejection failed", description: err.message });
		},
	});
}

// ─── Pricing mutations ────────────────────────────────────────────────────────

export function useApprovePricingRequest() {
	const toast = useToast();
	const invalidateAll = useInvalidateAll();

	return useMutation({
		mutationFn: (params: ReviewRequestParams) => approvePricingRequest(params),
		onSuccess: () => {
			invalidateAll();
			toast.success({ title: "Pricing request approved successfully." });
		},
		onError: (err: Error) => {
			toast.error({ title: "Approval failed", description: err.message });
		},
	});
}

export function useRejectPricingRequest() {
	const toast = useToast();
	const invalidateAll = useInvalidateAll();

	return useMutation({
		mutationFn: (params: ReviewRequestParams) => rejectPricingRequest(params),
		onSuccess: () => {
			invalidateAll();
			toast.success({ title: "Pricing request rejected." });
		},
		onError: (err: Error) => {
			toast.error({ title: "Rejection failed", description: err.message });
		},
	});
}
