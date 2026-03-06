import type { ToastVariant } from "../components/ui/ToastProvider";
import { useToastContext } from "../components/ui/ToastProvider";

interface ToastOptions {
	title: string;
	description?: string;
}

interface UseToastReturn {
	success: (opts: ToastOptions) => void;
	error: (opts: ToastOptions) => void;
	warning: (opts: ToastOptions) => void;
	info: (opts: ToastOptions) => void;
	toast: (variant: ToastVariant, opts: ToastOptions) => void;
}

export function useToast(): UseToastReturn {
	const { toast } = useToastContext();

	return {
		success: (opts) => toast({ variant: "success", ...opts }),
		error: (opts) => toast({ variant: "error", ...opts }),
		warning: (opts) => toast({ variant: "warning", ...opts }),
		info: (opts) => toast({ variant: "info", ...opts }),
		toast: (variant, opts) => toast({ variant, ...opts }),
	};
}
