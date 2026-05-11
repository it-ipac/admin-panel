import { useState } from "react";
import {
	DEFAULT_DISPLAY_SETTINGS,
	DEFAULT_PKG_DETAILS_SETTINGS,
} from "../settings-defaults";
import type { FilterParams } from "../types";
import { AppearancePanel } from "./AppearancePanel";
import { HeaderDataPanel } from "./HeaderDataPanel";
import { LivePreviewPanel } from "./LivePreviewPanel";
import { ScopePanel } from "./ScopePanel";

export const ReportBuilder = () => {
	const [activeTab, setActiveTab] = useState<"scope" | "appearance" | "header">(
		"scope",
	);

	const [filters, setFilters] = useState<FilterParams>({
		clientId: null,
		orderId: null,
		dateFrom: null,
		dateTo: null,
		dateFilterMode: "packed_at",
		tags: [],
		destinations: [],
		statuses: ["packed", "completed", "dispatched"],
	});

	const [displaySettings, setDisplaySettings] = useState(
		DEFAULT_DISPLAY_SETTINGS,
	);
	const [pkgSettings, setPkgSettings] = useState(DEFAULT_PKG_DETAILS_SETTINGS);

	const [headerData, setHeaderData] = useState({
		reportName: "",
		reportNumber: "",
		reportDate: new Date().toISOString().split("T")[0],
		projectReference: "",
		finalDestinationCountry: "",
		transportModes: [] as string[],
	});

	const handleSaveReport = async () => {
		// TODO: Implement save report
	};

	return (
		<div className="flex h-[calc(100vh-4rem)] gap-4 p-4 overflow-hidden">
			{/* Left Panel */}
			<div className="w-[400px] flex flex-col gap-4 bg-white rounded-lg shadow-sm border p-4">
				<h2 className="text-xl font-semibold mb-2 text-gray-800">
					Report Builder
				</h2>

				{/* Tabs */}
				<div className="flex space-x-1 bg-gray-100 p-1 rounded-lg shrink-0">
					{["scope", "appearance", "header"].map((tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab as any)}
							className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
								activeTab === tab
									? "bg-white text-gray-900 shadow"
									: "text-gray-500 hover:text-gray-900"
							}`}
						>
							{tab}
						</button>
					))}
				</div>

				{/* Tab Content */}
				<div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
					{activeTab === "scope" && (
						<ScopePanel filters={filters} setFilters={setFilters} />
					)}
					{activeTab === "appearance" && (
						<AppearancePanel
							display={displaySettings}
							setDisplay={setDisplaySettings}
							pkgDetails={pkgSettings}
							setPkgDetails={setPkgSettings}
						/>
					)}
					{activeTab === "header" && (
						<HeaderDataPanel data={headerData} setData={setHeaderData} />
					)}
				</div>

				<div className="mt-4 pt-4 border-t flex flex-col gap-2 shrink-0">
					<button className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm font-medium transition-colors">
						Save Template
					</button>
					<button
						onClick={handleSaveReport}
						className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
					>
						Generate Report
					</button>
				</div>
			</div>

			{/* Right Panel (Live Preview) */}
			<div className="flex-1 bg-white border shadow-sm rounded-lg overflow-hidden flex flex-col relative">
				<div className="bg-gray-50 p-3 border-b flex justify-between items-center absolute top-0 left-0 right-0 z-10 shadow-sm">
					<span className="text-sm font-medium text-gray-600">
						Live Print Preview
					</span>
					<button
						className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm rounded transition-colors"
						onClick={() => window.print()}
					>
						Print
					</button>
				</div>
				<div className="flex-1 overflow-auto p-8 pt-16 bg-gray-200 flex justify-center">
					{/* A4 Page size container */}
					<div className="bg-white shadow-md w-[210mm] min-h-[297mm] p-[10mm]">
						<LivePreviewPanel
							filters={filters}
							displaySettings={displaySettings}
							pkgSettings={pkgSettings}
							headerData={headerData}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
