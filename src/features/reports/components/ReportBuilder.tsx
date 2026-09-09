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
import { useEffect, useRef, useState } from "react";
import { saveCompanyProfile, updateClientDetails } from "../api";
import {
	useClientDetailsQuery,
	useCompanyProfileQuery,
	useOrderDetailsQuery,
	useOrderTotalsQuery,
} from "../hooks/useReportBuilderQueries";
import {
	DEFAULT_DISPLAY_SETTINGS,
	DEFAULT_PKG_DETAILS_SETTINGS,
} from "../settings-defaults";
import type { FilterParams } from "../types";
import { AppearancePanel } from "./AppearancePanel";
import { HeaderDataPanel } from "./HeaderDataPanel";
import { ScopePanel } from "./ScopePanel";
import { SelectableLivePreviewPanel } from "./SelectableLivePreviewPanel";

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
		orderIds: [],
		dateFrom: null,
		dateTo: null,
		dateFilterMode: "item_packed_at",
		tags: [],
		destinations: [],
		hasItemsOnly: false,
		packedOnly: true,
		statusFilter: null,
		photosFirst: false,
		splitBy: "none",
		orderSort: "name",
		boxId: null,
		tagSortPriority: "",
		destSortPriority: "",
		sortMode: "destination_first",
	});

	const [displaySettings, setDisplaySettings] = useState(
		DEFAULT_DISPLAY_SETTINGS,
	);
	const [pkgSettings, setPkgSettings] = useState(DEFAULT_PKG_DETAILS_SETTINGS);

	const [clientData, setClientData] = useState<any>(null);
	const [clientOrderData, setClientOrderData] = useState<any>(null);
	const [clientShipmentData, setClientShipmentData] = useState<any>(null);
	const [companyData, setCompanyData] = useState<any>(null);
	const [isTemplateMode, setIsTemplateMode] = useState(false);
	const [hiddenMediaUrls, setHiddenMediaUrls] = useState<string[]>([]);

	const { data: fetchedCompanyProfile } = useCompanyProfileQuery();

	// Seed companyData from DB once loaded (map snake_case → camelCase)
	useEffect(() => {
		if (fetchedCompanyProfile && !companyData) {
			setCompanyData({
				name: fetchedCompanyProfile.name || "",
				tel: fetchedCompanyProfile.phone || "",
				poBox: fetchedCompanyProfile.po_box || "",
				street: fetchedCompanyProfile.address_line_1 || "",
				area: fetchedCompanyProfile.address_line_2 || "",
				city: fetchedCompanyProfile.city || "",
				country: fetchedCompanyProfile.country || "",
				website: fetchedCompanyProfile.website || "",
				logoUrl: fetchedCompanyProfile.logo_url || null,
				trn: fetchedCompanyProfile.trn || "",
				showLogo: fetchedCompanyProfile.show_logo !== false,
				showName: fetchedCompanyProfile.show_name !== false,
				showTel: fetchedCompanyProfile.show_tel !== false,
				showPoBox: fetchedCompanyProfile.show_po_box !== false,
				showStreet: fetchedCompanyProfile.show_street !== false,
				showArea: fetchedCompanyProfile.show_area !== false,
				showCity: fetchedCompanyProfile.show_city !== false,
				showCountry: fetchedCompanyProfile.show_country !== false,
				showWebsite: fetchedCompanyProfile.show_website !== false,
				showTrn: fetchedCompanyProfile.show_trn !== false,
			});
		}
	}, [fetchedCompanyProfile, companyData]);

	const handleSaveCompanyProfile = async () => {
		if (!companyData) return;
		await saveCompanyProfile({
			_v: 1,
			name: companyData.name || "",
			phone: companyData.tel || "",
			po_box: companyData.poBox || "",
			address_line_1: companyData.street || "",
			address_line_2: companyData.area || "",
			city: companyData.city || "",
			country: companyData.country || "",
			website: companyData.website || "",
			logo_url: companyData.logoUrl || "",
			email: "",
			trn: companyData.trn || "",
			show_logo: companyData.showLogo !== false,
			show_name: companyData.showName !== false,
			show_tel: companyData.showTel !== false,
			show_po_box: companyData.showPoBox !== false,
			show_street: companyData.showStreet !== false,
			show_area: companyData.showArea !== false,
			show_city: companyData.showCity !== false,
			show_country: companyData.showCountry !== false,
			show_website: companyData.showWebsite !== false,
			show_trn: companyData.showTrn !== false,
		});
	};

	const { data: fetchedClientDetails } = useClientDetailsQuery(
		filters.clientId,
	);

	useEffect(() => {
		if (fetchedClientDetails) {
			setClientData({
				...fetchedClientDetails,
				// Explicit mapping so all fields are always present
				name: fetchedClientDetails.name || "",
				contact_person: fetchedClientDetails.contact_person || "",
				email: fetchedClientDetails.email || "",
				phone: fetchedClientDetails.phone || "",
				address_line_1: fetchedClientDetails.address_line_1 || "",
				address_line_2: fetchedClientDetails.address_line_2 || "",
				address_line_3: fetchedClientDetails.address_line_3 || "",
				post_code: fetchedClientDetails.post_code || "",
				city: fetchedClientDetails.city || "",
				country: fetchedClientDetails.country || "",
				trn: fetchedClientDetails.trn || "",
				showTrn: true,
			});
		}
	}, [fetchedClientDetails]);

	const handleSaveClientDetails = async () => {
		if (!clientData || !filters.clientId) return;
		await updateClientDetails(filters.clientId, {
			name: clientData.name || "",
			contact_person: clientData.contact_person || null,
			email: clientData.email || null,
			phone: clientData.phone || null,
			address_line_1: clientData.address_line_1 || null,
			address_line_2: clientData.address_line_2 || null,
			address_line_3: clientData.address_line_3 || null,
			post_code: clientData.post_code || null,
			city: clientData.city || null,
			country: clientData.country || null,
			trn: clientData.trn || null,
		});
	};

	// When a single order is selected, auto-seed order ref and header name
	const firstOrderId =
		filters.orderIds.length === 1 ? filters.orderIds[0] : null;
	const { data: fetchedOrderDetails } = useOrderDetailsQuery(firstOrderId);

	const lastLoadedOrderId = useRef<string | null>(null);

	useEffect(() => {
		if (fetchedOrderDetails && firstOrderId) {
			if (lastLoadedOrderId.current !== firstOrderId) {
				lastLoadedOrderId.current = firstOrderId;
				setClientOrderData((prev: any) => ({
					...(prev || {}),
					customer_order_ref: fetchedOrderDetails.reference || "",
					order_name: fetchedOrderDetails.order_name || "",
				}));
				setHeaderData((prev) => ({
					...prev,
					reportName: fetchedOrderDetails.order_name || "",
				}));
			}
		} else if (!firstOrderId) {
			lastLoadedOrderId.current = null;
			setClientOrderData((prev: any) => ({
				...(prev || {}),
				customer_order_ref: "",
				order_name: "",
			}));
			if (filters.orderIds.length === 0) {
				setHeaderData((prev) => ({
					...prev,
					reportName: "Packing List",
				}));
			}
		}
	}, [fetchedOrderDetails, firstOrderId, filters.orderIds.length]);

	const { data: fetchedOrderTotals } = useOrderTotalsQuery(firstOrderId);

	// Seed NW/GW/volume from DB when single order selected
	useEffect(() => {
		if (fetchedOrderTotals && firstOrderId) {
			setHeaderData((prev) => ({
				...prev,
				nw:
					fetchedOrderTotals.totalNW > 0
						? String(fetchedOrderTotals.totalNW)
						: prev.nw,
				gw:
					fetchedOrderTotals.totalGW > 0
						? String(fetchedOrderTotals.totalGW)
						: prev.gw,
				totalVolume:
					fetchedOrderTotals.totalVolume > 0
						? String(fetchedOrderTotals.totalVolume)
						: prev.totalVolume,
			}));
		}
	}, [fetchedOrderTotals, firstOrderId]);

	const [headerData, setHeaderData] = useState({
		reportName: "",
		reportNumber: "",
		reportDate: new Date().toISOString().split("T")[0],
		projectReference: "",
		finalDestinationCountry: "",
		transportModes: [] as string[],
		// Shipment summary totals
		nw: "",
		gw: "",
		totalVolume: "",
		// Order-level fields (local state only for now)
		deliveryNoteRef: "",
		deliveryDate: "",
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
.report-theme-text {
  color: #111827 !important;
}
thead tr, thead th {
  background-color: #f1f5f9 !important;
  color: #111827 !important;
}
@media print{
  @page{size:${isLandscape ? "A4 landscape" : "A4 portrait"};margin:0}
  body{margin:0}
  .report-theme-text {
    color: #111827 !important;
  }
  thead tr, thead th {
    background-color: #f1f5f9 !important;
    color: #111827 !important;
  }
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
		<div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-neutral-100 lg:flex-row">
			{/* ─── Left Control Panel ─── */}
			{panelOpen && (
				<div className="flex max-h-[46dvh] w-full shrink-0 flex-col border-b bg-white shadow-sm lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r xl:w-96">
					{/* Panel header */}
					<div className="flex items-center justify-between border-b bg-neutral-50 px-3 py-2.5 sm:px-4 sm:py-3">
						<div className="flex min-w-0 items-center gap-2">
							<button
								type="button"
								onClick={onBack}
								className="rounded p-1 text-neutral-400 transition-colors hover:text-neutral-700"
								aria-label="Back to reports"
							>
								<ChevronLeft className="h-4 w-4" aria-hidden="true" />
							</button>
							<span className="truncate text-sm font-semibold text-neutral-800">
								Report Builder
							</span>
						</div>
						<button
							type="button"
							onClick={() => setPanelOpen(false)}
							className="rounded p-1 text-neutral-400 hover:text-neutral-700"
							aria-label="Collapse the builder panel"
						>
							<PanelLeftClose className="h-4 w-4" aria-hidden="true" />
						</button>
					</div>

					{/* Tab bar */}
					<div className="flex shrink-0 border-b">
						{TABS.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								type="button"
								onClick={() => setActiveTab(id)}
								className={`flex flex-1 flex-col items-center gap-1 border-b-2 py-2 text-xs font-medium transition-colors sm:py-2.5 ${
									activeTab === id
										? "border-primary-600 text-primary-600"
										: "border-transparent text-neutral-500 hover:text-neutral-800"
								}`}
							>
								<Icon className="h-3.5 w-3.5" />
								{label}
							</button>
						))}
					</div>

					{/* Tab content */}
					<div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5 sm:px-4 sm:py-3">
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
							<HeaderDataPanel
								data={headerData}
								setData={setHeaderData}
								clientData={clientData}
								setClientData={setClientData}
								clientOrderData={clientOrderData}
								setClientOrderData={setClientOrderData}
								clientShipmentData={clientShipmentData}
								setClientShipmentData={setClientShipmentData}
								companyData={companyData}
								setCompanyData={setCompanyData}
								onSaveCompanyProfile={handleSaveCompanyProfile}
								onSaveClientDetails={handleSaveClientDetails}
								isTemplateMode={isTemplateMode}
								setIsTemplateMode={setIsTemplateMode}
							/>
						)}
					</div>

					{/* Panel actions */}
					<div className="grid shrink-0 grid-cols-2 gap-2 border-t px-3 py-2 sm:px-4 lg:grid-cols-1 lg:py-3">
						<button
							type="button"
							className="w-full rounded bg-neutral-100 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
						>
							Save as Template
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="flex w-full items-center justify-center gap-2 rounded bg-primary-700 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
						>
							<Printer className="h-4 w-4" />
							<span className="hidden sm:inline">Print / Save PDF</span>
							<span className="sm:hidden">Print</span>
						</button>
					</div>
				</div>
			)}

			{/* ─── Right Preview Area ─── */}
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				{/* Toolbar */}
				<div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-white px-3 py-2 sm:gap-3 sm:px-4">
					{!panelOpen && (
						<button
							type="button"
							onClick={() => setPanelOpen(true)}
							className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
							aria-label="Open the builder panel"
						>
							<PanelLeftOpen className="h-4 w-4" />
						</button>
					)}
					<span className="mr-auto min-w-0 flex-1 truncate text-sm font-medium text-neutral-500">
						Live Preview
					</span>

					{/* Orientation quick toggle */}
					<button
						type="button"
						onClick={toggleOrientation}
						className="shrink-0 rounded border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-700 transition-colors hover:bg-neutral-100 sm:px-3"
					>
						{displaySettings.orientation === "portrait"
							? "↔ Landscape"
							: "↕ Portrait"}
					</button>

					<button
						type="button"
						onClick={handlePrint}
						className="flex shrink-0 items-center gap-1.5 rounded bg-primary-600 px-2 py-1.5 text-xs text-white transition-colors hover:bg-primary-700 sm:px-3"
					>
						<Printer className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">Print</span>
					</button>
				</div>

				{/* Preview */}
				<div className="min-h-0 flex-1 overflow-hidden">
					<SelectableLivePreviewPanel
						filters={filters}
						displaySettings={displaySettings}
						pkgSettings={pkgSettings}
						headerData={headerData}
						clientData={clientData}
						clientOrderData={clientOrderData}
						clientShipmentData={clientShipmentData}
						companyData={companyData}
						printRef={printRef}
						hiddenMediaUrls={hiddenMediaUrls}
						setHiddenMediaUrls={setHiddenMediaUrls}
					/>
				</div>
			</div>
		</div>
	);
};
