import type React from "react";
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
		filters.orderId,
	);

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
						// Reset order when client changes
						handleChange("orderId", null);
						handleChange("tags", []);
						handleChange("destinations", []);
					}}
					disabled={clientsLoading}
				>
					<option value="">All Clients</option>
					{clients?.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>
			</div>

			{/* Order Selection */}
			<div className="flex flex-col gap-1">
				<label
					htmlFor="order-select"
					className="text-sm font-medium text-gray-700"
				>
					Order
				</label>
				<select
					id="order-select"
					className="w-full border rounded-md p-2 text-sm bg-white"
					value={filters.orderId || ""}
					onChange={(e) => handleChange("orderId", e.target.value || null)}
					disabled={ordersLoading || !filters.clientId}
				>
					<option value="">All Orders</option>
					{orders?.map((o) => (
						<option key={o.id} value={o.id}>
							{o.order_name} {o.reference ? `(${o.reference})` : ""}
						</option>
					))}
				</select>
			</div>

			{/* Date Filtering */}
			<div className="flex flex-col gap-2 p-3 bg-gray-50 border rounded-md mt-2">
				<span className="text-sm font-semibold text-gray-700">Date Range</span>
				<div className="flex gap-2 mb-2">
					<label className="flex items-center gap-2 text-sm text-gray-700">
						<input
							type="radio"
							checked={filters.dateFilterMode === "packed_at"}
							onChange={() => handleChange("dateFilterMode", "packed_at")}
						/>
						Packed Date
					</label>
					<label className="flex items-center gap-2 text-sm text-gray-700">
						<input
							type="radio"
							checked={filters.dateFilterMode === "created_at"}
							onChange={() => handleChange("dateFilterMode", "created_at")}
						/>
						Creation Date
					</label>
				</div>
				<div className="flex gap-2">
					<div className="flex-1 flex flex-col gap-1">
						<label htmlFor="date-from" className="text-xs text-gray-500">
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
						<label htmlFor="date-to" className="text-xs text-gray-500">
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
			<div className="flex flex-col gap-1 mt-2">
				<span className="text-sm font-medium text-gray-700">Destinations</span>
				{destLoading ? (
					<div className="text-xs text-gray-500">Loading destinations...</div>
				) : destinations && destinations.length > 0 ? (
					<div className="flex flex-col gap-1 max-h-32 overflow-y-auto p-2 border rounded-md bg-gray-50">
						{destinations.map((d) => (
							<label
								key={d}
								className="flex items-center gap-2 text-sm text-gray-700"
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
					<div className="text-xs text-gray-500 italic">
						No destinations found. Select client/order.
					</div>
				)}
			</div>

			{/* Dynamic Tags */}
			<div className="flex flex-col gap-1 mt-2">
				<span className="text-sm font-medium text-gray-700">Project Tags</span>
				{tagsLoading ? (
					<div className="text-xs text-gray-500">Loading tags...</div>
				) : projectTags && projectTags.length > 0 ? (
					<div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
						{projectTags.map((t) => {
							const isSelected = filters.tags.includes(t.id);
							return (
								<button
									key={t.id}
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
					<div className="text-xs text-gray-500 italic">
						No tags available. Select client.
					</div>
				)}
			</div>

			{/* Statuses */}
			<div className="flex flex-col gap-1 mt-2">
				<span className="text-sm font-medium text-gray-700">Statuses</span>
				<div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
					{["packed", "completed", "dispatched"].map((status) => {
						const isSelected = filters.statuses.includes(status);
						return (
							<button
								key={status}
								onClick={() => handleArrayChange("statuses", status)}
								className={`px-2 py-1 text-xs rounded-full border transition-colors capitalize ${
									isSelected
										? "bg-green-100 border-green-300 text-green-800"
										: "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
								}`}
							>
								{status}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
