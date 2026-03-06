import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import type { SupplierPricingRequestWithBlockedState } from "../types";
import {
	useApprovePricingRequest,
	useRejectPricingRequest,
} from "../hooks/useRequestActions";
import { usePricingRequests } from "../hooks/useRequestsQueries";
import { buildContextLabel, formatRelativeTime } from "../utils/formatters";
import { ReviewActionModal } from "./ReviewActionModal";
import { StatusBadge } from "./StatusBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModalState {
	open: boolean;
	request: SupplierPricingRequestWithBlockedState | null;
	action: "approve" | "reject";
}

const CLOSED_MODAL: ModalState = {
	open: false,
	request: null,
	action: "approve",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPricingSummary(
	req: SupplierPricingRequestWithBlockedState,
): string {
	const variantName = req.variant?.variant_name ?? req.parent_variant_request?.variant_name ?? "Pending variant";
	const materialName = req.variant?.material?.name ?? "New material";
	const supplierName = req.supplier?.name ?? "Unknown supplier";
	return `${variantName} (${materialName}) — ${supplierName}`;
}

function formatCurrency(value: number): string {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
	}).format(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PricingRequestsTab() {
	const { profile } = useAuth();
	const { data: requests = [], isLoading, isError } = usePricingRequests();
	const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);

	const approveMutation = useApprovePricingRequest();
	const rejectMutation = useRejectPricingRequest();

	function openModal(
		request: SupplierPricingRequestWithBlockedState,
		action: "approve" | "reject",
	) {
		setModal({ open: true, request, action });
	}

	function closeModal() {
		setModal(CLOSED_MODAL);
	}

	function handleConfirm(adminNotes: string | null) {
		if (!modal.request || !profile?.id) return;

		const params = {
			requestId: modal.request.id,
			reviewedBy: profile.id,
			adminNotes,
		};

		const mutation =
			modal.action === "approve" ? approveMutation : rejectMutation;

		mutation.mutate(params, { onSuccess: closeModal });
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16 text-gray-500">
				<Loader2 className="w-5 h-5 animate-spin mr-2" />
				Loading pricing requests…
			</div>
		);
	}

	if (isError) {
		return (
			<div className="py-10 text-center text-red-600 text-sm">
				Failed to load pricing requests. Please refresh.
			</div>
		);
	}

	if (requests.length === 0) {
		return (
			<div className="py-16 text-center text-gray-400 text-sm">
				No pending pricing requests.
			</div>
		);
	}

	return (
		<>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-100">
							<th className="text-left py-3 px-4 font-medium text-gray-500">
								Pricing
							</th>
							<th className="text-left py-3 px-4 font-medium text-gray-500">
								Price / unit
							</th>
							<th className="text-left py-3 px-4 font-medium text-gray-500">
								Requested by
							</th>
							<th className="text-left py-3 px-4 font-medium text-gray-500">
								Order / Package
							</th>
							<th className="text-left py-3 px-4 font-medium text-gray-500">
								Requested
							</th>
							<th className="text-left py-3 px-4 font-medium text-gray-500">
								Status
							</th>
							<th className="text-right py-3 px-4 font-medium text-gray-500">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-50">
						{requests.map((req) => (
							<tr key={req.id} className="hover:bg-gray-50 transition-colors">
								<td className="py-3 px-4">
									<span className="font-medium text-gray-900">
										{req.variant?.variant_name ??
											req.parent_variant_request?.variant_name ??
											"New variant"}
									</span>
									<p className="text-xs text-gray-400 mt-0.5">
										{req.variant?.material?.name ?? "New material"} ·{" "}
										{req.supplier?.name ?? "Unknown supplier"}
									</p>
									{req.suppliers_reference && (
										<p className="text-xs text-gray-400 mt-0.5 font-mono">
											Ref: {req.suppliers_reference}
										</p>
									)}
								</td>
								<td className="py-3 px-4 text-gray-700 tabular-nums">
									{formatCurrency(req.price_per_unit)}
								</td>
								<td className="py-3 px-4 text-gray-600">
									{req.requested_by_profile?.full_name ?? "—"}
								</td>
								<td className="py-3 px-4 text-gray-600 text-xs">
									{buildContextLabel(req.order_package)}
								</td>
								<td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
									{formatRelativeTime(req.requested_at)}
								</td>
								<td className="py-3 px-4">
									<StatusBadge
										isBlocked={req.isBlocked}
										parentLabel={
											req.parent_variant_request?.variant_name ?? undefined
										}
									/>
								</td>
								<td className="py-3 px-4">
									{req.isBlocked ? (
										<p className="text-right text-xs text-gray-400">
											Approve variant first
										</p>
									) : (
										<div className="flex items-center justify-end gap-2">
											<button
												type="button"
												onClick={() => openModal(req, "approve")}
												className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
											>
												<CheckCircle className="w-3.5 h-3.5" />
												Approve
											</button>
											<button
												type="button"
												onClick={() => openModal(req, "reject")}
												className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
											>
												<XCircle className="w-3.5 h-3.5" />
												Reject
											</button>
										</div>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{modal.request && (
				<ReviewActionModal
					open={modal.open}
					onClose={closeModal}
					action={modal.action}
					requestType="supplier_pricing"
					subjectLabel={buildPricingSummary(modal.request)}
					contextLine={`Requested by ${modal.request.requested_by_profile?.full_name ?? "unknown"} · ${buildContextLabel(modal.request.order_package)}`}
					isPending={approveMutation.isPending || rejectMutation.isPending}
					onConfirm={handleConfirm}
				/>
			)}
		</>
	);
}
