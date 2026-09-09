import { ChevronDown, Search } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { SelectAllState } from "../lineOptions";
import { SelectAllCheckbox } from "./SelectAllCheckbox";

export type BoxSelectionOption = {
	id: string;
	label: string;
	meta?: string;
	searchText?: string;
};

interface BoxSelectionPanelProps {
	options: BoxSelectionOption[];
	excludedBoxIds: ReadonlySet<string>;
	onExcludedBoxIdsChange: (next: Set<string>) => void;
}

const VIRTUALIZE_AFTER = 80;
const ROW_HEIGHT = 44;
const VIEWPORT_HEIGHT = 308;
const OVERSCAN_ROWS = 4;

export function getBoxSelectAllState(
	options: BoxSelectionOption[],
	excludedBoxIds: ReadonlySet<string>,
): SelectAllState {
	if (options.length === 0) return "none";
	const selectedCount = options.reduce(
		(count, option) => count + (excludedBoxIds.has(option.id) ? 0 : 1),
		0,
	);
	if (selectedCount === 0) return "none";
	if (selectedCount === options.length) return "all";
	return "some";
}

export function setAllCurrentBoxesSelected(
	excludedBoxIds: ReadonlySet<string>,
	options: BoxSelectionOption[],
	checked: boolean,
): Set<string> {
	const next = new Set(excludedBoxIds);
	for (const option of options) {
		if (checked) next.delete(option.id);
		else next.add(option.id);
	}
	return next;
}

