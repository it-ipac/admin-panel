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
	const rootRef = useRef<HTMLDivElement>(null);
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

	const toggleBox = (id: string) => {
		const next = new Set(excludedBoxIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		onExcludedBoxIdsChange(next);
	};

	return (
		<div ref={rootRef} className="relative inline-block">
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				aria-expanded={open}
				aria-haspopup="dialog"
				className="flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-neutral-900"
			>
				<span>Boxes</span>
				<span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[0.7rem] font-semibold text-neutral-600">
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
					<div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-3 py-2.5">
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
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search boxes..."
								aria-label="Search boxes"
								className="w-full rounded-md border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-800 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
							/>
						</div>

						<div className="mt-2 max-h-[min(52dvh,22rem)] overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-1">
							{options.length === 0 ? (
								<div className="px-2 py-4 text-center text-xs italic text-neutral-400">
									No boxes available for the current filters.
								</div>
							) : visibleOptions.length === 0 ? (
								<div className="px-2 py-4 text-center text-xs italic text-neutral-400">
									No boxes match your search.
								</div>
							) : (
								visibleOptions.map((option) => {
									const checked = !excludedBoxIds.has(option.id);
									return (
										<label
											key={option.id}
											className="flex min-w-0 cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-white"
										>
											<input
												type="checkbox"
												checked={checked}
												onChange={() => toggleBox(option.id)}
												className="size-4 shrink-0 cursor-pointer accent-primary-600"
											/>
											<span className="min-w-0 flex-1">
												<span className="block truncate text-xs font-medium text-neutral-800">
													{option.label}
												</span>
												{option.meta && (
													<span className="block truncate text-[0.7rem] text-neutral-400">
														{option.meta}
													</span>
												)}
											</span>
										</label>
									);
								})
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
