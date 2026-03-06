import { Loader2, Mail, Send } from "lucide-react";
import { useMemo } from "react";
import { useInventoryCommunications } from "../hooks/useInventoryCommunications";
import {
	EMAIL_REASON_LABELS,
} from "../services/emailTemplates";
import type {
	SupplierEmailReason,
	VariantCommunicationItem,
} from "../types";

interface InventoryCommunicationsTabProps {
	variants: VariantCommunicationItem[];
	requesterUserId: string;
}

const EMAIL_REASONS: SupplierEmailReason[] = [
	"price_update",
	"material_order",
	"availability_check",
	"other",
];

export function InventoryCommunicationsTab({
	variants,
	requesterUserId,
}: InventoryCommunicationsTabProps) {
	const vm = useInventoryCommunications({ variants, requesterUserId });

	const supplierInboundCandidates = useMemo(() => {
		const map = new Map<string, string[]>();
		for (const msg of vm.history) {
			if (msg.direction !== "inbound" || !msg.resendEmailId || !msg.supplierId) {
				continue;
			}
			const arr = map.get(msg.supplierId) ?? [];
			arr.push(msg.resendEmailId);
			map.set(msg.supplierId, arr);
		}
		return map;
	}, [vm.history]);

	return (
		<div className="space-y-6 p-5">
			<div className="grid gap-4 md:grid-cols-3">
				<div className="md:col-span-2 rounded-lg border border-gray-200 bg-white p-4">
					<h3 className="text-base font-semibold text-gray-900">
						Supplier Communication
					</h3>
					<p className="mt-1 text-sm text-gray-500">
						Select variants, choose supplier per variant, and send grouped emails.
					</p>
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
						Reason template
					</label>
					<select
						value={vm.reason}
						onChange={(event) =>
							vm.setReason(event.target.value as SupplierEmailReason)
						}
						className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{EMAIL_REASONS.map((reason) => (
							<option key={reason} value={reason}>
								{EMAIL_REASON_LABELS[reason]}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="rounded-xl border border-gray-100 bg-white p-4">
				<div className="mb-3 flex items-center justify-between gap-3">
					<input
						type="text"
						placeholder="Search variants or suppliers"
						value={vm.search}
						onChange={(event) => vm.setSearch(event.target.value)}
						className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<div className="text-sm text-gray-500">
						Selected: {vm.selectedVariantIds.size}
					</div>
				</div>

				<div className="max-h-105 overflow-auto rounded-lg border border-gray-200">
					<table className="excel-table">
						<thead>
							<tr>
								<th className="sticky top-0 z-10 w-10 bg-gray-100" />
								<th className="sticky top-0 z-10 bg-gray-100">Material</th>
								<th className="sticky top-0 z-10 bg-gray-100">Variant</th>
								<th className="sticky top-0 z-10 bg-gray-100">Supplier</th>
								<th className="sticky top-0 z-10 bg-gray-100">Email</th>
							</tr>
						</thead>
						<tbody>
							{vm.filteredVariants.map((variant) => {
								const defaultSupplierId = variant.suppliers[0]?.supplierId;
								const selectedSupplierId =
									vm.selectedSupplierByVariantId[variant.variantId] ??
									defaultSupplierId ??
									"";
								const selectedSupplier = variant.suppliers.find(
									(supplier) => supplier.supplierId === selectedSupplierId,
								);

								return (
									<tr key={variant.variantId}>
										<td>
											<input
												type="checkbox"
												checked={vm.selectedVariantIds.has(variant.variantId)}
												onChange={() =>
													vm.toggleVariant(variant.variantId, defaultSupplierId)
												}
												className="h-4 w-4"
											/>
										</td>
										<td>{variant.materialName}</td>
										<td>{variant.variantName}</td>
										<td>
											<select
												value={selectedSupplierId}
												onChange={(event) =>
													vm.setVariantSupplier(variant.variantId, event.target.value)
												}
												className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
											>
												{variant.suppliers.length === 0 ? (
													<option value="">No supplier pricing</option>
												) : (
													variant.suppliers.map((supplier) => (
														<option
															key={`${variant.variantId}-${supplier.pricingId}`}
															value={supplier.supplierId}
														>
															{supplier.supplierName}
														</option>
													))
												)}
											</select>
										</td>
										<td>{selectedSupplier?.supplierEmail ?? "—"}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			<div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
				<div className="flex items-center justify-between">
					<h3 className="text-base font-semibold text-gray-900">
						Grouped email drafts ({vm.groupedDrafts.length})
					</h3>
					<button
						type="button"
						onClick={vm.sendGroupedEmails}
						disabled={vm.isSending || vm.groupedDrafts.length === 0}
						className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{vm.isSending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Send className="h-4 w-4" />
						)}
						Send grouped emails
					</button>
				</div>

				{vm.groupedDrafts.length === 0 ? (
					<p className="text-sm text-gray-500">
						No grouped drafts yet. Select variants first.
					</p>
				) : (
					vm.groupedDrafts.map((draft) => (
						<div
							key={draft.supplierId}
							className="rounded-lg border border-gray-200 p-3"
						>
							<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
								<div>
									<p className="font-medium text-gray-900">{draft.supplierName}</p>
									<p className="text-xs text-gray-500">{draft.supplierEmail}</p>
								</div>
								<span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
									{draft.variantIds.length} variants
								</span>
							</div>
							<input
								type="text"
								value={draft.subject}
								onChange={(event) =>
									vm.updateDraft(
										draft.supplierId,
										"subject",
										event.target.value,
									)
								}
								className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
							/>
							<textarea
								value={draft.body}
								onChange={(event) =>
									vm.updateDraft(
										draft.supplierId,
										"body",
										event.target.value,
									)
								}
								rows={7}
								className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
							/>
							<select
								value={vm.replyToBySupplierId[draft.supplierId] ?? ""}
								onChange={(event) =>
									vm.setReplyToBySupplierId((prev) => ({
										...prev,
										[draft.supplierId]: event.target.value,
									}))
								}
								className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
							>
								<option value="">New thread</option>
								{(supplierInboundCandidates.get(draft.supplierId) ?? []).map(
									(emailId) => (
										<option key={emailId} value={emailId}>
											Reply to inbound #{emailId.slice(0, 12)}
										</option>
									),
								)}
							</select>
						</div>
					))
				)}
			</div>

			<div className="rounded-xl border border-gray-100 bg-white p-4">
				<div className="mb-3 flex items-center gap-2">
					<Mail className="h-4 w-4 text-gray-500" />
					<h3 className="text-base font-semibold text-gray-900">
						Communication history
					</h3>
				</div>
				{vm.isHistoryLoading ? (
					<div className="flex items-center gap-2 text-sm text-gray-500">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading history...
					</div>
				) : vm.history.length === 0 ? (
					<p className="text-sm text-gray-500">
						No tracked supplier emails yet.
					</p>
				) : (
					<div className="overflow-x-auto">
						<table className="excel-table">
							<thead>
								<tr>
									<th>Direction</th>
									<th>Supplier</th>
									<th>Subject</th>
									<th>Status</th>
									<th>Created</th>
								</tr>
							</thead>
							<tbody>
								{vm.history.map((message) => (
									<tr key={message.id}>
										<td>
											<span
												className={`rounded px-2 py-1 text-xs font-medium ${
													message.direction === "outbound"
														? "bg-blue-50 text-blue-700"
														: "bg-green-50 text-green-700"
												}`}
											>
												{message.direction}
											</span>
										</td>
										<td>{message.supplierName}</td>
										<td>{message.subject}</td>
										<td>{message.status ?? "—"}</td>
										<td>{new Date(message.createdAt).toLocaleString()}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
