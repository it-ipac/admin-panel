// ─── Enums ────────────────────────────────────────────────────────────────────

export type RequestType =
	| "material"
	| "material_variant"
	| "supplier_pricing"
	| "allocation_increase";
export type RequestAction = "approved" | "rejected";

// ─── Shared sub-shapes ────────────────────────────────────────────────────────

interface Profile {
	full_name: string | null;
}

interface OrderPackageContext {
	package_number: number;
	order: { order_name: string } | null;
}

// ─── Material Request ─────────────────────────────────────────────────────────

export interface MaterialRequest {
	id: string;
	name: string;
	description: string | null;
	unit_id: string | null;
	requested_by: string;
	requested_at: string;
	admin_notes: string | null;
	order_package_context: string | null;
	/** Joined */
	requested_by_profile: Profile | null;
	order_package: OrderPackageContext | null;
}

// ─── Material Variant Request ─────────────────────────────────────────────────

export interface MaterialVariantRequest {
	id: string;
	material_id: string | null;
	variant_name: string;
	attributes: Record<string, unknown> | null;
	description: string | null;
	unit_id: string | null;
	length: number | null;
	width: number | null;
	thickness: number | null;
	weight_per_unit: number | null;
	requested_by: string;
	requested_at: string;
	admin_notes: string | null;
	order_package_context: string | null;
	/** FK to parent material_requests row — non-null means BLOCKED */
	material_request_id: string | null;
	/** Joined */
	material: { name: string } | null;
	parent_material_request: { id: string; name: string } | null;
	requested_by_profile: Profile | null;
	order_package: OrderPackageContext | null;
}

export interface MaterialVariantRequestWithBlockedState
	extends MaterialVariantRequest {
	isBlocked: boolean;
}

// ─── Supplier Pricing Request ─────────────────────────────────────────────────

export interface SupplierPricingRequest {
	id: string;
	material_variant_id: string | null;
	supplier_id: string;
	price: number;
	price_per_unit: number;
	supplier_quantity: number;
	suppliers_reference: string | null;
	requested_by: string;
	requested_at: string;
	admin_notes: string | null;
	order_package_context: string | null;
	/** FK to parent material_variant_requests row — non-null means BLOCKED */
	variant_request_id: string | null;
	/** Joined */
	variant: {
		variant_name: string;
		material: { name: string } | null;
	} | null;
	parent_variant_request: { id: string; variant_name: string } | null;
	supplier: { name: string } | null;
	requested_by_profile: Profile | null;
	order_package: OrderPackageContext | null;
}

export interface SupplierPricingRequestWithBlockedState
	extends SupplierPricingRequest {
	isBlocked: boolean;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface RequestAuditLog {
	id: string;
	request_type: RequestType;
	action: RequestAction;
	request_snapshot: Record<string, unknown>;
	requested_by: string | null;
	requested_at: string | null;
	reviewed_by: string | null;
	reviewed_at: string;
	admin_notes: string | null;
	resulting_id: string | null;
	order_package_context: string | null;
	created_at: string;
	/** Joined */
	requested_by_profile: Profile | null;
	reviewed_by_profile: Profile | null;
	order_package: OrderPackageContext | null;
}

// ─── Allocation Increase Request ──────────────────────────────────────────────

export interface AllocationIncreaseRequest {
	id: string;
	order_id: string;
	items_db_id: string;
	destination_id: string;
	/** Additional quantity requested on top of the current allocation (> 0) */
	requested_delta: number;
	reason: string | null;
	requested_by: string;
	requested_at: string;
	admin_notes: string | null;
	order_package_context: string | null;
	/** Joined */
	item: { item_num: string | null; description: string | null } | null;
	destination: { code: string | null; name: string | null } | null;
	order: { order_name: string | null } | null;
	requested_by_profile: Profile | null;
	/**
	 * Current per-order allocation for this item+destination. May be null when no
	 * allocation row exists yet (approval creates it via INSERT … ON CONFLICT).
	 * `id` is included to support the Edit (custom-delta) flow.
	 */
	allocation: { id: string; expected_qty: number; packed_qty: number } | null;
	/** items_db master rollup total (expected_qty across all allocations). */
	items_db: { expected_qty: number | null } | null;
}

// ─── RPC params ───────────────────────────────────────────────────────────────

export interface ReviewRequestParams {
	requestId: string;
	reviewedBy: string;
	adminNotes: string | null;
}

// ─── Rejection impact (for cascade warning) ──────────────────────────────────

export interface MaterialRejectionImpact {
	dependentVariantCount: number;
	dependentPricingCount: number;
}
