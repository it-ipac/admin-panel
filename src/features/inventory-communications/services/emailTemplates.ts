import type { SupplierEmailReason, VariantCommunicationItem } from "../types";

export const EMAIL_REASON_LABELS: Record<SupplierEmailReason, string> = {
	price_update: "Price update",
	material_order: "Material order",
	availability_check: "Availability check",
	other: "Other",
};

interface BuildTemplateParams {
	supplierName: string;
	reason: SupplierEmailReason;
	variants: VariantCommunicationItem[];
}

function buildVariantLines(variants: VariantCommunicationItem[]): string {
	return variants
		.map((variant, index) => {
			const dims =
				variant.length || variant.width || variant.thickness
					? ` (${variant.length ?? "—"}×${variant.width ?? "—"}×${variant.thickness ?? "—"})`
					: "";
			return `${index + 1}. ${variant.materialName} - ${variant.variantName}${dims}`;
		})
		.join("\n");
}

export function buildEmailTemplate({
	supplierName,
	reason,
	variants,
}: BuildTemplateParams): { subject: string; body: string } {
	const variantLines = buildVariantLines(variants);

	if (reason === "price_update") {
		return {
			subject: `Price update request for ${variants.length} material(s)`,
			body: `Dear ${supplierName},\n\nPlease share your latest prices for the following materials:\n\n${variantLines}\n\nPlease include MOQ, lead time, and validity period.\n\nThank you.`,
		};
	}

	if (reason === "material_order") {
		return {
			subject: `Order request for ${variants.length} material(s)`,
			body: `Dear ${supplierName},\n\nWe would like to place an order for the following materials:\n\n${variantLines}\n\nPlease confirm availability, lead time, and delivery details.\n\nThank you.`,
		};
	}

	if (reason === "availability_check") {
		return {
			subject: `Availability check for ${variants.length} material(s)`,
			body: `Dear ${supplierName},\n\nCould you please confirm current availability for the following materials:\n\n${variantLines}\n\nPlease include expected replenishment timelines if any item is out of stock.\n\nThank you.`,
		};
	}

	return {
		subject: `Request regarding ${variants.length} material(s)`,
		body: `Dear ${supplierName},\n\nPlease review the following materials:\n\n${variantLines}\n\nPlease reply with the required details.\n\nThank you.`,
	};
}
