import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "../../../lib/cn";
import type { MaterialRejectionImpact, RequestType } from "../types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReviewActionModalProps {
	open: boolean;
	onClose: () => void;
	action: "approve" | "reject";
	requestType: RequestType;
	/** Short label shown as the dialog title subject (e.g. material name) */
	subjectLabel: string;
	/** Short contextual line (packer name, order/package) */
	contextLine: string;
	/** Populated for reject_material to show cascade warning */
	rejectionImpact?: MaterialRejectionImpact | null;
	isLoadingImpact?: boolean;
	isPending: boolean;
	onConfirm: (adminNotes: string | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
	material: "material",
	material_variant: "variant",
	supplier_pricing: "pricing",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewActionModal({
	open,
	onClose,
	action,
	requestType,
	subjectLabel,
	contextLine,
	rejectionImpact,
	isLoadingImpact,
	isPending,
	onConfirm,
}: ReviewActionModalProps) {
	const [adminNotes, setAdminNotes] = useState("");

	const isApprove = action === "approve";
	const typeLabel = REQUEST_TYPE_LABELS[requestType];
	const hasCascadeWarning =
		!isApprove &&
		requestType === "material" &&
		rejectionImpact !== null &&
		rejectionImpact !== undefined;

	function handleConfirm() {
		onConfirm(adminNotes.trim() || null);
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen && !isPending) {
			setAdminNotes("");
			onClose();
		}
	}

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 data-[state=open]:animate-in data-[state=open]:fade-in" />
				<Dialog.Content
					className={cn(
						"fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
						"bg-white rounded-xl shadow-xl w-full max-w-md p-6",
						"data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95",
					)}
				>
					{/* Header */}
					<div className="flex items-start justify-between gap-4 mb-5">
						<div>
							<Dialog.Title className="text-base font-semibold text-neutral-900">
								{isApprove ? "Approve" : "Reject"} {typeLabel} request
							</Dialog.Title>
							<Dialog.Description className="text-sm text-neutral-500 mt-0.5">
								{subjectLabel}
							</Dialog.Description>
						</div>
						<button
							type="button"
							onClick={onClose}
							disabled={isPending}
							className="text-neutral-400 hover:text-neutral-600 disabled:opacity-40"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Context */}
					<p className="text-xs text-neutral-500 bg-neutral-50 px-3 py-2 rounded-md mb-4">
						{contextLine}
					</p>

					{/* Cascade warning for material rejection */}
					{hasCascadeWarning && (
						<div className="mb-4 p-3 border border-warning-200 bg-warning-50 rounded-lg">
							{isLoadingImpact ? (
								<div className="flex items-center gap-2 text-sm text-warning-700">
									<Loader2 className="w-4 h-4 animate-spin" />
									Checking impact…
								</div>
							) : (
								<div className="flex items-start gap-2">
									<AlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 shrink-0" />
									<p className="text-sm text-warning-800">
										This will also automatically delete{" "}
										<strong>
											{rejectionImpact!.dependentVariantCount} pending variant
											request
											{rejectionImpact!.dependentVariantCount !== 1 ? "s" : ""}
										</strong>{" "}
										and{" "}
										<strong>
											{rejectionImpact!.dependentPricingCount} pending pricing
											request
											{rejectionImpact!.dependentPricingCount !== 1 ? "s" : ""}
										</strong>{" "}
										that depend on it. Any packages where packers already added
										these pending variants will be left with missing materials
										and will need to be corrected.
									</p>
								</div>
							)}
						</div>
					)}

					{/* Admin notes */}
					<div className="mb-5">
						<label
							htmlFor="admin-notes"
							className="block text-sm font-medium text-neutral-700 mb-1.5"
						>
							Admin notes{" "}
							{!isApprove && (
								<span className="text-neutral-400 font-normal">
									(encouraged on rejection)
								</span>
							)}
						</label>
						<textarea
							id="admin-notes"
							rows={3}
							value={adminNotes}
							onChange={(e) => setAdminNotes(e.target.value)}
							disabled={isPending}
							placeholder={
								isApprove
									? "Optional notes for this approval…"
									: "Explain why this request is being rejected…"
							}
							className={cn(
								"w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm",
								"placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500",
								"resize-none disabled:opacity-50",
							)}
						/>
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={isPending}
							className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleConfirm}
							disabled={isPending || isLoadingImpact}
							className={cn(
								"px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-1.5",
								"disabled:opacity-50 transition-colors",
								isApprove
									? "bg-success-600 hover:bg-success-700"
									: "bg-danger-600 hover:bg-danger-700",
							)}
						>
							{isPending && <Loader2 className="w-4 h-4 animate-spin" />}
							{isApprove ? "Approve" : "Reject"}
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
