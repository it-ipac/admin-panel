/**
 * OrderAllocationRequestsSection
 *
 * Sidebar section on the order detail page showing pending allocation-increase
 * requests scoped to this order. Admins can Approve, Reject, or Edit (grant a
 * custom amount) each request inline.
 *
 * Container-Presenter note: this presenter owns its own hooks (per-project
 * convention for sidebar cards that are self-contained). The query is
 * per-order so it does not pollute the global requests cache.
 */

import {
	ArrowRight,
	CheckCircle,
	Loader2,
	Pencil,
	X,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { ReviewActionModal } from "../../../../features/requests/components/ReviewActionModal";
import {
	useApproveAllocationIncrease,
	useRejectAllocationIncrease,
} from "../../../../features/requests/hooks/useRequestActions";
import { useOrderAllocationIncreaseRequests } from "../../../../features/requests/hooks/useRequestsQueries";
import type { AllocationIncreaseRequest } from "../../../../features/requests/types";
import { useAuth } from "../../../../hooks/useAuth";
import { useToast } from "../../../../hooks/useToast";
import { db } from "../../../../lib/supabase";

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrderAllocationRequestsSectionProps {
	orderId: string;
	canReview: boolean;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModalState {
	open: boolean;
	request: AllocationIncreaseRequest | null;
	action: "approve" | "reject";
}

interface EditState {
	requestId: string;
	allocationId: string;
	requestedDelta: number;
	currentExpected: number;
	/** Controlled value in the inline number input */
	newExpected: number;
	isPending: boolean;
}

const CLOSED_MODAL: ModalState = {
	open: false,
	request: null,
	action: "approve",
};

// ─── Shared helpers (mirrors AllocationRequestsTab.tsx) ───────────────────────

function formatQty(value: number): string {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(
		value,
	);
}

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

export function OrderAllocationRequestsSection({
	orderId,
	canReview,
}: OrderAllocationRequestsSectionProps): React.ReactElement {
	const { profile } = useAuth();
	const toast = useToast();

	const {
		data: requests = [],
		isLoading,
		isError,
	} = useOrderAllocationIncreaseRequests(orderId);

	const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);
	const [editState, setEditState] = useState<EditState | null>(null);

	const approveMutation = useApproveAllocationIncrease(orderId);
	const rejectMutation = useRejectAllocationIncrease(orderId);

	function openModal(
		request: AllocationIncreaseRequest,
		action: "approve" | "reject",
	): void {
		setModal({ open: true, request, action });
	}

	function closeModal(): void {
		setModal(CLOSED_MODAL);
	}

	function handleConfirm(adminNotes: string | null): void {
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

	function openEdit(req: AllocationIncreaseRequest): void {
		if (!req.allocation?.id) return;
		setEditState({
			requestId: req.id,
			allocationId: req.allocation.id,
			requestedDelta: req.requested_delta,
			currentExpected: currentExpected(req),
			newExpected: currentExpected(req) + req.requested_delta,
			isPending: false,
		});
	}

	function closeEdit(): void {
		setEditState(null);
	}

	async function handleEditSubmit(): Promise<void> {
		if (!editState || !profile?.id) return;
		setEditState((s) => s && { ...s, isPending: true });
		try {
			const { error } = await db.setAllocationExpected(
				editState.allocationId,
				editState.newExpected,
			);
			if (error) throw new Error(String(error.message ?? error));

			// Clear the request with a descriptive admin note
			const note = `Edited & granted ${formatQty(editState.newExpected)} (requested +${formatQty(editState.requestedDelta)}, was ${formatQty(editState.currentExpected)})`;
			rejectMutation.mutate(
				{
					requestId: editState.requestId,
					reviewedBy: profile.id,
					adminNotes: note,
				},
				{
					onSuccess: () => {
						toast.success({
							title: "Allocation edited.",
							description: `Set to ${formatQty(editState.newExpected)} and request cleared.`,
						});
						closeEdit();
					},
					onError: (err: Error) => {
						toast.error({
							title: "Failed to clear request",
							description: err.message,
						});
						setEditState((s) => s && { ...s, isPending: false });
					},
				},
			);
		} catch (err) {
			toast.error({
				title: "Failed to set allocation",
				description: err instanceof Error ? err.message : "Unknown error",
			});
			setEditState((s) => s && { ...s, isPending: false });
		}
	}

	return (
		<div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-5">
			{/* Header */}
			<div className="mb-3">
				<h2 className="text-sm font-semibold text-neutral-900">
					Allocation increase requests
				</h2>
				<p className="text-xs text-neutral-500 mt-0.5">
					Pending requests from packers for this order.
				</p>
			</div>

			{/* Body */}
			{isLoading && (
				<div className="flex items-center gap-2 py-6 justify-center text-neutral-400 text-sm">
					<Loader2 className="w-4 h-4 animate-spin" />
					Loading…
				</div>
			)}

			{isError && (
				<p className="py-6 text-center text-danger-600 text-xs">
					Failed to load requests. Please refresh.
				</p>
			)}

			{!isLoading && !isError && requests.length === 0 && (
				<p className="py-6 text-center text-neutral-400 text-xs">
					No pending allocation requests.
				</p>
			)}

			{!isLoading && !isError && requests.length > 0 && (
				<div className="max-h-96 overflow-auto rounded-md border border-neutral-100">
					<table className="w-full text-xs">
						<thead className="sticky top-0 bg-neutral-50 z-10">
							<tr className="border-b border-neutral-200">
								<th className="text-left py-2 px-3 font-medium text-neutral-500 whitespace-nowrap">
									Item
								</th>
								<th className="text-left py-2 px-3 font-medium text-neutral-500 whitespace-nowrap">
									Destination
								</th>
								<th className="text-left py-2 px-3 font-medium text-neutral-500 whitespace-nowrap">
									Requested by
								</th>
								<th className="text-left py-2 px-3 font-medium text-neutral-500 whitespace-nowrap">
									Current → Resulting
								</th>
								<th className="text-right py-2 px-3 font-medium text-neutral-500 whitespace-nowrap">
									Delta
								</th>
								<th className="text-left py-2 px-3 font-medium text-neutral-500">
									Reason
								</th>
								{canReview && (
									<th className="text-right py-2 px-3 font-medium text-neutral-500">
										Actions
									</th>
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-50">
							{requests.map((req) => {
								const current = currentExpected(req);
								const resulting = current + req.requested_delta;
								const isEditing = editState?.requestId === req.id;

								return (
									<tr
										key={req.id}
										className="hover:bg-neutral-50 transition-colors"
									>
										<td className="py-2 px-3">
											<span className="font-medium text-neutral-900">
												{itemLabel(req)}
											</span>
											{req.item?.description && (
												<p className="text-neutral-400 mt-0.5 truncate max-w-32">
													{req.item.description}
												</p>
											)}
										</td>
										<td className="py-2 px-3 text-neutral-600 whitespace-nowrap">
											{req.destination?.code ?? "—"}
										</td>
										<td className="py-2 px-3 text-neutral-600 whitespace-nowrap">
											{req.requested_by_profile?.full_name ?? "—"}
										</td>
										<td className="py-2 px-3 text-neutral-700 tabular-nums whitespace-nowrap">
											<span className="inline-flex items-center gap-1">
												<span className="text-neutral-500">
													{formatQty(current)}
												</span>
												<ArrowRight className="w-3 h-3 text-neutral-400" />
												<span className="font-medium text-neutral-900">
													{formatQty(resulting)}
												</span>
											</span>
										</td>
										<td className="py-2 px-3 text-right font-medium text-neutral-700 tabular-nums whitespace-nowrap">
											+{formatQty(req.requested_delta)}
										</td>
										<td className="py-2 px-3 text-neutral-500 max-w-40 truncate">
											{req.reason ?? (
												<span className="text-neutral-300">—</span>
											)}
										</td>
										{canReview && (
											<td className="py-2 px-3">
												{isEditing && editState ? (
													/* Inline edit row */
													<div className="flex items-center gap-1.5 justify-end">
														<input
															type="number"
															step="any"
															min={0}
															value={editState.newExpected}
															onChange={(e) => {
																setEditState((s) =>
																	s
																		? {
																				...s,
																				newExpected: Number(e.target.value),
																			}
																		: s,
																);
															}}
															disabled={editState.isPending}
															className="w-20 rounded border border-neutral-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:opacity-50"
															title="New expected allocation"
														/>
														<button
															type="button"
															onClick={handleEditSubmit}
															disabled={editState.isPending}
															className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-success-50 text-success-700 hover:bg-success-100 border border-success-200 disabled:opacity-50"
															title="Confirm edit"
														>
															{editState.isPending ? (
																<Loader2 className="w-3 h-3 animate-spin" />
															) : (
																<CheckCircle className="w-3 h-3" />
															)}
															Set
														</button>
														<button
															type="button"
															onClick={closeEdit}
															disabled={editState.isPending}
															className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200 disabled:opacity-50"
															title="Cancel edit"
														>
															<X className="w-3 h-3" />
														</button>
													</div>
												) : (
													<div className="flex items-center gap-1 justify-end">
														<button
															type="button"
															onClick={() => openModal(req, "approve")}
															disabled={
																approveMutation.isPending ||
																rejectMutation.isPending
															}
															className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium bg-success-50 text-success-700 hover:bg-success-100 border border-success-200 disabled:opacity-50 transition-colors"
														>
															<CheckCircle className="w-3 h-3" />
															Approve
														</button>
														<button
															type="button"
															onClick={() => openModal(req, "reject")}
															disabled={
																approveMutation.isPending ||
																rejectMutation.isPending
															}
															className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium bg-danger-50 text-danger-700 hover:bg-danger-100 border border-danger-200 disabled:opacity-50 transition-colors"
														>
															<XCircle className="w-3 h-3" />
															Reject
														</button>
														{req.allocation?.id && (
															<button
																type="button"
																onClick={() => openEdit(req)}
																disabled={
																	approveMutation.isPending ||
																	rejectMutation.isPending
																}
																className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium bg-iris-50 text-iris-700 hover:bg-iris-100 border border-iris-200 disabled:opacity-50 transition-colors"
															>
																<Pencil className="w-3 h-3" />
																Edit
															</button>
														)}
													</div>
												)}
											</td>
										)}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{/* Review modal (approve / reject) */}
			{modal.request && (
				<ReviewActionModal
					open={modal.open}
					onClose={closeModal}
					action={modal.action}
					requestType="allocation_increase"
					subjectLabel={`${itemLabel(modal.request)} · +${formatQty(modal.request.requested_delta)} to ${destinationLabel(modal.request)}`}
					contextLine={`Requested by ${modal.request.requested_by_profile?.full_name ?? "unknown"}${modal.request.reason ? ` · "${modal.request.reason}"` : ""}`}
					approveNote={buildApproveNote(modal.request)}
					isPending={approveMutation.isPending || rejectMutation.isPending}
					onConfirm={handleConfirm}
				/>
			)}
		</div>
	);
}
