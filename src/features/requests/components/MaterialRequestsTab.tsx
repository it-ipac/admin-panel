import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import type { MaterialRequest } from "../types";
import {
	useApproveMaterialRequest,
	useRejectMaterialRequest,
} from "../hooks/useRequestActions";
import {
	useMaterialRejectionImpact,
	useMaterialRequests,
} from "../hooks/useRequestsQueries";
import { buildContextLabel, formatRelativeTime } from "../utils/formatters";
import { ReviewActionModal } from "./ReviewActionModal";
import { StatusBadge } from "./StatusBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModalState {
	open: boolean;
	request: MaterialRequest | null;
	action: "approve" | "reject";
}

const CLOSED_MODAL: ModalState = { open: false, request: null, action: "approve" };

// ─── Component ────────────────────────────────────────────────────────────────

export function MaterialRequestsTab() {
	const { profile } = useAuth();
	const { data: requests = [], isLoading, isError } = useMaterialRequests();
	const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);

	const approveMutation = useApproveMaterialRequest();
	const rejectMutation = useRejectMaterialRequest();

	const isRejectOpen =
		modal.open && modal.action === "reject" && modal.request !== null;

	const { data: rejectionImpact, isLoading: isLoadingImpact } =
		useMaterialRejectionImpact(
			modal.request?.id ?? null,
			isRejectOpen,
		);

	function openModal(request: MaterialRequest, action: "approve" | "reject") {
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
				Loading material requests…
			</div>
		);
	}

	if (isError) {
		return (
			<div className="py-10 text-center text-red-600 text-sm">
				Failed to load material requests. Please refresh.
			</div>
		);
	}

	if (requests.length === 0) {
		return (
			<div className="py-16 text-center text-gray-400 text-sm">
				No pending material requests.
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
								Material name
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
									<span className="font-medium text-gray-900">{req.name}</span>
									{req.description && (
										<p className="text-xs text-gray-400 mt-0.5 truncate max-w-50">
											{req.description}
										</p>
									)}
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
									<StatusBadge isBlocked={false} />
								</td>
								<td className="py-3 px-4">
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
					requestType="material"
					subjectLabel={modal.request.name}
					contextLine={`Requested by ${modal.request.requested_by_profile?.full_name ?? "unknown"} · ${buildContextLabel(modal.request.order_package)}`}
					rejectionImpact={isRejectOpen ? (rejectionImpact ?? null) : null}
					isLoadingImpact={isRejectOpen && isLoadingImpact}
					isPending={approveMutation.isPending || rejectMutation.isPending}
					onConfirm={handleConfirm}
				/>
			)}
		</>
	);
}
