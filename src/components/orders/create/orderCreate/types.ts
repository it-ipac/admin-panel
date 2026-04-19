export interface OrderCreateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export interface ClientOption {
	id: string;
	name: string;
	contact_person: string | null;
	email: string | null;
	phone: string | null;
	address: string | null;
}

export interface OrderCategoryOption {
	id: string;
	label: string;
	tags: string[];
}

export interface PackingTypeOption {
	id: string;
	code: string | null;
	name: string | null;
}

export interface SeiCategoryOption {
	id: number;
	code: number | null;
	name: string | null;
	description?: string | null;
}

export interface SeiProtectionOption {
	id: number;
	code: string | null;
	name: string | null;
	description?: string | null;
}

export interface BoxTypeOption {
	id: string;
	name: string | null;
}

export interface MaterialVariantOption {
	id: string;
	variant_name: string | null;
	width?: number | null;
	thickness?: number | null;
	unit?:
		| { id: string; name: string | null }
		| Array<{ id: string; name: string | null }>
		| null;
}

export type ExcelTemplateMode = "auto" | "legacy" | "v54plus";

export type AppliedExcelTemplateMode = Exclude<ExcelTemplateMode, "auto">;

export interface RawManufacturingBar {
	quantity: number | null;
	typeLabel: string | null;
	width: number | null;
	thickness: number | null;
	space: number | null;
}

export interface RawManufacturingTemplate {
	quantity: number | null;
	typeLabel: string | null;
	thickness: number | null;
	horizontal: RawManufacturingBar;
	vertical: RawManufacturingBar;
}

export interface RawBaseManufacturing extends RawManufacturingTemplate {
	skids: RawManufacturingBar;
}

export interface RawPackageRow {
	rowIndex: number;
	packageNumber: number;
	designation: string;
	quantity: number | null;
	item_length: number | null;
	item_width: number | null;
	item_height: number | null;
	internal_length: number | null;
	internal_width: number | null;
	internal_height: number | null;
	external_length: number | null;
	external_width: number | null;
	external_height: number | null;
	net_weight: number | null;
	tare: number | null;
	gross_weight: number | null;
	boxTypeLabel: string | null;
	packingTypeRaw: string | null;
	packingTypeCode: string | null;
	seiCategoryRaw: string | null;
	seiProtectionRaw: string | null;
	manufacturing: {
		big: RawManufacturingTemplate;
		small: RawManufacturingTemplate;
		lid: RawManufacturingTemplate;
		base: RawBaseManufacturing;
	};
	securing: Array<{
		typeLabel: string | null;
		quantity: number | null;
		width: number | null;
		thickness: number | null;
	}>;
	accessories: Array<{
		typeLabel: string | null;
		amount: number | null;
	}>;
}

export interface ResolvedPackageRow {
	packageNumber: number;
	designation: string;
	quantity: number | null;
	item_length: number | null;
	item_width: number | null;
	item_height: number | null;
	box_type_id: string | null;
	packing_type_id: string | null;
	sei_category: number | null;
	sei_protection: number | null;
	internal_length: number | null;
	internal_width: number | null;
	internal_height: number | null;
	external_length: number | null;
	external_width: number | null;
	external_height: number | null;
	net_weight: number | null;
	tare: number | null;
	gross_weight: number | null;
	manufacturing: any;
	securing: Array<{
		typeId: string | null;
		quantity: number | null;
		width: number | null;
		thickness: number | null;
		typeLabel: string | null;
	}>;
	accessories: Array<{
		typeId: string | null;
		amount: number | null;
		typeLabel: string | null;
	}>;
}

export const WOOD_OUT_OF_RANGE_ID = "c69cd6d0-d56f-441a-951c-6560d3b34d70";

export const INITIAL_CLIENT = {
	name: "",
	contact_person: "",
	email: "",
	phone: "",
	address: "",
};

export type PackageEditableField =
	| "quantity"
	| "designation"
	| "boxTypeLabel"
	| "packingTypeRaw"
	| "item.length"
	| "item.width"
	| "item.height"
	| "internal.length"
	| "internal.width"
	| "internal.height"
	| "external.length"
	| "external.width"
	| "external.height"
	| "netWeight"
	| "tare";
