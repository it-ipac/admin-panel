export type SupplierEmailReason =
	| "price_update"
	| "material_order"
	| "availability_check"
	| "other";

export interface VariantSupplierOption {
	pricingId: string;
	supplierId: string;
	supplierName: string;
	supplierEmail: string | null;
	pricePerUnit: number | null;
	price: number | null;
	supplierQuantity: number | null;
}

export interface VariantCommunicationItem {
	variantId: string;
	variantName: string;
	materialName: string;
	description: string | null;
	unitName: string | null;
	length: number | null;
	width: number | null;
	thickness: number | null;
	suppliers: VariantSupplierOption[];
}

export interface GroupedSupplierEmailDraft {
	supplierId: string;
	supplierName: string;
	supplierEmail: string;
	reason: SupplierEmailReason;
	subject: string;
	body: string;
	variantIds: string[];
	variantSummaries: string[];
	inReplyToResendEmailId?: string;
}

export interface SupplierEmailMessage {
	id: string;
	supplierId: string | null;
	supplierName: string;
	supplierEmail: string;
	direction: "outbound" | "inbound";
	reason: string | null;
	subject: string;
	bodyText: string;
	resendEmailId: string | null;
	inReplyToResendEmailId: string | null;
	status: string | null;
	relatedVariantIds: string[];
	createdAt: string;
	createdBy: string | null;
}

export interface SendGroupedEmailsResult {
	successCount: number;
	failureCount: number;
	errors: string[];
}
