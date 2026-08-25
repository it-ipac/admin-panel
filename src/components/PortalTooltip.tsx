import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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

const arrowClasses = {
	start: "left-4",
	center: "left-1/2 -translate-x-1/2",
	end: "right-4",
} as const;

/**
 * Portal-specific tooltip with a restrained, branded treatment. Native title
 * tooltips vary by browser and operating system, so portal controls use this
 * consistently styled surface instead.
 */
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

	const clearOpenTimer = () => {
		if (openTimerRef.current !== null) {
			window.clearTimeout(openTimerRef.current);
			openTimerRef.current = null;
		}
	};

	const show = () => {
		clearOpenTimer();
		openTimerRef.current = window.setTimeout(() => {
			setVisible(true);
			openTimerRef.current = null;
		}, 150);
	};

	const hide = () => {
		clearOpenTimer();
		setVisible(false);
	};

	useEffect(() => () => clearOpenTimer(), []);

	return (
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
			<span
				className={`pointer-events-none absolute top-full z-[90] mt-2.5 w-max max-w-[14rem] ${positionClasses[align]}`}
				aria-hidden={!visible}
				role="tooltip"
			>
				<span
					className={`relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-white/10 bg-steel-950/95 px-3 py-2.5 text-left shadow-[0_14px_36px_-12px_rgba(2,8,23,0.72)] backdrop-blur-xl transition-[opacity,transform] duration-150 ease-out ${
						visible
							? "translate-y-0 scale-100 opacity-100"
							: "-translate-y-1 scale-[0.97] opacity-0"
					}`}
				>
					<span
						className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-400/70 to-transparent"
						aria-hidden="true"
					/>
					<span
						className="h-5 w-0.5 shrink-0 rounded-full bg-primary-400 shadow-[0_0_10px_rgba(96,165,250,0.55)]"
						aria-hidden="true"
					/>
					<span className="min-w-0">
						<span className="block whitespace-nowrap text-[12px] font-semibold leading-4 text-white">
							{label}
						</span>
						{detail ? (
							<span className="mt-0.5 block whitespace-nowrap text-[10px] font-medium leading-4 text-steel-300">
								{detail}
							</span>
						) : null}
					</span>
					{shortcut ? (
						<kbd className="ml-1 shrink-0 rounded-md border border-white/10 bg-white/8 px-1.5 py-0.5 font-mono text-[9px] font-semibold leading-4 text-steel-200 shadow-inner shadow-black/20">
							{shortcut}
						</kbd>
					) : null}
				</span>
				<span
					className={`absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-white/10 bg-steel-950/95 ${arrowClasses[align]}`}
					aria-hidden="true"
				/>
			</span>
		</span>
	);
}
