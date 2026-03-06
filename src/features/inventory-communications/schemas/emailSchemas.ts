import { z } from "zod";

export const supplierEmailReasonSchema = z.enum([
	"price_update",
	"material_order",
	"availability_check",
	"other",
]);

export const sendSupplierEmailDraftSchema = z.object({
	supplierId: z.string().min(1),
	supplierName: z.string().min(1),
	supplierEmail: z.email(),
	reason: supplierEmailReasonSchema,
	subject: z.string().min(1).max(300),
	body: z.string().min(1).max(20000),
	variantIds: z.array(z.string().min(1)).min(1),
	variantSummaries: z.array(z.string().min(1)).min(1),
	inReplyToResendEmailId: z.string().min(1).optional(),
});

export const sendSupplierEmailsInputSchema = z.object({
	requesterUserId: z.string().min(1),
	drafts: z.array(sendSupplierEmailDraftSchema).min(1),
});

export type SendSupplierEmailsInput = z.infer<typeof sendSupplierEmailsInputSchema>;
