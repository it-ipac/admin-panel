import * as Dialog from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	/** Visual intent of the confirm button. Defaults to danger (destructive). */
	variant?: "danger" | "primary";
	/** Disables both buttons and shows a spinner on the confirm button. */
	pending?: boolean;
	onConfirm: () => void;
}

/**
 * ConfirmDialog
 *
 * Shared Radix-based confirmation dialog. Use instead of window.confirm()
 * so confirmations match the app's design system and support pending state.
 */
export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmText = "Delete",
	cancelText = "Cancel",
	variant = "danger",
	pending = false,
	onConfirm,
}: ConfirmDialogProps) {
	const confirmClasses =
		variant === "danger"
			? "bg-danger-600 hover:bg-danger-700"
			: "bg-primary-600 hover:bg-primary-700";

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(next) => {
				if (!pending) onOpenChange(next);
			}}
		>
			<Dialog.Portal>
				{/* z-[10000] so confirmations sit above full-screen modals (some use zIndex 9999) */}
				<Dialog.Overlay className="fixed inset-0 bg-black/50 z-[10000]" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
					<Dialog.Title className="text-lg font-semibold text-neutral-900">
						{title}
					</Dialog.Title>
					{description && (
						<Dialog.Description className="text-sm text-neutral-500 mt-2">
							{description}
						</Dialog.Description>
					)}
					<div className="flex justify-end gap-2 mt-6">
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							disabled={pending}
							className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg disabled:opacity-50"
						>
							{cancelText}
						</button>
						<button
							type="button"
							onClick={onConfirm}
							disabled={pending}
							className={`flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60 ${confirmClasses}`}
						>
							{pending && <Loader2 className="w-4 h-4 animate-spin" />}
							{confirmText}
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
