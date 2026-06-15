import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { deleteOrderTargets } from "@/features/orders/hooks/useDeleteOrderCascade";

interface DangerZoneProps {
	deleteOrderOpen: boolean;
	setDeleteOrderOpen: (open: boolean) => void;
	deleteOrderError: string | null;
	deletingOrder: boolean;
	onDeleteOrder: () => void;
	regeneratingReferences: boolean;
	onRegenerateReferences: () => void;
}

/** Danger zone: order delete cascade dialog + bulk reference regeneration. */
export function DangerZone({
	deleteOrderOpen,
	setDeleteOrderOpen,
	deleteOrderError,
	deletingOrder,
	onDeleteOrder,
	regeneratingReferences,
	onRegenerateReferences,
}: DangerZoneProps) {
	return (
		<div className="bg-white rounded-lg border border-danger-200 shadow-sm p-6 flex flex-col gap-6">
			<div>
				<h2 className="text-lg font-semibold text-danger-700 mb-2 flex items-center gap-2">
					<AlertTriangle className="w-5 h-5" />
					Danger Zone
				</h2>
				<p className="text-sm text-neutral-600 mb-4">
					Deleting this order removes all related records, including packages,
					materials, tasks, and manufacturing data.
				</p>
				<Dialog.Root open={deleteOrderOpen} onOpenChange={setDeleteOrderOpen}>
					<Dialog.Trigger asChild>
						<button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-danger-600 rounded-lg hover:bg-danger-700">
							<Trash2 className="w-4 h-4" />
							Delete Order
						</button>
					</Dialog.Trigger>
					<Dialog.Portal>
						<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
						<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-2xl p-6">
							<Dialog.Title className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
								<Trash2 className="w-5 h-5 text-danger-600" />
								Delete Order
							</Dialog.Title>
							<Dialog.Description className="text-sm text-neutral-500 mt-1">
								This action is permanent. The following tables will be cleaned
								up for this order.
							</Dialog.Description>

							<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
								{deleteOrderTargets.map((target) => (
									<div
										key={target}
										className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700"
									>
										<span className="h-1.5 w-1.5 rounded-full bg-danger-500" />
										{target}
									</div>
								))}
							</div>

							{deleteOrderError && (
								<div className="mt-4 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
									{deleteOrderError}
								</div>
							)}

							<div className="mt-6 flex justify-end gap-2">
								<Dialog.Close asChild>
									<button className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg">
										Cancel
									</button>
								</Dialog.Close>
								<button
									onClick={onDeleteOrder}
									disabled={deletingOrder}
									className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-danger-600 rounded-lg hover:bg-danger-700 disabled:opacity-50"
								>
									{deletingOrder ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											Deleting...
										</>
									) : (
										<>
											<Trash2 className="w-4 h-4" />
											Delete Order
										</>
									)}
								</button>
							</div>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			</div>

			<div className="pt-6 border-t border-danger-100">
				<h3 className="text-md font-semibold text-danger-700 mb-2 flex items-center gap-2">
					<RefreshCw className="w-5 h-5" />
					Regenerate Custom Box References
				</h3>
				<p className="text-sm text-neutral-600 mb-4">
					This will loop through all custom boxes in this order, find the
					matching item in the database, and update their destination and
					regenerate their IPAC reference.
				</p>
				<button
					onClick={onRegenerateReferences}
					disabled={regeneratingReferences}
					className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-danger-600 rounded-lg hover:bg-danger-700 disabled:opacity-50"
				>
					{regeneratingReferences ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin" />
							Updating...
						</>
					) : (
						<>
							<RefreshCw className="w-4 h-4" />
							Regenerate References
						</>
					)}
				</button>
			</div>
		</div>
	);
}
