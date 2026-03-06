import * as Dialog from "@radix-ui/react-dialog";

interface TemplateWarningDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	templateWarningCount?: number;
	onConfirm: () => void;
}

export function TemplateWarningDialog({
	open,
	onOpenChange,
	templateWarningCount,
	onConfirm,
}: TemplateWarningDialogProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
					<Dialog.Title className="text-lg font-semibold text-gray-900">
						Create order with empty templates?
					</Dialog.Title>
					<Dialog.Description className="text-sm text-gray-500 mt-2">
						Some securing templates are missing material selections. If you
						continue, those templates will be created without a material and can
						be completed later.
					</Dialog.Description>
					<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
						Missing templates: {templateWarningCount || 0}
					</div>
					<div className="flex justify-end gap-2 mt-6">
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => {
								onOpenChange(false);
								onConfirm();
							}}
							className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
						>
							Create anyway
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
