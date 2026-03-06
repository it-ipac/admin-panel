import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "../../../lib/cn";
import { useAuditLog } from "../hooks/useRequestsQueries";
import type { RequestAuditLog, RequestType } from "../types";
import { buildContextLabel, formatDateTime } from "../utils/formatters";
import { ActionBadge, RequestTypeBadge } from "./StatusBadge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractSnapshotLabel(
	requestType: RequestType,
	snapshot: Record<string, unknown>,
): string {
	if (requestType === "material") {
		return typeof snapshot.name === "string" ? snapshot.name : "—";
	}
	if (requestType === "material_variant") {
		return typeof snapshot.variant_name === "string"
			? snapshot.variant_name
			: "—";
	}
	if (requestType === "supplier_pricing") {
		const variant =
			typeof snapshot.variant_name === "string" ? snapshot.variant_name : null;
		const supplier =
			typeof snapshot.supplier_name === "string"
				? snapshot.supplier_name
				: null;
		if (variant && supplier) return `${variant} — ${supplier}`;
		if (variant) return variant;
		return "Pricing entry";
	}
	return "—";
}

function buildResultingLink(
	requestType: RequestType,
	resultingId: string,
): string {
	// These paths are aspirational — update when the detail pages exist.
	const basePathMap: Record<RequestType, string> = {
		material: "/inventory",
		material_variant: "/inventory",
		supplier_pricing: "/inventory",
	};
	return `${basePathMap[requestType]}?highlight=${resultingId}`;
}

// ─── Row component (extracted for readability) ────────────────────────────────

function AuditLogRow({ row }: { row: RequestAuditLog }) {
	const snapshotLabel = extractSnapshotLabel(
		row.request_type,
		row.request_snapshot,
	);
	const hasResultingLink =
		row.action === "approved" && row.resulting_id !== null;

	return (
		<tr className="hover:bg-gray-50 transition-colors">
			<td className="py-3 px-4">
				<RequestTypeBadge type={row.request_type} />
			</td>
			<td className="py-3 px-4">
				<ActionBadge action={row.action} />
			</td>
			<td className="py-3 px-4">
				<span className="font-medium text-gray-900 text-sm">
					{snapshotLabel}
				</span>
			</td>
			<td className="py-3 px-4 text-gray-600 text-sm">
				{row.requested_by_profile?.full_name ?? "—"}
			</td>
			<td className="py-3 px-4 text-gray-600 text-sm">
				{row.reviewed_by_profile?.full_name ?? "—"}
			</td>
			<td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
				{formatDateTime(row.reviewed_at)}
			</td>
			<td className="py-3 px-4 text-gray-600 text-xs">
				{buildContextLabel(row.order_package)}
			</td>
			<td className="py-3 px-4 text-xs text-gray-500 max-w-50">
				{row.admin_notes ? (
					<span className="italic">{row.admin_notes}</span>
				) : (
					<span className="text-gray-300">—</span>
				)}
			</td>
			<td className="py-3 px-4 text-right">
				{hasResultingLink ? (
					<a
						href={buildResultingLink(row.request_type, row.resulting_id!)}
						className={cn(
							"inline-flex items-center gap-1 text-xs text-blue-600 hover:underline",
						)}
					>
						View <ExternalLink className="w-3 h-3" />
					</a>
				) : (
					<span className="text-gray-300 text-xs">—</span>
				)}
			</td>
		</tr>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuditLogTab() {
	const { data: logs = [], isLoading, isError } = useAuditLog();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16 text-gray-500">
				<Loader2 className="w-5 h-5 animate-spin mr-2" />
				Loading history…
			</div>
		);
	}

	if (isError) {
		return (
			<div className="py-10 text-center text-red-600 text-sm">
				Failed to load audit log. Please refresh.
			</div>
		);
	}

	if (logs.length === 0) {
		return (
			<div className="py-16 text-center text-gray-400 text-sm">
				No review history yet.
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-gray-100">
						<th className="text-left py-3 px-4 font-medium text-gray-500">
							Type
						</th>
						<th className="text-left py-3 px-4 font-medium text-gray-500">
							Action
						</th>
						<th className="text-left py-3 px-4 font-medium text-gray-500">
							What
						</th>
						<th className="text-left py-3 px-4 font-medium text-gray-500">
							Requested by
						</th>
						<th className="text-left py-3 px-4 font-medium text-gray-500">
							Reviewed by
						</th>
						<th className="text-left py-3 px-4 font-medium text-gray-500">
							Reviewed at
						</th>
						<th className="text-left py-3 px-4 font-medium text-gray-500">
							Context
						</th>
						<th className="text-left py-3 px-4 font-medium text-gray-500">
							Notes
						</th>
						<th className="text-right py-3 px-4 font-medium text-gray-500">
							Result
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-50">
					{logs.map((row) => (
						<AuditLogRow key={row.id} row={row} />
					))}
				</tbody>
			</table>
		</div>
	);
}
