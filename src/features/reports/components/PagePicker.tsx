import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { clampPageIndex, parsePageInput } from "../pageNavigation";

interface PagePickerProps {
	/** 0-based. */
	currentPage: number;
	totalPages: number;
	/** Receives a 0-based, already-clamped page index. */
	onNavigate: (index: number) => void;
}

/**
 * `Page [n] of N` with direct entry.
 *
 * The input holds a draft string only while the user is editing; the rest of
 * the time it mirrors `currentPage`, so arrow navigation and external clamping
 * both show up immediately. Enter commits, Escape reverts, blur commits what is
 * valid and reverts what is not — the control can never be left in a bad state.
 */
export function PagePicker({
	currentPage,
	totalPages,
	onNavigate,
}: PagePickerProps) {
	const [draft, setDraft] = useState<string | null>(null);
	const inputId = useId();
	const totalId = useId();

	// Leaving edit mode whenever the page changes underneath keeps the box in
	// sync with Prev/Next and with totalPages shrinking.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset on page change
	useEffect(() => setDraft(null), [currentPage]);

	const atFirst = currentPage <= 0;
	const atLast = totalPages === 0 || currentPage >= totalPages - 1;
	const shown = draft ?? String(totalPages === 0 ? 0 : currentPage + 1);

	const commit = (raw: string) => {
		const result = parsePageInput(raw, totalPages);
		if (!result.ok) {
			setDraft(null); // empty or nonsense: restore the real page
			return;
		}
		setDraft(null);
		if (result.index !== currentPage) onNavigate(result.index);
	};

	return (
		<div className="flex items-center gap-1 rounded border border-neutral-300 bg-app-surface p-0.5 shadow-sm">
			<button
				type="button"
				aria-label="Previous page"
				onClick={() => onNavigate(clampPageIndex(currentPage - 1, totalPages))}
				disabled={atFirst}
				className="flex size-6 items-center justify-center rounded transition-colors hover:bg-neutral-100 disabled:opacity-30"
			>
				<ChevronLeft className="size-4 text-neutral-600" aria-hidden="true" />
			</button>

			<span className="flex items-center gap-1 px-1 text-xs font-semibold text-neutral-700">
				<label htmlFor={inputId} className="select-none">
					Page
				</label>
				<input
					id={inputId}
					// text + inputMode keeps the mobile numeric keypad without the
					// browser number spinner, which accepts "e" and decimals.
					type="text"
					inputMode="numeric"
					autoComplete="off"
					aria-label="Go to page"
					aria-describedby={totalId}
					value={shown}
					disabled={totalPages === 0}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							commit(e.currentTarget.value);
						} else if (e.key === "Escape") {
							e.preventDefault();
							setDraft(null);
							e.currentTarget.blur();
						}
					}}
					onBlur={(e) => commit(e.currentTarget.value)}
					onFocus={(e) => e.currentTarget.select()}
					className="w-11 rounded border border-neutral-300 bg-app-surface px-1 py-0.5 text-center text-xs font-semibold tabular-nums text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-500 disabled:opacity-40"
				/>
				<span id={totalId} className="select-none whitespace-nowrap">
					of {totalPages}
				</span>
			</span>

			<button
				type="button"
				aria-label="Next page"
				onClick={() => onNavigate(clampPageIndex(currentPage + 1, totalPages))}
				disabled={atLast}
				className="flex size-6 items-center justify-center rounded transition-colors hover:bg-neutral-100 disabled:opacity-30"
			>
				<ChevronRight className="size-4 text-neutral-600" aria-hidden="true" />
			</button>
		</div>
	);
}
