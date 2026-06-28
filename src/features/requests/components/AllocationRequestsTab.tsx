import { ArrowRight, CheckCircle, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
	useApproveAllocationIncrease,
	useRejectAllocationIncrease,
} from "../hooks/useRequestActions";
import { useAllocationIncreaseRequests } from "../hooks/useRequestsQueries";
import type { AllocationIncreaseRequest } from "../types";
import { formatRelativeTime } from "../utils/formatters";
import { ReviewActionModal } from "./ReviewActionModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModalState {
	open: boolean;
	request: AllocationIncreaseRequest | null;
	action: "approve" | "reject";
}

const CLOSED_MODAL: ModalState = {
	open: false,
	request: null,
	action: "approve",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatQty(value: number): string {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(
		value,
	);
}

/** Current per-order allocation expected qty (0 when no allocation row yet). */
function currentExpected(req: AllocationIncreaseRequest): number {
	return req.allocation?.expected_qty ?? 0;
}

function itemLabel(req: AllocationIncreaseRequest): string {
	return req.item?.item_num ?? "Unknown item";
}

function destinationLabel(req: AllocationIncreaseRequest): string {
	const code = req.destination?.code;
	const name = req.destination?.name;
	if (code && name) return `${code} — ${name}`;
	return code ?? name ?? "—";
}

function buildApproveNote(req: AllocationIncreaseRequest): string {
	const current = currentExpected(req);
	const delta = req.requested_delta;
	const resulting = current + delta;
	const masterCurrent = req.items_db?.expected_qty ?? 0;
	const masterResulting = masterCurrent + delta;
	return (
		`New allocation expected = current + delta = ${formatQty(current)} + ` +
		`${formatQty(delta)} = ${formatQty(resulting)}. ` +
		`Item master total → ${formatQty(masterCurrent)} + ${formatQty(delta)} = ` +
		`${formatQty(masterResulting)}.`
	);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AllocationRequestsTab() {
	const { profile } = useAuth();
	const {
		data: requests = [],
		isLoading,
		isError,
	} = useAllocationIncreaseRequests();
	const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);

	const approveMutation = useApproveAllocationIncrease();
	const rejectMutation = useRejectAllocationIncrease();

	function openModal(
		request: AllocationIncreaseRequest,
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
			<div className="flex items-center justify-center py-16 text-neutral-500">
				<Loader2 className="w-5 h-5 animate-spin mr-2" />
				Loading allocation requests…
			</div>
		);
	}

	if (isError) {
		return (
			<div className="py-10 text-center text-danger-600 text-sm">
				Failed to load allocation requests. Please refresh.
			</div>
		);
	}

	if (requests.length === 0) {
		return (
			<div className="py-16 text-center text-neutral-400 text-sm">
				No pending allocation increase requests.
			</div>
		);
	}

	return (
		<>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-neutral-100">
							<th className="text-left py-3 px-4 font-medium text-neutral-500">
								Item
							</th>
							<th className="text-left py-3 px-4 font-medium text-neutral-500">
								Destination
							</th>
							<th className="text-left py-3 px-4 font-medium text-neutral-500">
								Order
							</th>
							<th className="text-right py-3 px-4 font-medium text-neutral-500">
								Requested delta
							</th>
							<th className="text-left py-3 px-4 font-medium text-neutral-500">
								Expected (current → resulting)
							</th>
							<th className="text-left py-3 px-4 font-medium text-neutral-500">
								Requested by
							</th>
							<th className="text-left py-3 px-4 font-medium text-neutral-500">
								Requested
							</th>
							<th className="text-right py-3 px-4 font-medium text-neutral-500">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-neutral-50">
						{requests.map((req) => {
							const current = currentExpected(req);
							const resulting = current + req.requested_delta;
							return (
								<tr
									key={req.id}
									className="hover:bg-neutral-50 transition-colors"
								>
									<td className="py-3 px-4">
										<span className="font-medium text-neutral-900">
											{itemLabel(req)}
										</span>
										{req.item?.description && (
											<p className="text-xs text-neutral-400 mt-0.5 truncate max-w-50">
												{req.item.description}
											</p>
										)}
									</td>
									<td className="py-3 px-4 text-neutral-600 text-xs">
										{destinationLabel(req)}
									</td>
									<td className="py-3 px-4 text-neutral-600 text-xs">
										{req.order?.order_name ?? "—"}
									</td>
									<td className="py-3 px-4 text-right text-neutral-700 tabular-nums font-medium">
										+{formatQty(req.requested_delta)}
									</td>
									<td className="py-3 px-4 text-neutral-700 tabular-nums">
										<span className="inline-flex items-center gap-1.5">
											<span className="text-neutral-500">
												{formatQty(current)}
											</span>
											<ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
											<span className="font-medium text-neutral-900">
												{formatQty(resulting)}
											</span>
										</span>
									</td>
									<td className="py-3 px-4 text-neutral-600">
										{req.requested_by_profile?.full_name ?? "—"}
									</td>
									<td className="py-3 px-4 text-neutral-500 text-xs whitespace-nowrap">
										{formatRelativeTime(req.requested_at)}
									</td>
									<td className="py-3 px-4">
										<div className="flex items-center justify-end gap-2">
											<button
												type="button"
												onClick={() => openModal(req, "approve")}
												className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-success-50 text-success-700 hover:bg-success-100 border border-success-200 transition-colors"
											>
												<CheckCircle className="w-3.5 h-3.5" />
												Approve
											</button>
											<button
												type="button"
												onClick={() => openModal(req, "reject")}
												className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-danger-50 text-danger-700 hover:bg-danger-100 border border-danger-200 transition-colors"
											>
												<XCircle className="w-3.5 h-3.5" />
												Reject
											</button>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{modal.request && (
				<ReviewActionModal
					open={modal.open}
					onClose={closeModal}
					action={modal.action}
					requestType="allocation_increase"
					subjectLabel={`${itemLabel(modal.request)} · +${formatQty(modal.request.requested_delta)} to ${destinationLabel(modal.request)}`}
					contextLine={`Requested by ${modal.request.requested_by_profile?.full_name ?? "unknown"} · ${modal.request.order?.order_name ?? "Unknown order"}${modal.request.reason ? ` · "${modal.request.reason}"` : ""}`}
					approveNote={buildApproveNote(modal.request)}
					isPending={approveMutation.isPending || rejectMutation.isPending}
					onConfirm={handleConfirm}
				/>
			)}
		</>
	);
}
