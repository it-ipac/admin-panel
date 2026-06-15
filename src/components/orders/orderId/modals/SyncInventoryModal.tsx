import {
	AlertTriangle,
	CheckCircle2,
	Loader2,
	Sparkles,
	X,
} from "lucide-react";
import type {
	MappingConfig,
	OutOfSyncItem,
} from "@/features/orders/hooks/useInventorySync";
import type {
	Order,
	PackageInstance,
	PackageItem,
} from "@/features/orders/types";
import { UnlinkedItemsPanel } from "./UnlinkedItemsPanel";

interface SyncInventoryModalProps {
	order: Order;
	packageItems: PackageItem[] | undefined;
	clientInventory: any[] | undefined;
	packageInstances: PackageInstance[] | undefined;
	syncInventoryTab: "counters" | "unlinked";
	setSyncInventoryTab: (tab: "counters" | "unlinked") => void;
	outOfSyncItems: OutOfSyncItem[];
	mappingConfigs: Record<string, MappingConfig>;
	setMappingConfigs: React.Dispatch<
		React.SetStateAction<Record<string, MappingConfig>>
	>;
	isSavingSync: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

/** "Sync & Link Inventory" modal: counter discrepancies + unlinked custom items. */
export function SyncInventoryModal({
	order,
	packageItems,
	clientInventory,
	packageInstances,
	syncInventoryTab,
	setSyncInventoryTab,
	outOfSyncItems,
	mappingConfigs,
	setMappingConfigs,
	isSavingSync,
	onClose,
	onConfirm,
}: SyncInventoryModalProps) {
	const unlinkedCount = (
		packageItems?.filter((item) => !item.items_db_id) || []
	).length;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
			<div className="bg-white rounded-lg shadow-xl max-w-4xl w-[90vw] mx-4 overflow-hidden flex flex-col max-h-[90vh]">
				<div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50 shrink-0">
					<div className="flex items-center gap-2">
						<Sparkles className="w-5 h-5 text-accent-600 animate-pulse" />
						<h3 className="font-bold text-neutral-800 text-lg">
							Sync & Link Inventory
						</h3>
					</div>
					<button
						onClick={onClose}
						className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Tab Headers */}
				<div className="flex border-b shrink-0 bg-neutral-50/50">
					<button
						onClick={() => setSyncInventoryTab("counters")}
						className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${
							syncInventoryTab === "counters"
								? "border-accent-600 text-accent-700 bg-accent-50/20"
								: "border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
						}`}
					>
						Out-of-Sync Counters ({outOfSyncItems.length})
					</button>
					<button
						onClick={() => setSyncInventoryTab("unlinked")}
						className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${
							syncInventoryTab === "unlinked"
								? "border-accent-600 text-accent-700 bg-accent-50/20"
								: "border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
						}`}
					>
						Unlinked Custom Items ({unlinkedCount})
					</button>
				</div>

				{/* Tab Body */}
				<div className="p-6 overflow-y-auto flex-1 space-y-4">
					{syncInventoryTab === "counters" ? (
						<div className="space-y-4">
							<div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-900 text-sm leading-relaxed flex gap-3">
								<AlertTriangle className="w-5 h-5 shrink-0 text-warning-600 mt-0.5" />
								<div>
									<p className="font-bold">About Counter Discrepancies</p>
									<p className="mt-1">
										Older versions of the system sometimes did not update the{" "}
										<strong>packed_qty</strong> counter on the client inventory
										table (<strong>items_db</strong>). Synchronizing counters
										will update the inventory quantities to match the actual
										number of packed physical instances in the boxes.
									</p>
								</div>
							</div>

							{outOfSyncItems.length === 0 ? (
								<div className="p-8 text-center text-neutral-500 border border-dashed rounded-lg bg-neutral-50">
									<CheckCircle2 className="w-12 h-12 text-success-500 mx-auto mb-2" />
									<p className="font-medium text-neutral-700">
										All inventory counters are fully synchronized!
									</p>
									<p className="text-sm mt-1">
										No discrepancies detected between packed items and items_db.
									</p>
								</div>
							) : (
								<div className="border rounded-lg overflow-hidden">
									<table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
										<thead className="bg-neutral-50 font-semibold text-neutral-700">
											<tr>
												<th className="px-4 py-3">Item Ref</th>
												<th className="px-4 py-3">Description</th>
												<th className="px-4 py-3 text-center">Expected</th>
												<th className="px-4 py-3 text-center text-warning-700">
													Current Counter
												</th>
												<th className="px-4 py-3 text-center text-success-700">
													Actual Packed
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-neutral-200 bg-white">
											{outOfSyncItems.map((item) => (
												<tr key={item.id}>
													<td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700 bg-primary-50/50">
														#{item.item_num || "—"}
													</td>
													<td
														className="px-4 py-3 text-neutral-800 font-medium max-w-sm truncate"
														title={item.description || ""}
													>
														{item.description || "—"}
													</td>
													<td className="px-4 py-3 text-center font-medium">
														{item.expected_qty}
													</td>
													<td className="px-4 py-3 text-center font-bold text-warning-700 bg-warning-50/30">
														{item.stored_packed_qty}
													</td>
													<td className="px-4 py-3 text-center font-bold text-success-700 bg-success-50/30">
														{item.actual_pkd_sum}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					) : (
						<UnlinkedItemsPanel
							order={order}
							packageItems={packageItems}
							clientInventory={clientInventory}
							packageInstances={packageInstances}
							mappingConfigs={mappingConfigs}
							setMappingConfigs={setMappingConfigs}
						/>
					)}
				</div>

				{/* Modal Footer */}
				<div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50 shrink-0">
					<button
						onClick={onClose}
						className="px-4 py-2 border border-neutral-300 text-sm font-medium text-neutral-700 bg-white rounded-lg hover:bg-neutral-50 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						disabled={
							isSavingSync ||
							(outOfSyncItems.length === 0 &&
								!Object.values(mappingConfigs).some((c) => c.itemsDbId !== ""))
						}
						className="px-4 py-2 text-sm font-medium bg-accent-600 hover:bg-accent-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
					>
						{isSavingSync && <Loader2 className="w-4 h-4 animate-spin" />}
						Apply Sync & Mapping
					</button>
				</div>
			</div>
		</div>
	);
}
