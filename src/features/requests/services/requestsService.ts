import { supabase } from "../../../lib/supabase";
import type {
	MaterialRejectionImpact,
	MaterialRequest,
	MaterialVariantRequest,
	RequestAuditLog,
	ReviewRequestParams,
	SupplierPricingRequest,
} from "../types";

// ─── Error mapping ────────────────────────────────────────────────────────────

const POSTGRES_ERROR_MAP: Record<string, string> = {
	"not found": "Request not found — it may have already been actioned.",
	"parent material request is still pending":
		"Cannot approve: the parent material request is still pending. Approve the material first.",
	"parent variant request is still pending":
		"Cannot approve: the parent variant request is still pending. Approve the variant first.",
};

function normalizeRpcError(raw: string): string {
	for (const [key, friendly] of Object.entries(POSTGRES_ERROR_MAP)) {
		if (raw.toLowerCase().includes(key)) return friendly;
	}
	return "An unexpected error occurred. Please try again.";
}

// ─── Fetch queries ────────────────────────────────────────────────────────────

export async function fetchMaterialRequests(): Promise<MaterialRequest[]> {
	const { data, error } = await supabase
		.from("material_requests")
		.select(
			`
      *,
      requested_by_profile:profiles!requested_by(full_name),
      order_package:order_packages!order_package_context(
        package_number,
        order:orders(order_name)
      )
    `,
		)
		.order("requested_at", { ascending: true });

	if (error) throw new Error(error.message);
	return (data ?? []) as unknown as MaterialRequest[];
}

export async function fetchVariantRequests(): Promise<
	MaterialVariantRequest[]
> {
	const { data, error } = await supabase
		.from("material_variant_requests")
		.select(
			`
      *,
      material:materials!material_id(name),
      parent_material_request:material_requests!material_request_id(id, name),
      requested_by_profile:profiles!requested_by(full_name),
      order_package:order_packages!order_package_context(
        package_number,
        order:orders(order_name)
      )
    `,
		)
		.order("requested_at", { ascending: true });

	if (error) throw new Error(error.message);
	return (data ?? []) as unknown as MaterialVariantRequest[];
}

export async function fetchPricingRequests(): Promise<
	SupplierPricingRequest[]
> {
	const { data, error } = await supabase
		.from("supplier_pricing_requests")
		.select(
			`
      *,
      variant:material_variants!material_variant_id(variant_name, material:materials(name)),
      parent_variant_request:material_variant_requests!variant_request_id(id, variant_name),
      supplier:suppliers!supplier_id(name),
      requested_by_profile:profiles!requested_by(full_name),
      order_package:order_packages!order_package_context(
        package_number,
        order:orders(order_name)
      )
    `,
		)
		.order("requested_at", { ascending: true });

	if (error) throw new Error(error.message);
	return (data ?? []) as unknown as SupplierPricingRequest[];
}

export async function fetchAuditLog(): Promise<RequestAuditLog[]> {
	const { data, error } = await supabase
		.from("request_audit_log")
		.select(
			`
      *,
      requested_by_profile:profiles!requested_by(full_name),
      reviewed_by_profile:profiles!reviewed_by(full_name),
      order_package:order_packages!order_package_context(
        package_number,
        order:orders(order_name)
      )
    `,
		)
		.order("reviewed_at", { ascending: false });

	if (error) throw new Error(error.message);
	return (data ?? []) as unknown as RequestAuditLog[];
}

// ─── Cascade impact query ─────────────────────────────────────────────────────

export async function fetchMaterialRejectionImpact(
	materialRequestId: string,
): Promise<MaterialRejectionImpact> {
	const { data: variantRows, error: variantErr } = await supabase
		.from("material_variant_requests")
		.select("id")
		.eq("material_request_id", materialRequestId);

	if (variantErr) throw new Error(variantErr.message);

	const variantIds = (variantRows ?? []).map((r) => r.id);
	let dependentPricingCount = 0;

	if (variantIds.length > 0) {
		const { count, error: pricingErr } = await supabase
			.from("supplier_pricing_requests")
			.select("id", { count: "exact", head: true })
			.in("variant_request_id", variantIds);

		if (pricingErr) throw new Error(pricingErr.message);
		dependentPricingCount = count ?? 0;
	}

	return {
		dependentVariantCount: variantIds.length,
		dependentPricingCount,
	};
}

// ─── RPC mutations ────────────────────────────────────────────────────────────

export async function approveMaterialRequest(
	params: ReviewRequestParams,
): Promise<string> {
	const { data, error } = await supabase.rpc("approve_material_request", {
		p_request_id: params.requestId,
		p_reviewed_by: params.reviewedBy,
		p_admin_notes: params.adminNotes,
	});
	if (error) throw new Error(normalizeRpcError(error.message));
	return data as string;
}

export async function rejectMaterialRequest(
	params: ReviewRequestParams,
): Promise<void> {
	const { error } = await supabase.rpc("reject_material_request", {
		p_request_id: params.requestId,
		p_reviewed_by: params.reviewedBy,
		p_admin_notes: params.adminNotes,
	});
	if (error) throw new Error(normalizeRpcError(error.message));
}

export async function approveVariantRequest(
	params: ReviewRequestParams,
): Promise<string> {
	const { data, error } = await supabase.rpc(
		"approve_material_variant_request",
		{
			p_request_id: params.requestId,
			p_reviewed_by: params.reviewedBy,
			p_admin_notes: params.adminNotes,
		},
	);
	if (error) throw new Error(normalizeRpcError(error.message));
	return data as string;
}

export async function rejectVariantRequest(
	params: ReviewRequestParams,
): Promise<void> {
	const { error } = await supabase.rpc("reject_material_variant_request", {
		p_request_id: params.requestId,
		p_reviewed_by: params.reviewedBy,
		p_admin_notes: params.adminNotes,
	});
	if (error) throw new Error(normalizeRpcError(error.message));
}

export async function approvePricingRequest(
	params: ReviewRequestParams,
): Promise<string> {
	const { data, error } = await supabase.rpc(
		"approve_supplier_pricing_request",
		{
			p_request_id: params.requestId,
			p_reviewed_by: params.reviewedBy,
			p_admin_notes: params.adminNotes,
		},
	);
	if (error) throw new Error(normalizeRpcError(error.message));
	return data as string;
}

export async function rejectPricingRequest(
	params: ReviewRequestParams,
): Promise<void> {
	const { error } = await supabase.rpc("reject_supplier_pricing_request", {
		p_request_id: params.requestId,
		p_reviewed_by: params.reviewedBy,
		p_admin_notes: params.adminNotes,
	});
	if (error) throw new Error(normalizeRpcError(error.message));
}
