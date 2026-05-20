import type React from "react";
import { useMemo, useState } from "react";
import {
	useClientsQuery,
	useDestinationsQuery,
	useOrdersQuery,
	useProjectTagsQuery,
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

	// Local state: filter the order picker list by destination
	const [orderFilterDest, setOrderFilterDest] = useState<string>("");

	const handleChange = (key: keyof FilterParams, value: any) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
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
			}));
		} else {
			// Select all visible orders (merge with any already selected from other filters)
			setFilters((prev) => ({
				...prev,
				orderIds: Array.from(new Set([...prev.orderIds, ...allOrderIds])),
			}));
		}
	};

	const toggleOrder = (id: string) => {
		handleArrayChange("orderIds", id);
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
						handleChange("clientId", e.target.value || null);
						handleChange("orderIds", []);
						handleChange("tags", []);
						handleChange("destinations", []);
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
			<div className="flex flex-col gap-2">
				<span className="text-sm font-medium text-gray-700">Options</span>
				<label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
					<input
						type="checkbox"
						checked={filters.hasItemsOnly}
						onChange={(e) => handleChange("hasItemsOnly", e.target.checked)}
					/>
					Only show boxes with packed items
				</label>
				<label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
					<input
						type="checkbox"
						checked={filters.packedOnly}
						onChange={(e) => handleChange("packedOnly", e.target.checked)}
					/>
					Only show packed boxes
				</label>
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
		</div>
	);
};
