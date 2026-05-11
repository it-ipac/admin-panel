import {
	ChevronLeft,
	FileText,
	Layers,
	LayoutTemplate,
	PanelLeftClose,
	PanelLeftOpen,
	Printer,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import {
	DEFAULT_DISPLAY_SETTINGS,
	DEFAULT_PKG_DETAILS_SETTINGS,
} from "../settings-defaults";
import type { FilterParams } from "../types";
import { AppearancePanel } from "./AppearancePanel";
import { HeaderDataPanel } from "./HeaderDataPanel";
import { LivePreviewPanel } from "./LivePreviewPanel";
import { ScopePanel } from "./ScopePanel";

interface ReportBuilderProps {
	onBack: () => void;
}

const TABS = [
	{ id: "scope", label: "Scope", icon: Layers },
	{ id: "appearance", label: "Appearance", icon: LayoutTemplate },
	{ id: "header", label: "Header", icon: FileText },
] as const;

export const ReportBuilder: React.FC<ReportBuilderProps> = ({ onBack }) => {
	const [activeTab, setActiveTab] = useState<"scope" | "appearance" | "header">(
		"scope",
	);
	const [panelOpen, setPanelOpen] = useState(true);

	const [filters, setFilters] = useState<FilterParams>({
		clientId: null,
		orderId: null,
		dateFrom: null,
		dateTo: null,
		dateFilterMode: "item_packed_at",
		tags: [],
		destinations: [],
		hasItemsOnly: true,
		splitBy: "none",
	});

	const [displaySettings, setDisplaySettings] = useState(
		DEFAULT_DISPLAY_SETTINGS,
	);
	const [pkgSettings, setPkgSettings] = useState(DEFAULT_PKG_DETAILS_SETTINGS);

	const [headerData, setHeaderData] = useState({
		reportName: "Packing List",
		reportNumber: "",
		reportDate: new Date().toISOString().split("T")[0],
		projectReference: "",
		finalDestinationCountry: "",
		transportModes: [] as string[],
	});

	const printRef = useRef<HTMLDivElement>(null);

	const handlePrint = () => {
		const content = printRef.current;
		if (!content) return;
		const w = window.open("", "_blank", "width=950,height=750");
		if (!w) {
			alert("Enable popups for this site to print.");
			return;
		}
		const isLandscape = displaySettings.orientation === "landscape";
		w.document.write(`<!DOCTYPE html><html><head><title>${headerData.reportName}</title>
<meta charset="utf-8"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Segoe UI',sans-serif;background:white}
@media print{
  @page{size:${isLandscape ? "A4 landscape" : "A4 portrait"};margin:0}
  body{margin:0}
}
</style></head><body>${content.innerHTML}
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
</body></html>`);
		w.document.close();
	};

	// Toggle orientation shortcut
	const toggleOrientation = () =>
		setDisplaySettings((p) => ({
			...p,
			orientation: p.orientation === "portrait" ? "landscape" : "portrait",
		}));

	return (
		<div className="flex h-screen bg-gray-100 overflow-hidden">
			{/* ─── Left Control Panel ─── */}
			{panelOpen && (
				<div className="w-[340px] flex flex-col bg-white border-r shadow-sm shrink-0">
					{/* Panel header */}
					<div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onBack}
								className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<span className="text-sm font-semibold text-gray-800">
								Report Builder
							</span>
						</div>
						<button
							type="button"
							onClick={() => setPanelOpen(false)}
							className="text-gray-400 hover:text-gray-700 p-1 rounded"
						>
							<PanelLeftClose className="w-4 h-4" />
						</button>
					</div>

					{/* Tab bar */}
					<div className="flex border-b shrink-0">
						{TABS.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								type="button"
								onClick={() => setActiveTab(id)}
								className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors border-b-2 ${
									activeTab === id
										? "border-blue-600 text-blue-600"
										: "border-transparent text-gray-500 hover:text-gray-800"
								}`}
							>
								<Icon className="w-3.5 h-3.5" />
								{label}
							</button>
						))}
					</div>

					{/* Tab content */}
					<div className="flex-1 overflow-y-auto px-4 py-3">
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

					{/* Panel actions */}
					<div className="px-4 py-3 border-t flex flex-col gap-2 shrink-0">
						<button
							type="button"
							className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
						>
							Save as Template
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
						>
							<Printer className="w-4 h-4" />
							Print / Save PDF
						</button>
					</div>
				</div>
			)}

			{/* ─── Right Preview Area ─── */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Toolbar */}
				<div className="flex items-center gap-3 px-4 py-2 bg-white border-b shrink-0">
					{!panelOpen && (
						<button
							type="button"
							onClick={() => setPanelOpen(true)}
							className="text-gray-500 hover:text-gray-800 p-1.5 rounded hover:bg-gray-100 transition-colors"
						>
							<PanelLeftOpen className="w-4 h-4" />
						</button>
					)}
					<span className="text-sm font-medium text-gray-500 mr-auto">
						Live Preview
					</span>

					{/* Orientation quick toggle */}
					<button
						type="button"
						onClick={toggleOrientation}
						className="text-xs px-3 py-1.5 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
					>
						{displaySettings.orientation === "portrait"
							? "↔ Landscape"
							: "↕ Portrait"}
					</button>

					<button
						type="button"
						onClick={handlePrint}
						className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
					>
						<Printer className="w-3.5 h-3.5" />
						Print
					</button>
				</div>

				{/* Preview */}
				<div className="flex-1 overflow-hidden">
					<LivePreviewPanel
						filters={filters}
						displaySettings={displaySettings}
						pkgSettings={pkgSettings}
						headerData={headerData}
						printRef={printRef}
					/>
				</div>
			</div>
		</div>
	);
};