export const BoxSelectionPanel: React.FC<BoxSelectionPanelProps> = ({
	options,
	excludedBoxIds,
	onExcludedBoxIdsChange,
}) => {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [windowStart, setWindowStart] = useState(0);
	const [isListScrolling, setIsListScrolling] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const scrollStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const normalizedSearch = search.trim().toLowerCase();

	useEffect(() => {
		if (!open) return;

		const handlePointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [open]);

	useEffect(
		() => () => {
			if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
		},
		[],
	);

	const visibleOptions = useMemo(() => {
		if (!normalizedSearch) return options;
		return options.filter((option) =>
			[option.label, option.meta, option.searchText]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(normalizedSearch),
		);
	}, [normalizedSearch, options]);

	const selectedCount = options.reduce(
		(count, option) => count + (excludedBoxIds.has(option.id) ? 0 : 1),
		0,
	);
	const selectAllState = getBoxSelectAllState(options, excludedBoxIds);
	const isVirtualized = visibleOptions.length > VIRTUALIZE_AFTER;
	const viewportRows = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT);
	const maxStart = Math.max(0, visibleOptions.length - viewportRows);
	const renderStart = isVirtualized ? Math.min(windowStart, maxStart) : 0;
	const renderEnd = isVirtualized
		? Math.min(
				visibleOptions.length,
				renderStart + viewportRows + OVERSCAN_ROWS * 2,
			)
		: visibleOptions.length;
	const renderedOptions = visibleOptions.slice(renderStart, renderEnd);
	const topSpacerHeight = isVirtualized ? renderStart * ROW_HEIGHT : 0;
	const bottomSpacerHeight = isVirtualized
		? Math.max(0, (visibleOptions.length - renderEnd) * ROW_HEIGHT)
		: 0;

	const toggleBox = (id: string) => {
		const next = new Set(excludedBoxIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		onExcludedBoxIdsChange(next);
	};

	const handleListScroll = (event: React.UIEvent<HTMLDivElement>) => {
		if (!isVirtualized) return;
		const nextStart = Math.max(
			0,
			Math.floor(event.currentTarget.scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
		);
		setWindowStart((current) => (current === nextStart ? current : nextStart));
		setIsListScrolling(true);
		if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
		scrollStopTimer.current = setTimeout(() => setIsListScrolling(false), 140);
	};

	const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(event.target.value);
		setWindowStart(0);
		if (listRef.current) listRef.current.scrollTop = 0;
	};

	return (
		<div ref={rootRef} className="relative inline-block">
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				aria-expanded={open}
				aria-haspopup="dialog"
				className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-bold shadow-sm transition-colors cursor-pointer ${
					open
						? "border-primary-300 bg-primary-50 text-primary-700"
						: "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
				}`}
			>
				<span>Boxes</span>
				<span
					className={`rounded px-1.5 py-0.5 text-[0.7rem] font-semibold ${
						selectedCount === options.length
							? "bg-primary-100 text-primary-700"
							: "bg-accent-100 text-accent-700"
					}`}
				>
					{selectedCount}/{options.length}
				</span>
				<ChevronDown
					className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
					aria-hidden="true"
				/>
			</button>

			{open && (
				<div
					role="dialog"
					aria-label="Boxes to include"
					className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl sm:w-80 md:w-96"
				>
					<div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2.5">
						<div className="min-w-0">
							<div className="text-sm font-semibold text-neutral-800">
								Boxes to Include
							</div>
							<div className="text-xs text-neutral-500">
								{selectedCount} of {options.length} selected
							</div>
						</div>
						<SelectAllCheckbox
							state={selectAllState}
							label={selectAllState === "all" ? "Deselect all" : "Select all"}
							onChange={(checked) =>
								onExcludedBoxIdsChange(
									setAllCurrentBoxesSelected(excludedBoxIds, options, checked),
								)
							}
						/>
					</div>

					<div className="p-2.5">
						<div className="relative">
							<Search
								className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400"
								aria-hidden="true"
							/>
							<input
								type="search"
								value={search}
								onChange={handleSearchChange}
								placeholder="Search boxes..."
								aria-label="Search boxes"
								className="w-full rounded-md border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-800 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
							/>
						</div>

						<div
							ref={listRef}
							onScroll={handleListScroll}
							aria-busy={isListScrolling}
							data-testid="box-selection-list"
							className="relative mt-2 max-h-[min(52dvh,22rem)] overflow-y-auto overscroll-contain rounded-md border border-neutral-200 bg-neutral-50"
							style={{ contain: "layout paint style" }}
						>
							<div
								aria-hidden="true"
								className={`sticky top-0 z-20 h-0.5 overflow-hidden bg-transparent transition-opacity ${
									isListScrolling ? "opacity-100" : "opacity-0"
								}`}
							>
								<div className="h-full w-full animate-pulse bg-primary-500" />
							</div>

							{options.length === 0 ? (
								<div className="px-3 py-5 text-center text-xs italic text-neutral-400">
									No boxes available for the current filters.
								</div>
							) : visibleOptions.length === 0 ? (
								<div className="px-3 py-5 text-center text-xs italic text-neutral-400">
									No boxes match your search.
								</div>
							) : (
								<div className="p-1">
									{topSpacerHeight > 0 && (
										<div style={{ height: topSpacerHeight }} aria-hidden="true" />
									)}
									{renderedOptions.map((option) => {
										const checked = !excludedBoxIds.has(option.id);
										return (
											<label
												key={option.id}
												className={`flex h-11 min-w-0 cursor-pointer items-center gap-2 rounded px-2 transition-colors ${
													checked
														? "hover:bg-primary-50"
														: "bg-neutral-100 hover:bg-neutral-200"
												}`}
											>
												<input
													type="checkbox"
													checked={checked}
													onChange={() => toggleBox(option.id)}
													className="size-4 shrink-0 cursor-pointer accent-primary-600"
												/>
												<span className="min-w-0 flex-1">
													<span className="block truncate text-xs font-semibold text-neutral-800">
														{option.label}
													</span>
													{option.meta && (
														<span className="block truncate text-[0.7rem] text-neutral-500">
															{option.meta}
														</span>
													)}
												</span>
											</label>
										);
									})}
									{bottomSpacerHeight > 0 && (
										<div style={{ height: bottomSpacerHeight }} aria-hidden="true" />
									)}
								</div>
							)}
						</div>
						{isVirtualized && (
							<div className="mt-1.5 text-right text-[0.65rem] text-neutral-400">
								Smooth list · {visibleOptions.length} boxes
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
