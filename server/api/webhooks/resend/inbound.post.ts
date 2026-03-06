import { createClient } from "@supabase/supabase-js";
import {
	defineEventHandler,
	getHeader,
	readRawBody,
	setResponseStatus,
} from "h3";
import { Webhook } from "svix";

interface ResendInboundPayload {
	type?: string;
	created_at?: string;
	data?: {
		email_id?: string;
		from?: string;
		to?: string[];
		subject?: string;
		text?: string;
		html?: string;
		headers?: Record<string, string | undefined>;
	};
}

interface SupplierRow {
	id: string;
	name: string;
	email: string | null;
}

function getOptionalHeader(headers: Record<string, string>, key: string): string {
	const value = headers[key];
	if (!value) {
		throw new Error(`Missing required webhook header: ${key}`);
	}
	return value;
}

function parseEmailAddress(raw: string | undefined): string | null {
	if (!raw) {
		return null;
	}

	const bracketMatch = raw.match(/<([^>]+)>/);
	if (bracketMatch?.[1]) {
		return bracketMatch[1].trim().toLowerCase();
	}

	const trimmed = raw.trim().toLowerCase();
	if (!trimmed.includes("@")) {
		return null;
	}

	return trimmed;
}

function extractInReplyTo(headers: Record<string, string | undefined> | undefined): string | null {
	if (!headers) {
		return null;
	}

	const direct = headers["in-reply-to"] ?? headers["In-Reply-To"];
	if (!direct) {
		return null;
	}

	return direct.replace(/[<>]/g, "").trim() || null;
}

function safeParsePayload(rawBody: string): ResendInboundPayload {
	const parsed = JSON.parse(rawBody) as unknown;
	if (!parsed || typeof parsed !== "object") {
		return {};
	}
	return parsed as ResendInboundPayload;
}

export default defineEventHandler(async (event) => {
	const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const supabaseServiceRoleKey =
		process.env.SUPABASE_SECRET_KEY ||
		process.env.SUPABASE_SERVICE_ROLE_KEY;
	const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;

	if (!supabaseUrl || !supabaseServiceRoleKey || !webhookSecret) {
		setResponseStatus(event, 500);
		return {
			ok: false,
			error:
				"Missing SUPABASE_URL/VITE_SUPABASE_URL, SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY), or RESEND_INBOUND_WEBHOOK_SECRET",
		};
	}

	const body = await readRawBody(event);
	if (!body) {
		setResponseStatus(event, 400);
		return { ok: false, error: "Empty request body" };
	}

	const svixHeaders = {
		"svix-id": getHeader(event, "svix-id") ?? "",
		"svix-timestamp": getHeader(event, "svix-timestamp") ?? "",
		"svix-signature": getHeader(event, "svix-signature") ?? "",
	};

	try {
		const webhook = new Webhook(webhookSecret);
		webhook.verify(body, {
			"svix-id": getOptionalHeader(svixHeaders, "svix-id"),
			"svix-timestamp": getOptionalHeader(svixHeaders, "svix-timestamp"),
			"svix-signature": getOptionalHeader(svixHeaders, "svix-signature"),
		});
	} catch {
		setResponseStatus(event, 401);
		return { ok: false, error: "Invalid webhook signature" };
	}

	let payload: ResendInboundPayload;
	try {
		payload = safeParsePayload(body);
	} catch {
		setResponseStatus(event, 400);
		return { ok: false, error: "Invalid JSON payload" };
	}

	if (payload.type && payload.type !== "email.received") {
		return { ok: true, ignored: true, reason: `Unhandled event type: ${payload.type}` };
	}

	const inbound = payload.data;
	if (!inbound) {
		setResponseStatus(event, 400);
		return { ok: false, error: "Missing payload.data" };
	}

	const fromEmail = parseEmailAddress(inbound.from);
	if (!fromEmail) {
		setResponseStatus(event, 400);
		return { ok: false, error: "Could not parse sender email" };
	}

	const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});

	const { data: supplierData, error: supplierError } = await supabaseAdmin
		.from("suppliers")
		.select("id, name, email")
		.eq("email", fromEmail)
		.maybeSingle();

	if (supplierError) {
		setResponseStatus(event, 500);
		return { ok: false, error: supplierError.message };
	}

	const supplier = (supplierData as SupplierRow | null) ?? null;
	const inReplyToResendEmailId = extractInReplyTo(inbound.headers);

	const subject = inbound.subject?.trim() || "(No subject)";
	const bodyText = inbound.text?.trim() || inbound.html?.trim() || "";
	const resendEmailId = inbound.email_id ?? null;

	if (resendEmailId) {
		const { data: existingRow, error: existingError } = await supabaseAdmin
			.from("supplier_email_messages")
			.select("id")
			.eq("resend_email_id", resendEmailId)
			.maybeSingle();

		if (existingError) {
			setResponseStatus(event, 500);
			return { ok: false, error: existingError.message };
		}

		if (existingRow) {
			return {
				ok: true,
				received: true,
				deduplicated: true,
				resendEmailId,
			};
		}
	}

	const { error: insertError } = await supabaseAdmin
		.from("supplier_email_messages")
		.insert({
			supplier_id: supplier?.id ?? null,
			supplier_name: supplier?.name ?? fromEmail,
			supplier_email: fromEmail,
			direction: "inbound",
			reason: null,
			subject,
			body_text: bodyText,
			resend_email_id: resendEmailId,
			in_reply_to_resend_email_id: inReplyToResendEmailId,
			related_variant_ids: [],
			status: "received",
			created_by: null,
		});

	if (insertError) {
		if (insertError.code === "23505") {
			return {
				ok: true,
				received: true,
				deduplicated: true,
				resendEmailId,
			};
		}

		setResponseStatus(event, 500);
		return { ok: false, error: insertError.message };
	}

	return {
		ok: true,
		received: true,
		supplierMatched: Boolean(supplier),
		fromEmail,
		replyTo: inReplyToResendEmailId,
	};
});
