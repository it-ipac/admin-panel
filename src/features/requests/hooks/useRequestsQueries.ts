import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { requestQueryKeys } from "../services/queryKeys";
import {
	fetchAuditLog,
	fetchMaterialRejectionImpact,
	fetchMaterialRequests,
	fetchPricingRequests,
	fetchVariantRequests,
} from "../services/requestsService";
import type {
	MaterialVariantRequestWithBlockedState,
	SupplierPricingRequestWithBlockedState,
} from "../types";

const STALE_30S = 30_000;

// ─── Material requests ────────────────────────────────────────────────────────

export function useMaterialRequests() {
	return useQuery({
		queryKey: requestQueryKeys.materialRequests(),
		queryFn: fetchMaterialRequests,
		staleTime: STALE_30S,
	});
}

// ─── Variant requests (with blocked state derived) ────────────────────────────

export function useVariantRequests() {
	const query = useQuery({
		queryKey: requestQueryKeys.variantRequests(),
		queryFn: fetchVariantRequests,
		staleTime: STALE_30S,
	});

	const dataWithBlockedState = useMemo<
		MaterialVariantRequestWithBlockedState[]
	>(() => {
		return (query.data ?? []).map((req) => ({
			...req,
			isBlocked: req.material_request_id !== null,
		}));
	}, [query.data]);

	return { ...query, data: dataWithBlockedState };
}

// ─── Pricing requests (with blocked state derived) ────────────────────────────

export function usePricingRequests() {
	const query = useQuery({
		queryKey: requestQueryKeys.pricingRequests(),
		queryFn: fetchPricingRequests,
		staleTime: STALE_30S,
	});

	const dataWithBlockedState = useMemo<
		SupplierPricingRequestWithBlockedState[]
	>(() => {
		return (query.data ?? []).map((req) => ({
			...req,
			isBlocked: req.variant_request_id !== null,
		}));
	}, [query.data]);

	return { ...query, data: dataWithBlockedState };
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export function useAuditLog() {
	return useQuery({
		queryKey: requestQueryKeys.auditLog(),
		queryFn: fetchAuditLog,
		staleTime: STALE_30S,
	});
}

// ─── Rejection impact (lazy — enabled only when needed) ───────────────────────

export function useMaterialRejectionImpact(
	materialRequestId: string | null,
	enabled: boolean,
) {
	return useQuery({
		queryKey: requestQueryKeys.materialRejectionImpact(
			materialRequestId ?? "none",
		),
		queryFn: () => fetchMaterialRejectionImpact(materialRequestId!),
		enabled: enabled && materialRequestId !== null,
		staleTime: STALE_30S,
	});
}
