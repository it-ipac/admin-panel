import * as RadixToast from "@radix-ui/react-toast";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "../../lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastMessage {
	id: string;
	title: string;
	description?: string;
	variant: ToastVariant;
}

interface ToastContextValue {
	toast: (opts: Omit<ToastMessage, "id">) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx)
		throw new Error("useToastContext must be used within ToastProvider");
	return ctx;
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const variantClasses: Record<ToastVariant, string> = {
	success: "border-success-500",
	error: "border-danger-500",
	warning: "border-warning-500",
	info: "border-primary-500",
};

const variantTitleClasses: Record<ToastVariant, string> = {
	success: "text-success-700 dark:text-success-300",
	error: "text-danger-700 dark:text-danger-300",
	warning: "text-warning-700 dark:text-warning-300",
	info: "text-primary-700 dark:text-primary-300",
};

// ─── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);
	const [isMounted, setIsMounted] = useState(false);
	const counter = useRef(0);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const toast = useCallback((opts: Omit<ToastMessage, "id">) => {
		counter.current += 1;
		const id = `toast-${counter.current}`;
		setToasts((prev) => [...prev, { ...opts, id }]);
	}, []);

	const dismiss = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const ctxValue = useMemo(() => ({ toast }), [toast]);

	return (
		<ToastContext.Provider value={ctxValue}>
			<RadixToast.Provider swipeDirection="right">
				{children}
				{toasts.map((t) => (
					<RadixToast.Root
						key={t.id}
						open
						onOpenChange={(open) => {
							if (!open) dismiss(t.id);
						}}
						duration={t.variant === "error" ? 6000 : 4000}
						className={cn(
							"flex min-w-70 max-w-sm items-start gap-3 rounded-xl border border-l-4 border-app-border bg-app-surface px-4 py-3 shadow-[0_16px_45px_-20px_rgba(15,23,42,0.35)] dark:shadow-[0_18px_50px_-22px_rgba(0,0,0,0.72)]",
							"data-[state=open]:animate-in data-[state=open]:slide-in-from-right-5",
							"data-[state=closed]:animate-out data-[state=closed]:fade-out",
							variantClasses[t.variant],
						)}
					>
						<div className="min-w-0 flex-1">
							<RadixToast.Title
								className={cn(
									"text-sm font-semibold",
									variantTitleClasses[t.variant],
								)}
							>
								{t.title}
							</RadixToast.Title>
							{t.description && (
								<RadixToast.Description className="mt-0.5 text-xs leading-5 text-app-text-muted">
									{t.description}
								</RadixToast.Description>
							)}
						</div>
						<RadixToast.Close
							onClick={() => dismiss(t.id)}
							className="mt-0.5 shrink-0 rounded-md p-0.5 text-app-text-muted transition-colors hover:bg-app-surface-muted hover:text-app-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
							aria-label="Dismiss notification"
						>
							<X className="h-4 w-4" />
						</RadixToast.Close>
					</RadixToast.Root>
				))}
				{isMounted ? (
					<RadixToast.Viewport
						suppressHydrationWarning
						className="fixed bottom-4 right-4 z-9999 flex max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none"
					/>
				) : null}
			</RadixToast.Provider>
		</ToastContext.Provider>
	);
}
