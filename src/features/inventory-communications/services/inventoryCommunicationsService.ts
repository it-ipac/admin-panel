import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "../../../lib/supabase";
import {
	type SendSupplierEmailsInput,
	sendSupplierEmailsInputSchema,
} from "../schemas/emailSchemas";
import type { SendGroupedEmailsResult, SupplierEmailMessage } from "../types";

interface ResendResponse {
	id?: string;
	message?: string;
}

function getServerSupabaseAdmin() {
	const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const serviceRoleKey =
		process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error(
			"Missing SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) server environment variables",
		);
	}

	return createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}

function textToHtml(text: string): string {
	const escaped = text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

	return escaped.replaceAll("\n", "<br />");
}

function parseEmailList(rawValue: string | undefined): string[] | undefined {
	if (!rawValue) {
		return undefined;
	}

	const parsed = rawValue
		.split(",")
		.map((email) => email.trim())
		.filter((email) => email.length > 0);

	return parsed.length > 0 ? parsed : undefined;
}

async function sendWithResend(params: {
	to: string;
	subject: string;
	body: string;
	inReplyToResendEmailId?: string;
}): Promise<string> {
	const resendApiKey = process.env.RESEND_API_KEY;
	const resendFrom = process.env.RESEND_FROM_EMAIL;
	const resendReplyTo = parseEmailList(process.env.RESEND_REPLY_TO_EMAIL);
	const resendCc = parseEmailList(process.env.RESEND_CC_EMAIL);

	if (!resendApiKey || !resendFrom) {
		throw new Error(
			"Missing RESEND_API_KEY or RESEND_FROM_EMAIL server environment variables",
		);
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${resendApiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: resendFrom,
			to: [params.to],
			reply_to: resendReplyTo,
			cc: resendCc,
			subject: params.subject,
			html: textToHtml(params.body),
			headers: params.inReplyToResendEmailId
				? {
						"In-Reply-To": params.inReplyToResendEmailId,
					}
				: undefined,
		}),
	});

	if (!response.ok) {
		const raw = await response.text();
		throw new Error(`Resend failed: ${response.status} ${raw}`);
	}

	const data = (await response.json()) as ResendResponse;
	if (!data.id) {
		throw new Error("Resend did not return an email id");
	}

	return data.id;
}

export const sendSupplierEmails = createServerFn({ method: "POST" })
	.inputValidator(sendSupplierEmailsInputSchema)
	.handler(async ({ data }): Promise<SendGroupedEmailsResult> => {
		const input = data as SendSupplierEmailsInput;
		const adminClient = getServerSupabaseAdmin();

		let successCount = 0;
		let failureCount = 0;
		const errors: string[] = [];

		for (const draft of input.drafts) {
			try {
				const resendEmailId = await sendWithResend({
					to: draft.supplierEmail,
					subject: draft.subject,
					body: draft.body,
					inReplyToResendEmailId: draft.inReplyToResendEmailId,
				});

				const { error: insertError } = await adminClient
					.from("supplier_email_messages")
					.insert({
						supplier_id: draft.supplierId,
						supplier_name: draft.supplierName,
						supplier_email: draft.supplierEmail,
						direction: "outbound",
						reason: draft.reason,
						subject: draft.subject,
						body_text: draft.body,
						resend_email_id: resendEmailId,
						in_reply_to_resend_email_id: draft.inReplyToResendEmailId ?? null,
						related_variant_ids: draft.variantIds,
						status: "sent",
						created_by: input.requesterUserId,
					});

				if (insertError) {
					throw new Error(insertError.message);
				}

				successCount += 1;
			} catch (error) {
				failureCount += 1;
				errors.push(
					`${draft.supplierName} (${draft.supplierEmail}): ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		return {
			successCount,
			failureCount,
			errors,
		};
	});

interface SupplierEmailMessageRow {
	id: string;
	supplier_id: string | null;
	supplier_name: string | null;
	supplier_email: string | null;
	direction: "outbound" | "inbound";
	reason: string | null;
	subject: string | null;
	body_text: string | null;
	resend_email_id: string | null;
	in_reply_to_resend_email_id: string | null;
	status: string | null;
	related_variant_ids: string[] | null;
	created_at: string;
	created_by: string | null;
}

export async function fetchSupplierEmailMessages(): Promise<
	SupplierEmailMessage[]
> {
	const { data, error } = await supabase
		.from("supplier_email_messages")
		.select(
			"id, supplier_id, supplier_name, supplier_email, direction, reason, subject, body_text, resend_email_id, in_reply_to_resend_email_id, status, related_variant_ids, created_at, created_by",
		)
		.order("created_at", { ascending: false })
		.limit(100);

	if (error) {
		if (error.code === "42P01") {
			return [];
		}
		throw new Error(error.message);
	}

	return ((data ?? []) as SupplierEmailMessageRow[]).map((row) => ({
		id: row.id,
		supplierId: row.supplier_id,
		supplierName: row.supplier_name ?? "Unknown supplier",
		supplierEmail: row.supplier_email ?? "",
		direction: row.direction,
		reason: row.reason,
		subject: row.subject ?? "(No subject)",
		bodyText: row.body_text ?? "",
		resendEmailId: row.resend_email_id,
		inReplyToResendEmailId: row.in_reply_to_resend_email_id,
		status: row.status,
		relatedVariantIds: row.related_variant_ids ?? [],
		createdAt: row.created_at,
		createdBy: row.created_by,
	}));
}
