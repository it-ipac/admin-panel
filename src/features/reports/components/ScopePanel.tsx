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
import { getBoxTags } from "../utils";

interface ScopePanelProps {
	filters: FilterParams;
	setFilters: React.Dispatch<React.SetStateAction<FilterParams>>;
}

// ─── Reusable sort-priority card ────────────────────────────────────────────

interface SortPriorityCardProps {
	title: string;
	description?: string;
	activeTerms: string[];
	availableTerms: string[];
	accentClass: string; // e.g. "hover:border-blue-400 dark:hover:border-blue-500/80"
	accentIconClass: string; // e.g. "text-blue-400"
	onMove: (idx: number, dir: "up" | "down") => void;
	onRemove: (idx: number) => void;
	onAdd: (term: string) => void;
	customInput?: React.ReactNode;
}

const SortPriorityCard: React.FC<SortPriorityCardProps> = ({
	title,
	description,
	activeTerms,
	availableTerms,
	accentClass,
	accentIconClass,
	onMove,
	onRemove,
	onAdd,
	customInput,
}) => (
	<div className="flex flex-col gap-2 p-2 bg-white dark:bg-slate-900/60 border border-gray-200/60 dark:border-slate-800/60 rounded-lg shadow-sm backdrop-blur-sm">
		<div>
			<span className="text-xs font-bold text-gray-800 dark:text-slate-200 tracking-wide">
				{title}
			</span>
			{description && (
				<p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 leading-tight">
					{description}
				</p>
			)}
		</div>

		{/* Active order */}
		<div className="flex flex-col gap-1.5">
			<span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
				Active Sort Order
			</span>
			{activeTerms.length === 0 ? (
				<div className="text-xs text-gray-400 dark:text-slate-400 italic p-2 bg-gray-100 dark:bg-slate-800/30 border border-dashed border-gray-300 dark:border-slate-700 rounded-lg text-center">
					No sort applied — uses default order.
				</div>
			) : (
				<div className="flex flex-col gap-1">
					{activeTerms.map((term, idx) => (
						<div
							key={`${term}-${idx}`}
							className="flex items-center justify-between bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 rounded-lg px-2 py-1 shadow-sm text-xs group hover:border-gray-300 dark:hover:border-slate-600 transition-all duration-150"
						>
							<span className="font-semibold text-gray-800 dark:text-slate-100">
								{term}
							</span>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => onMove(idx, "up")}
									disabled={idx === 0}
									className="p-0.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
									title="Move Up"
								>
									<ChevronUp className="w-3.5 h-3.5" />
								</button>
								<button
									type="button"
									onClick={() => onMove(idx, "down")}
									disabled={idx === activeTerms.length - 1}
									className="p-0.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
									title="Move Down"
								>
									<ChevronDown className="w-3.5 h-3.5" />
								</button>
								<div className="w-[1px] h-3 bg-gray-200 dark:bg-slate-700 mx-0.5" />
								<button
									type="button"
									onClick={() => onRemove(idx)}
									className="p-0.5 hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 rounded text-gray-400 dark:text-slate-400 transition-colors cursor-pointer"
									title="Remove"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>

		{/* Available pool */}
		{availableTerms.length > 0 && (
			<div className="flex flex-col gap-1.5 mt-0.5">
				<span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
					Available (Click to add)
				</span>
				<div className="flex flex-wrap gap-1">
					{availableTerms.map((term) => (
						<button
							key={term}
							type="button"
							onClick={() => onAdd(term)}
							className={`px-2 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800/40 hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-slate-700 border-dashed ${accentClass} rounded-full transition-all duration-200 flex items-center gap-0.5 cursor-pointer transform hover:-translate-y-0.5 shadow-sm`}
						>
							<Plus className={`w-3 h-3 ${accentIconClass}`} />
							{term}
						</button>
					))}
				</div>
			</div>
		)}

		{customInput}
	</div>
);

// ─── Section header ──────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
	<div className="flex items-center gap-2 pt-1">
		<span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
			{label}
		</span>
		<div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
	</div>
);

// ─── Main component ──────────────────────────────────────────────────────────

export const ScopePanel: React.FC<ScopePanelProps> = ({
	filters,
	setFilters,
}) => {
	const { data: clients, isLoading: clientsLoading } = useClientsQuery();
	const { data: orders, isLoading: ordersLoading } = useOrdersQuery(
		filters.clientId,
	);
	const { data: projectTags } = useProjectTagsQuery(filters.clientId);
	const { data: destinations, isLoading: destLoading } = useDestinationsQuery(
		filters.clientId,
		filters.orderIds,
	);

	// Always fetch without tag filter so box picker shows all boxes and tag
	// options are derived from real instance data (not project_tags table).
	const { data: allInstancesForBoxPicker, isLoading: instancesLoading } =
		useReportInstancesQuery({
			...filters,
			boxId: null,
			tags: [],
		});

	// Unique inst.tag values present in current scope — used for the tag filter UI using fallback helper
	const availableInstanceTags = useMemo(() => {
		if (!allInstancesForBoxPicker) return [];
		const seen = new Set<string>();
		for (const inst of allInstancesForBoxPicker) {
			const instTags = getBoxTags(inst);
			for (const t of instTags) {
				seen.add(t);
			}
		}
		return Array.from(seen).sort();
	}, [allInstancesForBoxPicker]);

	const [orderFilterDest, setOrderFilterDest] = useState<string>("");

	const handleChange = (key: keyof FilterParams, value: any) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	// ── Tag sort priority ──────────────────────────────────────────────────────

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

	const [customTagInput, setCustomTagInput] = useState("");
	const handleAddCustomTag = () => {
		const trimmed = customTagInput.trim();
		if (trimmed) {
			if (
				!customTagsPool.some((t) => t.toLowerCase() === trimmed.toLowerCase())
			) {
				setCustomTagsPool((prev) => [...prev, trimmed]);
			}
			if (!activeTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
				updateTagPriority([...activeTags, trimmed]);
			}
			setCustomTagInput("");
		}
	};

	const handleTagSortMove = (idx: number, dir: "up" | "down") => {
		const next = [...activeTags];
		if (dir === "up" && idx > 0) {
			[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
		} else if (dir === "down" && idx < next.length - 1) {
			[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
		}
		updateTagPriority(next);
	};

	const removeTagFromSort = (idx: number) => {
		const next = [...activeTags];
		next.splice(idx, 1);
		updateTagPriority(next);
	};

	const addTagToSort = (tagName: string) => {
		if (!activeTags.some((t) => t.toLowerCase() === tagName.toLowerCase())) {
			updateTagPriority([...activeTags, tagName]);
		}
	};

	// ── Destination sort priority ──────────────────────────────────────────────

	const activeDestTerms = useMemo(() => {
		return (filters.destSortPriority || "")
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
	}, [filters.destSortPriority]);

	const updateDestSortPriority = (newTerms: string[]) => {
		handleChange("destSortPriority", newTerms.join(", "));
	};

	const availableDestSortTerms = useMemo(() => {
		if (!destinations) return [];
		return destinations.filter(
			(d) => !activeDestTerms.some((t) => t.toLowerCase() === d.toLowerCase()),
		);
	}, [destinations, activeDestTerms]);

	const handleDestSortMove = (idx: number, dir: "up" | "down") => {
		const next = [...activeDestTerms];
		if (dir === "up" && idx > 0) {
			[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
		} else if (dir === "down" && idx < next.length - 1) {
			[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
		}
		updateDestSortPriority(next);
	};

	const removeDestFromSort = (idx: number) => {
		const next = [...activeDestTerms];
		next.splice(idx, 1);
		updateDestSortPriority(next);
	};

	const addDestToSort = (destName: string) => {
		if (
			!activeDestTerms.some((t) => t.toLowerCase() === destName.toLowerCase())
		) {
			updateDestSortPriority([...activeDestTerms, destName]);
		}
	};

	// ── Array filter toggle ────────────────────────────────────────────────────

	const handleArrayChange = (key: keyof FilterParams, value: string) => {
		setFilters((prev) => {
			const current = prev[key] as string[];
			if (current.includes(value)) {
				return { ...prev, [key]: current.filter((v) => v !== value) };
			}
			return { ...prev, [key]: [...current, value] };
		});
	};

	// ── Order picker helpers ───────────────────────────────────────────────────

	const { data: allDestinations } = useDestinationsQuery(filters.clientId, []);

	const visibleOrders = useMemo(() => {
		if (!orders) return [];
		const list = [...orders];
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
			setFilters((prev) => ({
				...prev,
				orderIds: prev.orderIds.filter((id) => !allOrderIds.includes(id)),
				boxId: null,
			}));
		} else {
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
			return { ...prev, orderIds: nextOrderIds, boxId: null };
		});
	};

	const selectedCount = filters.orderIds.length;

	// ─────────────────────────────────────────────────────────────────────────
	return (
		<div className="flex flex-col gap-4">
			{/* ── SCOPE ─────────────────────────────────────────────────────── */}

			{/* Client */}
			<div className="flex flex-col gap-1">
				<label
					htmlFor="client-select"
					className="text-sm font-medium text-gray-700 dark:text-slate-300"
				>
					Client
				</label>
				<select
					id="client-select"
					className="w-full border rounded-md p-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
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

			{/* Orders */}
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-gray-700 dark:text-slate-300">
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

				{filters.clientId && (
					<div className="flex gap-2 items-center flex-wrap">
						<select
							className="text-xs border rounded px-1.5 py-1 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-gray-600"
							value={filters.orderSort}
							onChange={(e) => handleChange("orderSort", e.target.value as any)}
						>
							<option value="name">Sort: Name</option>
							<option value="reference">Sort: Reference</option>
						</select>
						{allDestinations && allDestinations.length > 0 && (
							<select
								className="text-xs border rounded px-1.5 py-1 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-gray-600"
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

				{!filters.clientId ? (
					<div className="text-xs text-gray-400 italic">
						Select a client first
					</div>
				) : ordersLoading ? (
					<div className="text-xs text-gray-500 animate-pulse">Loading...</div>
				) : visibleOrders.length === 0 ? (
					<div className="text-xs text-gray-400 italic">No orders found</div>
				) : (
					<div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto border rounded-md bg-gray-50 dark:bg-slate-800/30 dark:border-slate-700 p-1">
						{visibleOrders.map((o) => {
							const isSelected = filters.orderIds.includes(o.id);
							return (
								<button
									key={o.id}
									type="button"
									onClick={() => toggleOrder(o.id)}
									className={`flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded text-sm transition-colors ${
										isSelected
											? "bg-blue-100 border border-blue-300 text-blue-900 font-medium dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200"
											: "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-transparent"
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

			{/* Specific Box */}
			{filters.clientId && (
				<div className="flex flex-col gap-1">
					<label
						htmlFor="box-select"
						className="text-sm font-medium text-gray-700 dark:text-slate-300"
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
							className="w-full border rounded-md p-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
							value={filters.boxId || ""}
							onChange={(e) => handleChange("boxId", e.target.value || null)}
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

			{/* ── OPTIONS ───────────────────────────────────────────────────── */}
			<SectionHeader label="Options" />

			{/* Package Status */}
			<div className="flex flex-col gap-1">
				<label
					htmlFor="package-filter-select"
					className="text-sm font-medium text-gray-700 dark:text-slate-300"
				>
					Package Status
				</label>
				<select
					id="package-filter-select"
					className="w-full border rounded-md p-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
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

			{/* Split Report By */}
			<div className="flex flex-col gap-1">
				<label
					htmlFor="split-by"
					className="text-sm font-medium text-gray-700 dark:text-slate-300"
				>
					Split Report By
				</label>
				<select
					id="split-by"
					className="w-full border rounded-md p-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
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
						Each selected order becomes its own independent report.
					</p>
				)}
				{filters.splitBy !== "none" &&
					filters.splitBy !== "report_per_order" && (
						<p className="text-xs text-blue-600 mt-1">
							Each section will have its own page break when printing.
						</p>
					)}
			</div>

			{/* ── FILTERS ───────────────────────────────────────────────────── */}
			<div className="flex flex-col gap-2 px-2 pb-2 pt-0 bg-gradient-to-b from-emerald-500/10 via-emerald-500/3 to-transparent dark:from-emerald-500/15 dark:via-emerald-500/3 dark:to-transparent border border-emerald-100/70 dark:border-emerald-900/30 rounded-lg overflow-hidden">
				<div className="h-[3px] -mx-2 bg-emerald-500/80" />
				<div className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest pl-1 pt-1.5">
					Filters
				</div>

				{/* Date Range */}
				<div className="flex flex-col gap-1.5 p-2 bg-white dark:bg-slate-900/60 border border-gray-200/60 dark:border-slate-800/60 rounded-lg shadow-sm">
					<span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
						Date Range
					</span>
					<div className="flex gap-3 mb-0.5">
						<label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
							<input
								type="radio"
								checked={filters.dateFilterMode === "item_packed_at"}
								onChange={() =>
									handleChange("dateFilterMode", "item_packed_at")
								}
							/>
							Packed Date
						</label>
						<label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
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
						<div className="flex-1 flex flex-col gap-0.5">
							<label htmlFor="date-from" className="text-[10px] text-gray-400">
								From
							</label>
							<input
								id="date-from"
								type="date"
								className="border p-1 rounded-md text-xs w-full dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
								value={filters.dateFrom || ""}
								onChange={(e) =>
									handleChange("dateFrom", e.target.value || null)
								}
							/>
						</div>
						<div className="flex-1 flex flex-col gap-0.5">
							<label htmlFor="date-to" className="text-[10px] text-gray-400">
								To
							</label>
							<input
								id="date-to"
								type="date"
								className="border p-1 rounded-md text-xs w-full dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
								value={filters.dateTo || ""}
								onChange={(e) => handleChange("dateTo", e.target.value || null)}
							/>
						</div>
					</div>
				</div>

				{/* Destinations filter */}
				<div className="flex flex-col gap-1.5">
					<div className="flex justify-between items-center pl-1">
						<span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
							Destination Filter
						</span>
						{destinations && destinations.length > 0 && (
							<div className="flex gap-2 text-xs">
								<button
									type="button"
									onClick={() => handleChange("destinations", destinations)}
									className="text-blue-600 hover:underline text-[10px] font-semibold"
								>
									All
								</button>
								<button
									type="button"
									onClick={() => handleChange("destinations", [])}
									className="text-gray-500 hover:underline text-[10px] font-semibold"
								>
									None
								</button>
							</div>
						)}
					</div>
					{destLoading ? (
						<div className="text-xs text-gray-500 animate-pulse pl-1">
							Loading...
						</div>
					) : destinations && destinations.length > 0 ? (
						<div className="flex flex-col gap-1 max-h-32 overflow-y-auto p-1.5 border border-gray-200/60 dark:border-slate-800/60 rounded-lg bg-white dark:bg-slate-900/60 shadow-sm">
							{destinations.map((d) => (
								<label
									key={d}
									className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300 cursor-pointer py-0.5"
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
						<div className="text-xs text-gray-400 italic pl-1">
							{filters.clientId
								? "No destinations found"
								: "Select a client first"}
						</div>
					)}
				</div>

				{/* Box Tag filter — derived from actual inst.tag values */}
				<div className="flex flex-col gap-1.5">
					<div className="flex justify-between items-center pl-1">
						<span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
							Tag Filter
						</span>
						{filters.tags.length > 0 && (
							<button
								type="button"
								onClick={() => handleChange("tags", [])}
								className="text-[10px] font-semibold text-gray-500 hover:underline"
							>
								Clear
							</button>
						)}
					</div>
					{instancesLoading ? (
						<div className="text-xs text-gray-500 animate-pulse pl-1">
							Loading...
						</div>
					) : availableInstanceTags.length > 0 ? (
						<div className="flex flex-wrap gap-1 p-1.5 border border-gray-200/60 dark:border-slate-800/60 rounded-lg bg-white dark:bg-slate-900/60 shadow-sm">
							{availableInstanceTags.map((tagName) => {
								const isSelected = filters.tags.includes(tagName);
								return (
									<button
										key={tagName}
										type="button"
										onClick={() => handleArrayChange("tags", tagName)}
										className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
											isSelected
												? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-600 dark:text-blue-300"
												: "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
										}`}
									>
										{tagName}
									</button>
								);
							})}
						</div>
					) : (
						<div className="text-xs text-gray-400 italic pl-1">
							{filters.clientId
								? "No tagged boxes in current scope"
								: "Select a client first"}
						</div>
					)}
				</div>
			</div>

			{/* ── SORT ──────────────────────────────────────────────────────── */}
			<div className="flex flex-col gap-2 px-2 pb-2 pt-0 bg-gradient-to-b from-blue-500/10 via-blue-500/3 to-transparent dark:from-blue-500/15 dark:via-blue-500/3 dark:to-transparent border border-blue-100/70 dark:border-blue-900/30 rounded-lg overflow-hidden">
				<div className="h-[3px] -mx-2 bg-blue-500/80" />
				<div className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-widest pl-1 pt-1.5">
					Sort
				</div>

				{/* Sort Mode Selection */}
				<div className="flex flex-col gap-1.5 pl-1">
					<label
						htmlFor="sort-mode"
						className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest"
					>
						Sort Mode Priority
					</label>
					<select
						id="sort-mode"
						className="w-full border border-gray-200/80 dark:border-slate-800/80 rounded-lg p-1.5 text-xs bg-white dark:bg-slate-800 dark:text-slate-200 shadow-sm"
						value={filters.sortMode || "destination_first"}
						onChange={(e) => handleChange("sortMode", e.target.value)}
					>
						<option value="destination_first">
							Destination First (Default)
						</option>
						<option value="tag_first">Tag Group First (Tag Priority)</option>
						<option value="tag_combination">Tag Combination First</option>
					</select>
				</div>

				{/* Sort by Tag Priority */}
				<SortPriorityCard
					title="Sort by Tag"
					description="Sorts boxes by their tag (e.g. power, water, ac). Higher in list = appears first."
					activeTerms={activeTags}
					availableTerms={availableTags}
					accentClass="hover:border-blue-400 dark:hover:border-blue-500/80"
					accentIconClass="text-blue-400"
					onMove={handleTagSortMove}
					onRemove={removeTagFromSort}
					onAdd={addTagToSort}
					customInput={
						<div className="flex flex-col gap-1.5 mt-0.5">
							<span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
								Or add custom tag
							</span>
							<div className="flex gap-1.5">
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
									className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-150"
								/>
								<button
									type="button"
									onClick={handleAddCustomTag}
									className="px-2 py-1 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg flex items-center gap-0.5 transition-all duration-150 cursor-pointer hover:border-gray-400 dark:hover:border-slate-500 shadow-sm"
								>
									<Plus className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400" />
									Add
								</button>
							</div>
						</div>
					}
				/>

				{/* Sort by Destination Priority */}
				<SortPriorityCard
					title="Sort by Destination"
					description="Sorts boxes by destination. Higher in list = appears first. Only destinations for the selected orders appear."
					activeTerms={activeDestTerms}
					availableTerms={availableDestSortTerms}
					accentClass="hover:border-emerald-400 dark:hover:border-emerald-500/80"
					accentIconClass="text-emerald-400"
					onMove={handleDestSortMove}
					onRemove={removeDestFromSort}
					onAdd={addDestToSort}
				/>
			</div>
		</div>
	);
};
