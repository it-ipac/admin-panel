import { Loader2, Plus, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import {
	type AllocationRow,
	useOrderAllocations,
} from "@/features/orders/hooks/useOrderAllocations";
import { AddAllocationModal } from "../modals/AddAllocationModal";
import { ReconcileAllocationsModal } from "../modals/ReconcileAllocationsModal";

interface AllocationsSectionProps {
	orderId: string;
	clientId: string | null | undefined;
	canEdit: boolean;
}

const MAX_ROWS = 200;

/** Order item allocations (milk model) — view, edit expected qty, add items. */
export function AllocationsSection({
	orderId,
	clientId,
	canEdit,
}: AllocationsSectionProps) {
	const {
		allocations,
		destinations,
		categories,
		catalog,
		setExpected,
		addAllocation,
	} = useOrderAllocations(orderId, clientId);
	const [search, setSearch] = useState("");
	const [edits, setEdits] = useState<Record<string, string>>({});
	const [savingId, setSavingId] = useState<string | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [reconcileOpen, setReconcileOpen] = useState(false);

	const rows = allocations.data || [];

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		const matched = q
			? rows.filter((r) =>
					[
						r.items_db?.item_num,
						r.items_db?.description,
						r.destinations?.code,
					].some((f) =>
						String(f || "")
							.toLowerCase()
							.includes(q),
					),
				)
			: rows;
		return { rows: matched.slice(0, MAX_ROWS), total: matched.length };
	}, [rows, search]);

	const commitExpected = async (row: AllocationRow) => {
		const raw = edits[row.id];
		if (raw === undefined) return;
		// Whole numbers only (items_db rollup is integer; you can't pack a fraction of a box).
		const next = Math.round(Number(raw));
		if (
			!Number.isFinite(next) ||
			next < 0 ||
			next === Number(row.expected_qty)
		) {
			setEdits((p) => {
				const { [row.id]: _, ...rest } = p;
				return rest;
			});
			return;
		}
		setSavingId(row.id);
		try {
			await setExpected.mutateAsync({ allocationId: row.id, expected: next });
			setEdits((p) => {
				const { [row.id]: _, ...rest } = p;
				return rest;
			});
		} finally {
			setSavingId(null);
		}
	};

	return (
		<div className="rounded-lg border border-neutral-200 bg-white p-4">
			<div className="flex items-center justify-between mb-3 gap-2">
				<div>
					<p className="text-sm font-semibold text-neutral-900">
						Item allocations
					</p>
					<p className="text-xs text-neutral-500">
						Expected vs packed per item &amp; destination. Editing expected
						keeps the item master total in sync.
					</p>
				</div>
				{canEdit && (
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setReconcileOpen(true)}
							className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 whitespace-nowrap"
						>
							<Upload className="w-4 h-4" />
							Reconcile from Excel
						</button>
						<button
							type="button"
							onClick={() => setAddOpen(true)}
							className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 whitespace-nowrap"
						>
							<Plus className="w-4 h-4" />
							Add item
						</button>
					</div>
				)}
			</div>

			<input
				type="text"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				placeholder="Filter by item #, description, or destination..."
				className="w-full mb-3 px-3 py-2 border border-neutral-300 rounded-lg text-sm"
			/>

			{allocations.isLoading ? (
				<div className="flex items-center justify-center py-10 text-neutral-500">
					<Loader2 className="w-5 h-5 animate-spin mr-2" />
					Loading allocations…
				</div>
			) : allocations.isError ? (
				<p className="py-6 text-center text-sm text-danger-600">
					Failed to load allocations.
				</p>
			) : rows.length === 0 ? (
				<p className="py-6 text-center text-sm text-neutral-400">
					No item allocations for this order yet.
				</p>
			) : (
				<div className="max-h-[28rem] overflow-auto rounded-lg border border-neutral-100">
					<table className="w-full text-sm">
						<thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_var(--color-neutral-100)]">
							<tr className="border-b border-neutral-100 text-left text-neutral-500">
								<th className="py-2 px-2 font-medium">Item #</th>
								<th className="py-2 px-2 font-medium">Description</th>
								<th className="py-2 px-2 font-medium">Destination</th>
								<th className="py-2 px-2 font-medium text-right">Expected</th>
								<th className="py-2 px-2 font-medium text-right">Packed</th>
								<th className="py-2 px-2 font-medium">SB</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-50">
							{filtered.rows.map((row) => (
								<tr key={row.id} className="hover:bg-neutral-50">
									<td className="py-2 px-2 font-medium text-neutral-900 whitespace-nowrap">
										{row.items_db?.item_num || "—"}
									</td>
									<td className="py-2 px-2 text-neutral-600 max-w-xs truncate">
										{row.items_db?.description || "—"}
									</td>
									<td className="py-2 px-2 text-neutral-600 whitespace-nowrap">
										{row.destinations?.code || "—"}
									</td>
									<td className="py-2 px-2 text-right">
										{canEdit ? (
											<span className="inline-flex items-center gap-1 justify-end">
												<input
													type="number"
													min={0}
													value={edits[row.id] ?? String(row.expected_qty)}
													onChange={(e) =>
														setEdits((p) => ({
															...p,
															[row.id]: e.target.value,
														}))
													}
													onBlur={() => commitExpected(row)}
													onKeyDown={(e) => {
														if (e.key === "Enter") e.currentTarget.blur();
													}}
													className="w-20 px-2 py-1 border border-neutral-300 rounded text-right tabular-nums"
												/>
												{savingId === row.id && (
													<Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
												)}
											</span>
										) : (
											<span className="tabular-nums">{row.expected_qty}</span>
										)}
									</td>
									<td className="py-2 px-2 text-right tabular-nums text-neutral-700">
										{row.packed_qty}
									</td>
									<td className="py-2 px-2">
										{row.is_standard_box ? (
											<span className="inline-block px-1.5 py-0.5 rounded bg-steel-100 text-steel-700 text-[10px] font-bold">
												SB
											</span>
										) : null}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{filtered.total > filtered.rows.length && (
						<p className="mt-2 text-xs text-neutral-400">
							Showing {filtered.rows.length} of {filtered.total} — refine the
							filter to see more.
						</p>
					)}
				</div>
			)}

			{canEdit && (
				<AddAllocationModal
					open={addOpen}
					onOpenChange={setAddOpen}
					destinations={destinations.data || []}
					categories={categories.data || []}
					catalog={catalog.data || []}
					onSubmit={(vars) => addAllocation.mutateAsync(vars)}
					isSubmitting={addAllocation.isPending}
				/>
			)}

			{canEdit && (
				<ReconcileAllocationsModal
					open={reconcileOpen}
					onOpenChange={setReconcileOpen}
					orderId={orderId}
					clientId={clientId}
					allocations={rows}
					destinations={destinations.data || []}
					categories={categories.data || []}
					catalog={catalog.data || []}
					onApplied={() => {
						void allocations.refetch();
						void catalog.refetch();
					}}
				/>
			)}
		</div>
	);
}
