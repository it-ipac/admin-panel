export type TabType =
	| "materials"
	| "variants"
	| "suppliers"
	| "communications";

export interface Unit {
	id: string;
	name: string;
	description?: string;
}

export interface TagItem {
	id: string;
	name: string;
}

export interface VariantTag {
	tag_id: string;
	tags?: TagItem;
}

export interface SupplierPricing {
	id: string;
	material_variant_id: string;
	supplier_id: string;
	price: number;
	price_per_unit: number;
	supplier_quantity: number;
	suppliers_reference?: string | null;
	updated_at?: string;
	suppliers?: Supplier;
}

export interface MaterialVariant {
	id: string;
	material_id: string;
	variant_name: string;
	description?: string;
	unit_id?: string;
	attributes?: Record<string, string> | null;
	length?: number | null;
	width?: number | null;
	thickness?: number | null;
	weight_per_unit?: number | null;
	created_at?: string;
	unit?: Unit;
	supplier_pricing?: SupplierPricing[];
	material_variant_tags?: VariantTag[];
	material?: Material;
}

export interface Material {
	id: string;
	name: string;
	description: string | null;
	unit_id?: string;
	created_at: string;
	unit?: Unit;
	material_variants?: MaterialVariant[];
}

export interface Supplier {
	id: string;
	name: string;
	contact_person: string | null;
	email: string | null;
	phone: string | null;
	address: string | null;
	other_info: string | null;
	created_at: string;
}
