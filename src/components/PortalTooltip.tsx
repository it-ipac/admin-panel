import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PortalTooltipProps {
	children: ReactNode;
	label: string;
	detail?: string;
	shortcut?: string;
	align?: "start" | "center" | "end";
	showOnFocus?: boolean;
}

const positionClasses = {
	start: "left-0",
	center: "left-1/2 -translate-x-1/2",
	end: "right-0",
} as const;

/** Compact portal tooltip that follows the active app theme. */
export function PortalTooltip({
	children,
	label,
	detail,
	shortcut,
	align = "center",
	showOnFocus = true,
}: PortalTooltipProps) {
	const [visible, setVisible] = useState(false);
	const openTimerRef = useRef<number | null>(null);

	const clearOpenTimer = useCallback(() => {
		if (openTimerRef.current !== null) {
			window.clearTimeout(openTimerRef.current);
			openTimerRef.current = null;
		}
	}, []);

	const show = () => {
		clearOpenTimer();
		openTimerRef.current = window.setTimeout(() => {
			setVisible(true);
			openTimerRef.current = null;
		}, 180);
	};

	const hide = () => {
		clearOpenTimer();
		setVisible(false);
	};

	useEffect(() => () => clearOpenTimer(), [clearOpenTimer]);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: this wrapper only captures hover/focus events from arbitrary child controls to drive tooltip visibility.
		<span
			className="relative inline-flex"
			onMouseEnter={show}
			onMouseLeave={hide}
			onPointerDown={hide}
			onClickCapture={hide}
			onFocusCapture={(event) => {
				if (!showOnFocus) return;
				const target = event.target;
				if (target instanceof HTMLElement && target.matches(":focus-visible")) {
					show();
				}
			}}
			onBlurCapture={hide}
		>
			{children}
			{visible ? (
				<span
					className={`pointer-events-none absolute top-full z-[var(--z-modal-elevated)] mt-2 w-max max-w-[13rem] ${positionClasses[align]}`}
					role="tooltip"
				>
					<span className="flex items-start gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-left shadow-[0_12px_30px_-12px_rgba(15,23,42,0.35)]">
						<span className="min-w-0">
							<span
								className="block whitespace-nowrap text-[12px] font-semibold leading-4"
								style={{ color: "var(--app-text-strong)" }}
							>
								{label}
							</span>
							{detail ? (
								<span
									className="mt-0.5 block whitespace-nowrap text-[10px] font-medium leading-4"
									style={{ color: "var(--app-text-muted)" }}
								>
									{detail}
								</span>
							) : null}
						</span>
						{shortcut ? (
							<kbd
								className="ml-1 shrink-0 rounded-md border border-app-border bg-app-surface-muted px-1.5 py-0.5 font-mono text-[9px] font-semibold leading-4"
								style={{ color: "var(--app-text-muted)" }}
							>
								{shortcut}
							</kbd>
						) : null}
					</span>
				</span>
			) : null}
		</span>
	);
}
