import { supabase } from "../../../lib/supabase";
import type {
	AllocationIncreaseRequest,
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

// ─── Allocation increase requests ─────────────────────────────────────────────

/** Row shape returned by the allocation-increase select before merge. */
interface AllocationRequestBaseRow {
	id: string;
	order_id: string;
	items_db_id: string;
	destination_id: string;
	requested_delta: number;
	reason: string | null;
	requested_by: string;
	requested_at: string;
	admin_notes: string | null;
	order_package_context: string | null;
	item: { item_num: string | null; description: string | null } | null;
	destination: { code: string | null; name: string | null } | null;
	order: { order_name: string | null } | null;
	requested_by_profile: { full_name: string | null } | null;
	items_db: { expected_qty: number | null } | null;
}

/** Allocation row shape from the batch fetch (includes id for Edit flow). */
interface AllocationBatchRow {
	id: string;
	order_id: string;
	items_db_id: string;
	destination_id: string;
	expected_qty: number;
	packed_qty: number;
}

/**
 * Fetches pending allocation-increase requests with the joins needed to show
 * "current expected → resulting expected" and the items_db master total.
 *
 * The current per-order allocation lives in `order_item_allocation`, keyed by
 * the composite (order_id, items_db_id, destination_id) — there is no single FK
 * to embed, and the row may not exist yet (approval creates it). So allocations
 * are fetched in a second batched query and merged in, mirroring the project's
 * 2-step join pattern to avoid N+1.
 */
export async function fetchAllocationIncreaseRequests(): Promise<
	AllocationIncreaseRequest[]
> {
	const { data, error } = await supabase
		.from("allocation_increase_requests")
		.select(
			`
      *,
      item:items_db!items_db_id(item_num, description),
      items_db:items_db!items_db_id(expected_qty),
      destination:destinations!destination_id(code, name),
      order:orders!order_id(order_name),
      requested_by_profile:profiles!requested_by(full_name)
    `,
		)
		.order("requested_at", { ascending: true });

	if (error) throw new Error(error.message);

	const rows = (data ?? []) as unknown as AllocationRequestBaseRow[];
	if (rows.length === 0) return [];

	// Batch-fetch the current allocations for every (order, item, destination)
	// touched by these requests, then index them for an in-memory merge.
	const orderIds = [...new Set(rows.map((r) => r.order_id))];
	const itemIds = [...new Set(rows.map((r) => r.items_db_id))];
	const destinationIds = [...new Set(rows.map((r) => r.destination_id))];

	const { data: allocationRows, error: allocationErr } = await supabase
		.from("order_item_allocation")
		.select(
			"id, order_id, items_db_id, destination_id, expected_qty, packed_qty",
		)
		.in("order_id", orderIds)
		.in("items_db_id", itemIds)
		.in("destination_id", destinationIds);

	if (allocationErr) throw new Error(allocationErr.message);

	const allocationByKey = new Map<
		string,
		{ id: string; expected_qty: number; packed_qty: number }
	>();
	for (const alloc of (allocationRows ?? []) as AllocationBatchRow[]) {
		const key = `${alloc.order_id}|${alloc.items_db_id}|${alloc.destination_id}`;
		allocationByKey.set(key, {
			id: alloc.id,
			expected_qty: alloc.expected_qty,
			packed_qty: alloc.packed_qty,
		});
	}

	return rows.map((row) => ({
		...row,
		allocation:
			allocationByKey.get(
				`${row.order_id}|${row.items_db_id}|${row.destination_id}`,
			) ?? null,
	}));
}

/**
 * Fetches pending allocation-increase requests for a single order.
 * Mirrors fetchAllocationIncreaseRequests but scoped by order_id.
 */
export async function fetchOrderAllocationIncreaseRequests(
	orderId: string,
): Promise<AllocationIncreaseRequest[]> {
	const { data, error } = await supabase
		.from("allocation_increase_requests")
		.select(
			`
      *,
      item:items_db!items_db_id(item_num, description),
      items_db:items_db!items_db_id(expected_qty),
      destination:destinations!destination_id(code, name),
      order:orders!order_id(order_name),
      requested_by_profile:profiles!requested_by(full_name)
    `,
		)
		.eq("order_id", orderId)
		.order("requested_at", { ascending: true });

	if (error) throw new Error(error.message);

	const rows = (data ?? []) as unknown as AllocationRequestBaseRow[];
	if (rows.length === 0) return [];

	const orderIds = [orderId];
	const itemIds = [...new Set(rows.map((r) => r.items_db_id))];
	const destinationIds = [...new Set(rows.map((r) => r.destination_id))];

	const { data: allocationRows, error: allocationErr } = await supabase
		.from("order_item_allocation")
		.select(
			"id, order_id, items_db_id, destination_id, expected_qty, packed_qty",
		)
		.in("order_id", orderIds)
		.in("items_db_id", itemIds)
		.in("destination_id", destinationIds);

	if (allocationErr) throw new Error(allocationErr.message);

	const allocationByKey = new Map<
		string,
		{ id: string; expected_qty: number; packed_qty: number }
	>();
	for (const alloc of (allocationRows ?? []) as AllocationBatchRow[]) {
		const key = `${alloc.order_id}|${alloc.items_db_id}|${alloc.destination_id}`;
		allocationByKey.set(key, {
			id: alloc.id,
			expected_qty: alloc.expected_qty,
			packed_qty: alloc.packed_qty,
		});
	}

	return rows.map((row) => ({
		...row,
		allocation:
			allocationByKey.get(
				`${row.order_id}|${row.items_db_id}|${row.destination_id}`,
			) ?? null,
	}));
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

export async function approveAllocationIncreaseRequest(
	params: ReviewRequestParams,
): Promise<string> {
	const { data, error } = await supabase.rpc(
		"approve_allocation_increase_request",
		{
			p_request_id: params.requestId,
			p_reviewed_by: params.reviewedBy,
			p_admin_notes: params.adminNotes,
		},
	);
	if (error) throw new Error(normalizeRpcError(error.message));
	return data as string;
}

export async function rejectAllocationIncreaseRequest(
	params: ReviewRequestParams,
): Promise<void> {
	const { error } = await supabase.rpc("reject_allocation_increase_request", {
		p_request_id: params.requestId,
		p_reviewed_by: params.reviewedBy,
		p_admin_notes: params.adminNotes,
	});
	if (error) throw new Error(normalizeRpcError(error.message));
}
