import * as RadixToast from "@radix-ui/react-toast";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import {
	createContext,
	useEffect,
	useCallback,
	useContext,
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
	success: "border-l-4 border-green-500 bg-white",
	error: "border-l-4 border-red-500 bg-white",
	warning: "border-l-4 border-yellow-500 bg-white",
	info: "border-l-4 border-blue-500 bg-white",
};

const variantTitleClasses: Record<ToastVariant, string> = {
	success: "text-green-700",
	error: "text-red-700",
	warning: "text-yellow-700",
	info: "text-blue-700",
};

// ─── Provider ─────────────────────────────────────────────────────────────────

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
							"flex items-start gap-3 rounded-lg shadow-lg px-4 py-3 min-w-70 max-w-sm",
							"data-[state=open]:animate-in data-[state=open]:slide-in-from-right-5",
							"data-[state=closed]:animate-out data-[state=closed]:fade-out",
							variantClasses[t.variant],
						)}
					>
						<div className="flex-1 min-w-0">
							<RadixToast.Title
								className={cn(
									"text-sm font-semibold",
									variantTitleClasses[t.variant],
								)}
							>
								{t.title}
							</RadixToast.Title>
							{t.description && (
								<RadixToast.Description className="mt-0.5 text-xs text-gray-600">
									{t.description}
								</RadixToast.Description>
							)}
						</div>
						<RadixToast.Close
							onClick={() => dismiss(t.id)}
							className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5"
						>
							<X className="w-4 h-4" />
						</RadixToast.Close>
					</RadixToast.Root>
				))}
				{isMounted ? (
					<RadixToast.Viewport
						suppressHydrationWarning
						className="fixed bottom-4 right-4 flex flex-col gap-2 z-9999 outline-none"
					/>
				) : null}
			</RadixToast.Provider>
		</ToastContext.Provider>
	);
}
