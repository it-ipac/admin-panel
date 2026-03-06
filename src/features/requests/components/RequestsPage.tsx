import { useState } from "react";
import { cn } from "../../../lib/cn";
import {
	useMaterialRequests,
	usePricingRequests,
	useVariantRequests,
} from "../hooks/useRequestsQueries";
import { AuditLogTab } from "./AuditLogTab";
import { MaterialRequestsTab } from "./MaterialRequestsTab";
import { PricingRequestsTab } from "./PricingRequestsTab";
import { VariantRequestsTab } from "./VariantRequestsTab";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = "materials" | "variants" | "pricing" | "history";

interface TabConfig {
	key: TabKey;
	label: string;
	count?: number;
}

// ─── Count badge ──────────────────────────────────────────────────────────────

function CountBadge({ count }: { count: number | undefined }) {
	if (count === undefined || count === 0) return null;
	return (
		<span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-semibold leading-none">
			{count > 99 ? "99+" : count}
		</span>
	);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RequestsPage() {
	const [activeTab, setActiveTab] = useState<TabKey>("materials");

	const { data: materialRequests } = useMaterialRequests();
	const { data: variantRequests } = useVariantRequests();
	const { data: pricingRequests } = usePricingRequests();

	const tabs: TabConfig[] = [
		{
			key: "materials",
			label: "Materials",
			count: materialRequests?.length,
		},
		{
			key: "variants",
			label: "Variants",
			count: variantRequests?.length,
		},
		{
			key: "pricing",
			label: "Pricing",
			count: pricingRequests?.length,
		},
		{
			key: "history",
			label: "History",
		},
	];

	return (
		<div className="flex-1 flex flex-col min-h-0 bg-gray-50">
			{/* Page header */}
			<div className="px-8 pt-8 pb-4 bg-white border-b border-gray-200">
				<h1 className="text-xl font-semibold text-gray-900">
					Material Requests
				</h1>
				<p className="text-sm text-gray-500 mt-1">
					Review and action pending material, variant, and pricing requests from
					packers.
				</p>
			</div>

			{/* Tabs */}
			<div className="px-8 bg-white border-b border-gray-200">
				<nav className="-mb-px flex gap-6">
					{tabs.map((tab) => {
						const isActive = activeTab === tab.key;
						return (
							<button
								key={tab.key}
								type="button"
								onClick={() => setActiveTab(tab.key)}
								className={cn(
									"inline-flex items-center py-4 border-b-2 text-sm font-medium transition-colors",
									isActive
										? "border-blue-600 text-blue-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
								)}
							>
								{tab.label}
								<CountBadge count={tab.count} />
							</button>
						);
					})}
				</nav>
			</div>

			{/* Tab content */}
			<div className="flex-1 overflow-auto p-8">
				<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
					{activeTab === "materials" && <MaterialRequestsTab />}
					{activeTab === "variants" && <VariantRequestsTab />}
					{activeTab === "pricing" && <PricingRequestsTab />}
					{activeTab === "history" && <AuditLogTab />}
				</div>
			</div>
		</div>
	);
}
