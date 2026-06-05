import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import {
	useClientsQuery,
	useDestinationsQuery,
	useOrdersQuery,
	useProjectTagsQuery,
	useReportInstancesQuery,
} from "../hooks/useReportBuilderQueries";
import type { FilterParams } from "../types";

interface ScopePanelProps {
	filters: FilterParams;
	setFilters: React.Dispatch<React.SetStateAction<FilterParams>>;
}

export const ScopePanel: React.FC<ScopePanelProps> = ({
	filters,
	setFilters,
}) => {
	const { data: clients, isLoading: clientsLoading } = useClientsQuery();
	const { data: orders, isLoading: ordersLoading } = useOrdersQuery(
		filters.clientId,
	);
	const { data: projectTags, isLoading: tagsLoading } = useProjectTagsQuery(
		filters.clientId,
	);
	const { data: destinations, isLoading: destLoading } = useDestinationsQuery(
		filters.clientId,
		filters.orderIds,
	);

	// Fetch all instances matching client/orders to populate the box filter dropdown
	const { data: allInstancesForBoxPicker, isLoading: instancesLoading } =
		useReportInstancesQuery({
			...filters,
			boxId: null, // Always fetch all boxes to choose from
		});

	// Local state: filter the order picker list by destination
	const [orderFilterDest, setOrderFilterDest] = useState<string>("");

	const handleChange = (key: keyof FilterParams, value: any) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const activeTags = useMemo(() => {
		return (filters.tagSortPriority || "")
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
	}, [filters.tagSortPriority]);

	const updateTagPriority = (newTags: string[]) => {
		handleChange("tagSortPriority", newTags.join(", "));
	};

	const [customTagsPool, setCustomTagsPool] = useState<string[]>([]);

	const allCandidateTags = useMemo(() => {
		const baseCandidates = ["power", "water", "ac", "non-ac"];
		const projectCandidates = projectTags?.map((pt) => pt.name) || [];
		const combined = [
			...baseCandidates,
			...projectCandidates,
			...customTagsPool.filter((t) => {
				const isDest = destinations?.some(
					(d) => d.toLowerCase() === t.toLowerCase(),
				);
				return !isDest;
			}),
		];

		const seen = new Set<string>();
		const unique: string[] = [];
		for (const tag of combined) {
			const lower = tag.trim().toLowerCase();
			if (lower && !seen.has(lower)) {
				seen.add(lower);
				unique.push(tag.trim());
			}
		}
		return unique;
	}, [projectTags, customTagsPool, destinations]);

	const availableTags = useMemo(() => {
		return allCandidateTags.filter(
			(tag) => !activeTags.some((at) => at.toLowerCase() === tag.toLowerCase()),
		);
	}, [allCandidateTags, activeTags]);

	const availableDestinations = useMemo(() => {
		if (!destinations) return [];
		return destinations.filter(
			(dest) =>
				!activeTags.some((at) => at.toLowerCase() === dest.toLowerCase()),
		);
	}, [destinations, activeTags]);

	const addTagToSort = (tagName: string) => {
		if (!activeTags.some((t) => t.toLowerCase() === tagName.toLowerCase())) {
			updateTagPriority([...activeTags, tagName]);
		}
	};

	const removeTagFromSort = (index: number) => {
		const next = [...activeTags];
		next.splice(index, 1);
		updateTagPriority(next);
	};

	const moveTagLeft = (index: number) => {
		if (index === 0) return;
		const next = [...activeTags];
		const temp = next[index];
		next[index] = next[index - 1];
		next[index - 1] = temp;
		updateTagPriority(next);
	};

	const moveTagRight = (index: number) => {
		if (index === activeTags.length - 1) return;
		const next = [...activeTags];
		const temp = next[index];
		next[index] = next[index + 1];
		next[index + 1] = temp;
		updateTagPriority(next);
	};

	const [customTagInput, setCustomTagInput] = useState("");
	const handleAddCustomTag = () => {
		const trimmed = customTagInput.trim();
		if (trimmed) {
			if (
				!customTagsPool.some((t) => t.toLowerCase() === trimmed.toLowerCase())
			) {
				setCustomTagsPool((prev) => [...prev, trimmed]);
			}
			addTagToSort(trimmed);
			setCustomTagInput("");
		}
	};

	const handleArrayChange = (key: keyof FilterParams, value: string) => {
		setFilters((prev) => {
			const current = prev[key] as string[];
			if (current.includes(value)) {
				return { ...prev, [key]: current.filter((v) => v !== value) };
			}
			return { ...prev, [key]: [...current, value] };
		});
	};

	// All destinations available across all instances (for order-picker filter)
	const { data: allDestinations } = useDestinationsQuery(filters.clientId, []);

	// Sorted + filtered order list for the picker
	const visibleOrders = useMemo(() => {
		if (!orders) return [];
		const list = [...orders];

		// Sort
		if (filters.orderSort === "reference") {
			list.sort((a, b) =>
				(a.reference || a.order_name).localeCompare(
					b.reference || b.order_name,
				),
			);
		} else {
			list.sort((a, b) => a.order_name.localeCompare(b.order_name));
		}

		return list;
	}, [orders, filters.orderSort]);

	const allOrderIds = useMemo(
		() => visibleOrders.map((o) => o.id),
		[visibleOrders],
	);

	const allSelected =
		allOrderIds.length > 0 &&
		allOrderIds.every((id) => filters.orderIds.includes(id));

	const toggleAllOrders = () => {
		if (allSelected) {
			// Deselect all visible orders
			setFilters((prev) => ({
				...prev,
				orderIds: prev.orderIds.filter((id) => !allOrderIds.includes(id)),
				boxId: null,
			}));
		} else {
			// Select all visible orders (merge with any already selected from other filters)
			setFilters((prev) => ({
				...prev,
				orderIds: Array.from(new Set([...prev.orderIds, ...allOrderIds])),
				boxId: null,
			}));
		}
	};

	const toggleOrder = (id: string) => {
		setFilters((prev) => {
			const current = prev.orderIds;
			const nextOrderIds = current.includes(id)
				? current.filter((v) => v !== id)
				: [...current, id];
			return {
				...prev,
				orderIds: nextOrderIds,
				boxId: null,
			};
		});
	};

	const selectedCount = filters.orderIds.length;

	return (
		<div className="flex flex-col gap-4">
			{/* Client Selection */}
			<div className="flex flex-col gap-1">
				<label
					htmlFor="client-select"
					className="text-sm font-medium text-gray-700"
				>
					Client
				</label>
				<select
					id="client-select"
					className="w-full border rounded-md p-2 text-sm bg-white"
					value={filters.clientId || ""}
					onChange={(e) => {
						setFilters((prev) => ({
							...prev,
							clientId: e.target.value || null,
							orderIds: [],
							tags: [],
							destinations: [],
							boxId: null,
						}));
					}}
					disabled={clientsLoading}
				>
					<option value="">— Select Client —</option>
					{clients?.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>
			</div>

			{/* Order Picker */}
			<div className="flex flex-col gap-1">
				{/* Header row */}
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-gray-700">
						Orders / Projects
						{selectedCount > 0 && (
							<span className="ml-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
								{selectedCount}
							</span>
						)}
					</span>
					<div className="flex items-center gap-2 text-xs">
						<button
							type="button"
							onClick={toggleAllOrders}
							disabled={!filters.clientId || ordersLoading}
							className="text-blue-600 hover:underline disabled:opacity-40 font-medium"
						>
							{allSelected ? "Deselect All" : "All"}
						</button>
						{selectedCount > 0 && (
							<button
								type="button"
								onClick={() => handleChange("orderIds", [])}
								className="text-gray-500 hover:underline"
							>
								None
							</button>
						)}
					</div>
				</div>

				{/* Sort + filter controls */}
				{filters.clientId && (
					<div className="flex gap-2 items-center flex-wrap">
						<select
							className="text-xs border rounded px-1.5 py-1 bg-white text-gray-600"
							value={filters.orderSort}
							onChange={(e) => handleChange("orderSort", e.target.value as any)}
						>
							<option value="name">Sort: Name</option>
							<option value="reference">Sort: Reference</option>
						</select>
						{allDestinations && allDestinations.length > 0 && (
							<select
								className="text-xs border rounded px-1.5 py-1 bg-white text-gray-600"
								value={orderFilterDest}
								onChange={(e) => setOrderFilterDest(e.target.value)}
							>
								<option value="">All Destinations</option>
								{allDestinations.map((d) => (
									<option key={d} value={d}>
										{d}
									</option>
								))}
							</select>
						)}
					</div>
				)}

				{/* Order list */}
				{!filters.clientId ? (
					<div className="text-xs text-gray-400 italic">
						Select a client first
					</div>
				) : ordersLoading ? (
					<div className="text-xs text-gray-500 animate-pulse">Loading...</div>
				) : visibleOrders.length === 0 ? (
					<div className="text-xs text-gray-400 italic">No orders found</div>
				) : (
					<div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto border rounded-md bg-gray-50 p-1">
						{visibleOrders.map((o) => {
							const isSelected = filters.orderIds.includes(o.id);
							return (
								<button
									key={o.id}
									type="button"
									onClick={() => toggleOrder(o.id)}
									className={`flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded text-sm transition-colors ${
										isSelected
											? "bg-blue-100 border border-blue-300 text-blue-900 font-medium"
											: "hover:bg-gray-100 text-gray-700 border border-transparent"
									}`}
								>
									<span className="truncate">
										{o.order_name}
										{o.reference && (
											<span className="ml-1.5 text-xs text-gray-400 font-normal">
												({o.reference})
											</span>
										)}
									</span>
									{isSelected && (
										<span className="ml-2 shrink-0 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
											✓
										</span>
									)}
								</button>
							);
						})}
					</div>
				)}

				{/* Selected orders summary (when multiple) */}
				{filters.orderIds.length > 1 && (
					<p className="text-xs text-blue-600 font-medium">
						{filters.orderIds.length} orders selected — boxes from all will
						appear in report
					</p>
				)}
				{filters.orderIds.length === 0 && filters.clientId && (
					<p className="text-xs text-gray-400 italic">
						No orders selected — showing all orders for client
					</p>
				)}
			</div>

			{/* Specific Box Filter */}
			{filters.clientId && (
				<div className="flex flex-col gap-1">
					<label
						htmlFor="box-select"
						className="text-sm font-medium text-gray-700"
					>
						Specific Box Filter
					</label>
					{instancesLoading ? (
						<div className="h-10 bg-gray-50 animate-pulse rounded-lg" />
					) : !allInstancesForBoxPicker ||
						allInstancesForBoxPicker.length === 0 ? (
						<div className="text-xs text-gray-400 italic">
							No boxes found for current filters
						</div>
					) : (
						<select
							id="box-select"
							className="w-full border rounded-md p-2 text-sm bg-white"
							value={filters.boxId || ""}
							onChange={(e) => {
								handleChange("boxId", e.target.value || null);
							}}
						>
							<option value="">— All Boxes —</option>
							{allInstancesForBoxPicker.map((inst) => {
								const label = `Box ${inst.package_number}${
									inst.instance_number > 1
										? ` (Inst ${inst.instance_number})`
										: ""
								}${inst.package_reference ? ` - ${inst.package_reference}` : ""}`;
								return (
									<option key={inst.id} value={inst.id}>
										{label}
									</option>
								);
							})}
						</select>
					)}
				</div>
			)}

			{/* Date Filtering */}
			<div className="flex flex-col gap-2 p-3 bg-gray-50 border rounded-md">
				<span className="text-sm font-semibold text-gray-700">Date Range</span>
				<div className="flex gap-3 mb-1">
					<label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
						<input
							type="radio"
							checked={filters.dateFilterMode === "item_packed_at"}
							onChange={() => handleChange("dateFilterMode", "item_packed_at")}
						/>
						Packed Date
					</label>
					<label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
						<input
							type="radio"
							checked={filters.dateFilterMode === "instance_created_at"}
							onChange={() =>
								handleChange("dateFilterMode", "instance_created_at")
							}
						/>
						Box Created Date
					</label>
				</div>
				<div className="flex gap-2">
					<div className="flex-1 flex flex-col gap-1">
						<label htmlFor="date-from" className="text-xs text-gray-400">
							From
						</label>
						<input
							id="date-from"
							type="date"
							className="border p-1.5 rounded-md text-sm w-full"
							value={filters.dateFrom || ""}
							onChange={(e) => handleChange("dateFrom", e.target.value || null)}
						/>
					</div>
					<div className="flex-1 flex flex-col gap-1">
						<label htmlFor="date-to" className="text-xs text-gray-400">
							To
						</label>
						<input
							id="date-to"
							type="date"
							className="border p-1.5 rounded-md text-sm w-full"
							value={filters.dateTo || ""}
							onChange={(e) => handleChange("dateTo", e.target.value || null)}
						/>
					</div>
				</div>
			</div>

			{/* Dynamic Destinations */}
			<div className="flex flex-col gap-1">
				<div className="flex justify-between items-center">
					<span className="text-sm font-medium text-gray-700">
						Destinations
					</span>
					{destinations && destinations.length > 0 && (
						<div className="flex gap-2 text-xs">
							<button
								type="button"
								onClick={() => handleChange("destinations", destinations)}
								className="text-blue-600 hover:underline"
							>
								All
							</button>
							<button
								type="button"
								onClick={() => handleChange("destinations", [])}
								className="text-gray-500 hover:underline"
							>
								None
							</button>
						</div>
					)}
				</div>
				{destLoading ? (
					<div className="text-xs text-gray-500 animate-pulse">Loading...</div>
				) : destinations && destinations.length > 0 ? (
					<div className="flex flex-col gap-1 max-h-32 overflow-y-auto p-2 border rounded-md bg-gray-50">
						{destinations.map((d) => (
							<label
								key={d}
								className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
							>
								<input
									type="checkbox"
									checked={filters.destinations.includes(d)}
									onChange={() => handleArrayChange("destinations", d)}
								/>
								{d}
							</label>
						))}
					</div>
				) : (
					<div className="text-xs text-gray-400 italic">
						{filters.clientId
							? "No destinations found"
							: "Select a client first"}
					</div>
				)}
			</div>

			{/* Dynamic Tags */}
			<div className="flex flex-col gap-1">
				<span className="text-sm font-medium text-gray-700">Project Tags</span>
				{tagsLoading ? (
					<div className="text-xs text-gray-500 animate-pulse">Loading...</div>
				) : projectTags && projectTags.length > 0 ? (
					<div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-gray-50">
						{projectTags.map((t) => {
							const isSelected = filters.tags.includes(t.id);
							return (
								<button
									key={t.id}
									type="button"
									onClick={() => handleArrayChange("tags", t.id)}
									className={`px-2 py-1 text-xs rounded-full border transition-colors ${
										isSelected
											? "bg-blue-100 border-blue-300 text-blue-800"
											: "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
									}`}
								>
									{t.name}
								</button>
							);
						})}
					</div>
				) : (
					<div className="text-xs text-gray-400 italic">
						{filters.clientId ? "No tags found" : "Select a client first"}
					</div>
				)}
			</div>

			{/* Divider */}
			<hr className="border-gray-200" />

			{/* Options */}
			<div className="flex flex-col gap-1">
				<label
					htmlFor="package-filter-select"
					className="text-sm font-medium text-gray-700"
				>
					Package Status
				</label>
				<select
					id="package-filter-select"
					className="w-full border rounded-md p-2 text-sm bg-white"
					value={
						filters.packedOnly
							? "packed"
							: filters.hasItemsOnly
								? "in_progress"
								: "all"
					}
					onChange={(e) => {
						const val = e.target.value;
						if (val === "packed") {
							setFilters((prev) => ({
								...prev,
								packedOnly: true,
								hasItemsOnly: false,
							}));
						} else if (val === "in_progress") {
							setFilters((prev) => ({
								...prev,
								packedOnly: false,
								hasItemsOnly: true,
							}));
						} else {
							setFilters((prev) => ({
								...prev,
								packedOnly: false,
								hasItemsOnly: false,
							}));
						}
					}}
				>
					<option value="packed">Packed packages</option>
					<option value="in_progress">In-progress packages</option>
					<option value="all">All</option>
				</select>
			</div>

			{/* Split / Batch Mode */}
			<div className="flex flex-col gap-1">
				<label htmlFor="split-by" className="text-sm font-medium text-gray-700">
					Split Report By
				</label>
				<select
					id="split-by"
					className="w-full border rounded-md p-2 text-sm bg-white"
					value={filters.splitBy}
					onChange={(e) => handleChange("splitBy", e.target.value as any)}
				>
					<option value="none">No Split (Single Report)</option>
					<option value="destination">
						By Destination (one section per destination)
					</option>
					<option value="order">By Order (one section per order)</option>
					<option value="report_per_order">
						Separate Report per Order (navigate independently)
					</option>
				</select>
				{filters.splitBy === "report_per_order" && (
					<p className="text-xs text-purple-600 mt-1 font-medium">
						Each selected order becomes its own independent report. Navigate
						between them in the preview toolbar.
					</p>
				)}
				{filters.splitBy !== "none" &&
					filters.splitBy !== "report_per_order" && (
						<p className="text-xs text-blue-600 mt-1">
							Each section will have its own page break when printing.
						</p>
					)}
			</div>

			{/* Tag Sort Priority Chips */}
			<div className="flex flex-col gap-3.5 p-4 bg-slate-900/40 border border-slate-800 rounded-xl shadow-lg backdrop-blur-sm">
				<span className="text-sm font-semibold text-slate-200 tracking-wide">
					Sort by Tag Priority
				</span>

				{/* Active Priority Tags */}
				<div className="flex flex-col gap-2">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
						Active Sort Order
					</span>
					{activeTags.length === 0 ? (
						<div className="text-xs text-slate-400 italic p-3 bg-slate-800/30 border border-dashed border-slate-700 rounded-lg text-center">
							No tag sorting applied. Boxes will sort by default order.
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{activeTags.map((tag, idx) => (
								<div
									key={`${tag}-${idx}`}
									className="flex items-center justify-between bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 shadow-sm text-sm group hover:border-slate-600 transition-all duration-150"
								>
									<span className="font-semibold text-slate-100">{tag}</span>
									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={() => moveTagLeft(idx)}
											disabled={idx === 0}
											className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
											title="Move Up"
										>
											<ChevronUp className="w-4 h-4" />
										</button>
										<button
											type="button"
											onClick={() => moveTagRight(idx)}
											disabled={idx === activeTags.length - 1}
											className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
											title="Move Down"
										>
											<ChevronDown className="w-4 h-4" />
										</button>
										<div className="w-[1px] h-4 bg-slate-700 mx-1" />
										<button
											type="button"
											onClick={() => removeTagFromSort(idx)}
											className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-slate-400 transition-colors cursor-pointer"
											title="Remove"
										>
											<X className="w-4 h-4" />
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Available Tags Pool */}
				{availableTags.length > 0 && (
					<div className="flex flex-col gap-2 mt-1">
						<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
							Available Tags (Click to add)
						</span>
						<div className="flex flex-wrap gap-2">
							{availableTags.map((tag) => (
								<button
									key={tag}
									type="button"
									onClick={() => addTagToSort(tag)}
									className="px-3 py-1.5 text-xs font-semibold bg-slate-800/40 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700 border-dashed hover:border-blue-500/80 rounded-full transition-all duration-200 flex items-center gap-1 cursor-pointer transform hover:-translate-y-0.5 shadow-sm"
								>
									<Plus className="w-3.5 h-3.5 text-blue-400" />
									{tag}
								</button>
							))}
						</div>
					</div>
				)}

				{/* Available Destinations Pool */}
				{availableDestinations.length > 0 && (
					<div className="flex flex-col gap-2 mt-1">
						<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
							Available Destinations (Click to add)
						</span>
						<div className="flex flex-wrap gap-2">
							{availableDestinations.map((dest) => (
								<button
									key={dest}
									type="button"
									onClick={() => addTagToSort(dest)}
									className="px-3 py-1.5 text-xs font-semibold bg-slate-800/40 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700 border-dashed hover:border-emerald-500/80 rounded-full transition-all duration-200 flex items-center gap-1 cursor-pointer transform hover:-translate-y-0.5 shadow-sm"
								>
									<Plus className="w-3.5 h-3.5 text-emerald-400" />
									{dest}
								</button>
							))}
						</div>
					</div>
				)}

				{/* Custom Tag Input */}
				<div className="flex flex-col gap-2 mt-1">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
						Or add custom tag
					</span>
					<div className="flex gap-2">
						<input
							type="text"
							placeholder="e.g. custom-tag"
							value={customTagInput}
							onChange={(e) => setCustomTagInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleAddCustomTag();
								}
							}}
							className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-150"
						/>
						<button
							type="button"
							onClick={handleAddCustomTag}
							className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg flex items-center gap-1 transition-all duration-150 cursor-pointer hover:border-slate-500 shadow-sm"
						>
							<Plus className="w-4 h-4 text-slate-400" />
							Add
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
