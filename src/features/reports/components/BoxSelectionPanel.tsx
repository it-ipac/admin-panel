import { Search } from "lucide-react";
import React, { useMemo, useState } from "react";
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
	const [search, setSearch] = useState("");
	const normalizedSearch = search.trim().toLowerCase();

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
		<section className="shrink-0 border-b border-neutral-200 bg-white px-3 py-2 sm:px-4 sm:py-2.5 lg:px-5">
			<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
				<div className="w-full min-w-0 sm:w-auto sm:flex-1 lg:flex-none">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<h3 className="text-sm font-semibold text-neutral-800 sm:text-base lg:text-sm">
							Boxes to Include
						</h3>
						<span className="whitespace-nowrap rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
							{selectedCount} / {options.length} selected
						</span>
					</div>
				</div>

				<div className="relative w-full min-w-0 sm:flex-1 md:max-w-md lg:max-w-lg xl:max-w-xl">
					<Search
						className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400 sm:size-4"
						aria-hidden="true"
					/>
					<input
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search boxes..."
						aria-label="Search boxes"
						className="w-full rounded-md border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-sm text-neutral-800 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 sm:text-xs"
					/>
				</div>

				<div className="flex w-full justify-end sm:ml-auto sm:w-auto">
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
			</div>

			{options.length === 0 ? (
				<div className="mt-2 text-xs italic text-neutral-400">
					No boxes available for the current filters.
				</div>
			) : (
				<div className="mt-2 max-h-[24dvh] overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-1 sm:max-h-40 lg:max-h-36 xl:max-h-44">
					{visibleOptions.length === 0 ? (
						<div className="px-2 py-3 text-center text-xs italic text-neutral-400">
							No boxes match your search.
						</div>
					) : (
						<div className="grid grid-cols-1 gap-0.5 md:grid-cols-2 2xl:grid-cols-3">
							{visibleOptions.map((option) => {
								const checked = !excludedBoxIds.has(option.id);
								return (
									<label
										key={option.id}
										className="flex min-w-0 cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-white sm:py-1.5"
									>
										<input
											type="checkbox"
											checked={checked}
											onChange={() => toggleBox(option.id)}
											className="size-4 shrink-0 cursor-pointer accent-primary-600"
										/>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium text-neutral-800 sm:text-xs">
												{option.label}
											</span>
											{option.meta && (
												<span className="block truncate text-xs text-neutral-400 sm:text-[0.7rem]">
													{option.meta}
												</span>
											)}
										</span>
									</label>
								);
							})}
						</div>
					)}
				</div>
			)}
		</section>
	);
};
