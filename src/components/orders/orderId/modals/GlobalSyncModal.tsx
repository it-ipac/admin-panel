import { Loader2, X } from "lucide-react";
import type { GlobalSyncEntry } from "@/features/orders/hooks/useGlobalDestinationSync";

interface GlobalSyncModalProps {
	globalSyncInstances: GlobalSyncEntry[];
	isGlobalSyncing: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

/** Confirmation modal for the order-wide destination sync. */
export function GlobalSyncModal({
	globalSyncInstances,
	isGlobalSyncing,
	onClose,
	onConfirm,
}: GlobalSyncModalProps) {
	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden">
				<div className="px-4 py-3 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
					<h3 className="font-semibold text-neutral-800">
						Global Destination Sync
					</h3>
					<button
						onClick={onClose}
						className="text-neutral-400 hover:text-neutral-600"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="p-4">
					{globalSyncInstances.length === 0 ? (
						<p className="text-neutral-600 text-sm">
							All instance destinations are already up to date with their
							respective items.
						</p>
					) : (
						<>
							<p className="text-neutral-600 text-sm mb-4">
								You are about to update the destination for{" "}
								<strong>{globalSyncInstances.length}</strong> instances across
								the order based on their item's warehouse location:
							</p>
							<div className="max-h-64 overflow-y-auto space-y-2 mb-4 pr-2">
								{globalSyncInstances.map((sync, i) => (
									<div
										key={i}
										className="flex justify-between items-center text-sm p-2 bg-neutral-50 rounded border border-neutral-100"
									>
										<span className="font-medium text-neutral-700">
											Box #{sync.package_number ?? "?"} - Inst #
											{sync.instance.instance_number ?? "All"}
										</span>
										<div className="flex items-center gap-2 text-neutral-500">
											<span className="line-through">
												{sync.instance.destination || "None"}
											</span>
											<span>→</span>
											<span className="text-primary-600 font-semibold">
												{sync.newDestination}
											</span>
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</div>
				<div className="px-4 py-3 border-t border-neutral-100 flex justify-end gap-2 bg-neutral-50">
					<button
						onClick={onClose}
						className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						disabled={isGlobalSyncing || globalSyncInstances.length === 0}
						className="px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 rounded flex items-center gap-2 disabled:opacity-50"
					>
						{isGlobalSyncing && <Loader2 className="w-4 h-4 animate-spin" />}
						Confirm Global Sync
					</button>
				</div>
			</div>
		</div>
	);
}
