import { ChevronLeft, ChevronRight, Image } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	useCompanyProfileQuery,
	useOrderDetailsQuery,
	useOrderTotalsQuery,
	useReportInstancesQuery,
} from "../hooks/useReportBuilderQueries";
import { useSignatures } from "../hooks/useSignatures";
import { paginateInstances } from "../paginateInstances";
import type {
	ReportDisplaySettings,
	ReportPkgDetailsSettings,
} from "../settings-defaults";
import type { FilterParams } from "../types";
import { PackingListPage } from "./PackingListPage";

const HorizontalRuler: React.FC<{ widthMm: number }> = ({ widthMm }) => {
	const ticks = [];
	for (let i = 0; i <= widthMm; i += 2) {
		const isMajor = i % 10 === 0;
		const isMedium = i % 5 === 0 && !isMajor;
		const tickHeight = isMajor ? 10 : isMedium ? 6 : 4;
		ticks.push(
			<line
				key={`h-tick-${i}`}
				x1={`${i}mm`}
				y1="20px"
				x2={`${i}mm`}
				y2={`${20 - tickHeight}px`}
				stroke="#94a3b8"
				strokeWidth={isMajor ? 1 : 0.5}
			/>,
		);
		if (isMajor && i % 20 === 0) {
			ticks.push(
				<text
					key={`h-text-${i}`}
					x={`${i}mm`}
					y="9px"
					fontSize="7.5px"
					fill="#64748b"
					fontFamily="monospace"
					fontWeight="600"
					textAnchor="middle"
				>
					{i / 10}
				</text>,
			);
		}
	}
	return (
		<svg
			style={{
				position: "absolute",
				top: "-20px",
				left: 0,
				width: "100%",
				height: "20px",
				overflow: "visible",
				pointerEvents: "none",
				userSelect: "none",
			}}
		>
			<rect
				x={0}
				y={0}
				width="100%"
				height="20px"
				fill="#f8fafc"
				stroke="#cbd5e1"
				strokeWidth={1}
			/>
			{ticks}
		</svg>
	);
};

const VerticalRuler: React.FC<{ heightMm: number }> = ({ heightMm }) => {
	const ticks = [];
	for (let i = 0; i <= heightMm; i += 2) {
		const isMajor = i % 10 === 0;
		const isMedium = i % 5 === 0 && !isMajor;
		const tickWidth = isMajor ? 10 : isMedium ? 6 : 4;
		ticks.push(
			<line
				key={`v-tick-${i}`}
				x1="20px"
				y1={`${i}mm`}
				x2={`${20 - tickWidth}px`}
				y2={`${i}mm`}
				stroke="#94a3b8"
				strokeWidth={isMajor ? 1 : 0.5}
			/>,
		);
		if (isMajor && i % 20 === 0) {
			ticks.push(
				<text
					key={`v-text-${i}`}
					x="7px"
					y={`${i}mm`}
					dy="2.5px"
					fontSize="7.5px"
					fill="#64748b"
					fontFamily="monospace"
					fontWeight="600"
					textAnchor="middle"
				>
					{i / 10}
				</text>,
			);
		}
	}
	return (
		<svg
			style={{
				position: "absolute",
				top: 0,
				left: "-20px",
				width: "20px",
				height: "100%",
				overflow: "visible",
				pointerEvents: "none",
				userSelect: "none",
			}}
		>
			<rect
				x={0}
				y={0}
				width="20px"
				height="100%"
				fill="#f8fafc"
				stroke="#cbd5e1"
				strokeWidth={1}
			/>
			{ticks}
		</svg>
	);
};

const Gridlines: React.FC = () => {
	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				pointerEvents: "none",
				userSelect: "none",
				backgroundImage: `
					repeating-linear-gradient(0deg, rgba(59, 130, 246, 0.05) 0px, rgba(59, 130, 246, 0.05) 1px, transparent 1px, transparent 10mm),
					repeating-linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0px, rgba(59, 130, 246, 0.05) 1px, transparent 1px, transparent 10mm)
				`,
				zIndex: 9999,
			}}
		/>
	);
};

interface LivePreviewPanelProps {
	filters: FilterParams;
	displaySettings: ReportDisplaySettings;
	pkgSettings: ReportPkgDetailsSettings;
	headerData: any;
	clientData: any;
	clientOrderData: any;
	clientShipmentData: any;
	companyData: any;
	printRef: React.RefObject<HTMLDivElement | null>;
	hiddenMediaUrls: string[];
	setHiddenMediaUrls: React.Dispatch<React.SetStateAction<string[]>>;
}

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({
	filters,
	displaySettings,
	pkgSettings,
	headerData,
	clientData,
	clientOrderData,
	clientShipmentData,
	companyData,
	printRef,
	hiddenMediaUrls,
	setHiddenMediaUrls,
}) => {
	const {
		data: instances,
		isLoading,
		error,
	} = useReportInstancesQuery(filters);
	const { data: companyProfile } = useCompanyProfileQuery();
	const { query: sigsQuery } = useSignatures();
	const signatures = sigsQuery.data ?? [];

	const [currentPage, setCurrentPage] = useState(0);
	const [currentReportIndex, setCurrentReportIndex] = useState(0);
	const [scale, setScale] = useState(0.7);
	const [showRuler, setShowRuler] = useState(true);
	const [mediaManagerOpen, setMediaManagerOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const [scaleMode, setScaleMode] = useState<"fit" | "fill" | "manual">("fit");
	const [ctrlScrollZoomReport, setCtrlScrollZoomReport] = useState(true);
	const [invertPageScroll, setInvertPageScroll] = useState(false);
	const lastPageSwitchTime = useRef(0);

	const isReportPerOrder = filters.splitBy === "report_per_order";

	// Filter and sort instances
	const filteredAndSortedInstances = React.useMemo(() => {
		if (!instances) return [];

		// 1. Filter
		let result = [...instances];
		if (filters.packedOnly) {
			result = result.filter((inst) => inst.status === "packed");
		}
		if (filters.boxId) {
			result = result.filter((inst) => inst.id === filters.boxId);
		}

		// 2. Sort
		const sortMode = pkgSettings.boxes_sort || "number";
		if (sortMode === "packed_date") {
			result.sort((a, b) => {
				const timeA = a.last_packed_at
					? new Date(a.last_packed_at).getTime()
					: 0;
				const timeB = b.last_packed_at
					? new Date(b.last_packed_at).getTime()
					: 0;
				if (timeA !== timeB) {
					return timeB - timeA; // Descending (most recent first)
				}
				const createdA = new Date(a.created_at).getTime();
				const createdB = new Date(b.created_at).getTime();
				return createdB - createdA;
			});
		} else {
			// default: Sort by Box Number (package_number asc, then instance_number asc)
			result.sort((a, b) => {
				if (a.package_number !== b.package_number) {
					return a.package_number - b.package_number;
				}
				return a.instance_number - b.instance_number;
			});
		}

		return result;
	}, [instances, filters.packedOnly, filters.boxId, pkgSettings.boxes_sort]);

	// For report_per_order: group by order → array of { orderId, orderName, instances[] }
	const reportGroups = React.useMemo(() => {
		if (!isReportPerOrder) return null;
		const groupMap = new Map<
			string,
			{
				orderId: string;
				orderName: string;
				instances: typeof filteredAndSortedInstances;
			}
		>();
		for (const inst of filteredAndSortedInstances) {
			if (!groupMap.has(inst.order_id)) {
				groupMap.set(inst.order_id, {
					orderId: inst.order_id,
					orderName: inst.order_name,
					instances: [],
				});
			}
			groupMap.get(inst.order_id)!.instances.push(inst);
		}
		return Array.from(groupMap.values());
	}, [isReportPerOrder, filteredAndSortedInstances]);

	// Reset navigation when instances change
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination when instances list changes
	useEffect(() => {
		setCurrentPage(0);
		setCurrentReportIndex(0);
	}, [filteredAndSortedInstances]);

	// Active instances: all (normal mode) or current report group's instances (per-order mode)
	const activeInstances =
		isReportPerOrder && reportGroups
			? (reportGroups[currentReportIndex]?.instances ?? [])
			: filteredAndSortedInstances;

	// Paginate instances into pages
	const pages = React.useMemo(() => {
		const splitMode = isReportPerOrder ? "none" : filters.splitBy;
		return paginateInstances(
			activeInstances,
			displaySettings,
			pkgSettings,
			splitMode,
			hiddenMediaUrls,
		);
	}, [
		activeInstances,
		displaySettings,
		pkgSettings,
		filters.splitBy,
		isReportPerOrder,
		hiddenMediaUrls,
	]);

	const totalPages = pages.length;
	const totalReports = reportGroups?.length ?? 1;
	const currentReportGroup = reportGroups?.[currentReportIndex];

	const activeOrderId =
		isReportPerOrder && currentReportGroup
			? currentReportGroup.orderId
			: filters.orderIds.length === 1
				? filters.orderIds[0]
				: null;

	const { data: activeOrderDetails } = useOrderDetailsQuery(activeOrderId);
	const { data: activeOrderTotals } = useOrderTotalsQuery(activeOrderId);

	const effectiveClientOrderData = React.useMemo(() => {
		if (!activeOrderId || !activeOrderDetails) return clientOrderData;
		return {
			...clientOrderData,
			customer_order_ref:
				activeOrderDetails.reference || activeOrderDetails.order_name || "",
			order_name: activeOrderDetails.order_name || "",
		};
	}, [activeOrderId, activeOrderDetails, clientOrderData]);

	const effectiveHeaderData = React.useMemo(() => {
		if (!activeOrderId) return headerData;
		return {
			...headerData,
			reportName:
				activeOrderDetails?.order_name ||
				headerData.reportName ||
				"Packing List",
			nw:
				activeOrderTotals &&
				activeOrderTotals.totalNW !== undefined &&
				activeOrderTotals.totalNW > 0
					? String(activeOrderTotals.totalNW)
					: headerData.nw,
			gw:
				activeOrderTotals &&
				activeOrderTotals.totalGW !== undefined &&
				activeOrderTotals.totalGW > 0
					? String(activeOrderTotals.totalGW)
					: headerData.gw,
			totalVolume:
				activeOrderTotals &&
				activeOrderTotals.totalVolume !== undefined &&
				activeOrderTotals.totalVolume > 0
					? String(activeOrderTotals.totalVolume)
					: headerData.totalVolume,
		};
	}, [activeOrderId, activeOrderDetails, activeOrderTotals, headerData]);

	// Compute scale to fit or fill page in container
	const updateScale = useCallback(() => {
		if (scaleMode === "manual") return;
		if (!containerRef.current) return;
		const { clientWidth: cw, clientHeight: ch } = containerRef.current;
		const isLandscape = displaySettings.orientation === "landscape";
		// A4 at 96dpi: 794×1123, landscape: 1123×794
		const pageW = isLandscape ? 1123 : 794;
		const pageH = isLandscape ? 794 : 1123;
		const padding = 64;
		const sx = (cw - padding) / pageW;
		const sy = (ch - padding) / pageH;
		if (scaleMode === "fit") {
			setScale(Math.min(sx, sy, 1));
		} else if (scaleMode === "fill") {
			setScale(Math.min(sx, sy)); // Uncapped fit to fill container space
		}
	}, [displaySettings.orientation, scaleMode]);

	useEffect(() => {
		updateScale();
		const obs = new ResizeObserver(updateScale);
		if (containerRef.current) obs.observe(containerRef.current);
		return () => obs.disconnect();
	}, [updateScale]);

	// Ctrl+scroll → zoom document; Shift+scroll → horizontal scroll; Alt+scroll → vertical scroll; scroll → change pages
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleWheel = (e: WheelEvent) => {
			if (e.ctrlKey) {
				if (ctrlScrollZoomReport) {
					// Zoom document, not browser
					e.preventDefault();
					const delta = e.deltaY > 0 ? -0.05 : 0.05;
					setScaleMode("manual");
					setScale((prev) => Math.min(Math.max(prev + delta, 0.2), 3));
				}
			} else if (e.altKey) {
				// Alt + Scroll: Change Pages
				e.preventDefault();
				const now = Date.now();
				if (now - lastPageSwitchTime.current > 300) {
					const isScrollForward = e.deltaY > 0;
					const shouldGoNext = invertPageScroll
						? !isScrollForward
						: isScrollForward;

					if (shouldGoNext) {
						setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
					} else {
						setCurrentPage((p) => Math.max(0, p - 1));
					}
					lastPageSwitchTime.current = now;
				}
			} else if (e.shiftKey) {
				// Shift + Scroll: Horizontal Scroll
				e.preventDefault();
				container.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
			}
			// Default scroll (no modifier keys) will scroll/pan the container vertically natively
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (!e.ctrlKey) return;
			// Only intercept keydown if ctrlScrollZoomReport is active
			if (!ctrlScrollZoomReport) return;
			// Only intercept when cursor is inside the preview container
			if (
				!container.matches(":hover") &&
				!container.contains(document.activeElement)
			)
				return;
			if (e.key === "=" || e.key === "+") {
				e.preventDefault();
				setScaleMode("manual");
				setScale((prev) => Math.min(prev + 0.1, 3));
			} else if (e.key === "-") {
				e.preventDefault();
				setScaleMode("manual");
				setScale((prev) => Math.max(prev - 0.1, 0.2));
			} else if (e.key === "0") {
				e.preventDefault();
				setScaleMode("fit");
			}
		};

		container.addEventListener("wheel", handleWheel, { passive: false });
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			container.removeEventListener("wheel", handleWheel);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [updateScale, ctrlScrollZoomReport, invertPageScroll, totalPages]);

	const isLandscape = displaySettings.orientation === "landscape";
	const pageW = isLandscape ? "297mm" : "210mm";
	const pageH = isLandscape ? "210mm" : "297mm";
	const pagePad = isLandscape ? "6mm" : "12mm";

	if (!filters.clientId && filters.orderIds.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-gray-400 text-sm italic">
				Select a client to preview the report.
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full flex-col gap-3 text-gray-500">
				<div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
				<span className="text-sm">Loading packages...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-full text-red-500 text-sm">
				Error loading data. Check console.
			</div>
		);
	}

	const page = pages[currentPage];

	return (
		<div className="flex flex-col h-full">
			{/* ─── Report Switcher (report_per_order mode) ─── */}
			{isReportPerOrder && totalReports > 1 && (
				<div className="flex items-center gap-2 px-4 py-1.5 bg-purple-50 border-b border-purple-200 shrink-0">
					<span className="text-xs font-semibold text-purple-700 mr-1">
						Report:
					</span>
					<button
						type="button"
						onClick={() => {
							setCurrentReportIndex((r) => Math.max(0, r - 1));
							setCurrentPage(0);
						}}
						disabled={currentReportIndex === 0}
						className="p-1 rounded hover:bg-purple-100 disabled:opacity-30 transition-colors"
					>
						<ChevronLeft className="w-3.5 h-3.5 text-purple-700" />
					</button>
					<span className="text-xs font-medium text-purple-800 min-w-[100px] text-center">
						{currentReportGroup?.orderName ??
							`Report ${currentReportIndex + 1}`}
					</span>
					<button
						type="button"
						onClick={() => {
							setCurrentReportIndex((r) => Math.min(totalReports - 1, r + 1));
							setCurrentPage(0);
						}}
						disabled={currentReportIndex >= totalReports - 1}
						className="p-1 rounded hover:bg-purple-100 disabled:opacity-30 transition-colors"
					>
						<ChevronRight className="w-3.5 h-3.5 text-purple-700" />
					</button>
					<div className="flex gap-1 ml-1">
						{reportGroups?.map((rg, i) => (
							<button
								key={rg.orderId}
								type="button"
								onClick={() => {
									setCurrentReportIndex(i);
									setCurrentPage(0);
								}}
								className={`w-2 h-2 rounded-full transition-colors ${
									i === currentReportIndex
										? "bg-purple-600"
										: "bg-purple-200 hover:bg-purple-400"
								}`}
								title={rg.orderName}
							/>
						))}
					</div>
					<span className="text-xs text-purple-500 ml-auto">
						{currentReportIndex + 1} / {totalReports}
					</span>
				</div>
			)}

			{/* ─── Page Nav Toolbar ─── */}
			<div className="flex flex-wrap items-center justify-between px-4 py-2 bg-gray-100 border-b shrink-0 gap-3">
				{/* Left: Navigation & Info */}
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1 bg-white border border-gray-300 rounded p-0.5 shadow-sm">
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
							disabled={currentPage === 0}
							className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
						>
							<ChevronLeft className="w-4 h-4 text-gray-600" />
						</button>
						<span className="text-xs font-semibold text-gray-700 min-w-[75px] text-center select-none">
							{totalPages === 0
								? "0 / 0"
								: `Page ${currentPage + 1} of ${totalPages}`}
						</span>
						<button
							type="button"
							onClick={() =>
								setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
							}
							disabled={currentPage >= totalPages - 1}
							className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
						>
							<ChevronRight className="w-4 h-4 text-gray-600" />
						</button>
					</div>

					{totalPages > 1 && totalPages <= 10 && (
						<div className="flex gap-1">
							{Array.from({ length: totalPages }).map((_, i) => {
								const pageKey = `page-dot-${i}`;
								return (
									<button
										key={pageKey}
										type="button"
										onClick={() => setCurrentPage(i)}
										className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentPage ? "bg-blue-600" : "bg-gray-300 hover:bg-gray-400"}`}
									/>
								);
							})}
						</div>
					)}

					<div className="text-xs text-gray-500 font-medium hidden sm:inline-block">
						{activeInstances.length} boxes ·{" "}
						{isLandscape ? "Landscape" : "Portrait"}
						{page?.label && (
							<span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
								{page.label}
							</span>
						)}
					</div>
				</div>

				{/* Middle/Center: Zoom & View Options */}
				<div className="flex items-center gap-2 flex-wrap">
					{/* Zoom widget */}
					<div className="flex items-center gap-1 bg-white border border-gray-300 rounded px-1.5 py-0.5 shadow-sm">
						<button
							type="button"
							onClick={() => {
								setScaleMode("manual");
								setScale((prev) => Math.max(prev - 0.1, 0.2));
							}}
							className="p-1 rounded hover:bg-gray-100 font-bold text-gray-500 text-xs w-6 h-6 flex items-center justify-center transition-colors cursor-pointer"
							title="Zoom Out"
						>
							-
						</button>
						<span className="text-xs font-bold text-gray-700 min-w-[36px] text-center select-none">
							{Math.round(scale * 100)}%
						</span>
						<button
							type="button"
							onClick={() => {
								setScaleMode("manual");
								setScale((prev) => Math.min(prev + 0.1, 3));
							}}
							className="p-1 rounded hover:bg-gray-100 font-bold text-gray-500 text-xs w-6 h-6 flex items-center justify-center transition-colors cursor-pointer"
							title="Zoom In"
						>
							+
						</button>
						<div className="w-[1px] h-4 bg-gray-200 mx-1" />
						<button
							type="button"
							onClick={() => setScaleMode("fit")}
							className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
								scaleMode === "fit"
									? "bg-blue-100 text-blue-700"
									: "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
							}`}
							title="Fit whole page in screen"
						>
							Fit
						</button>
						<button
							type="button"
							onClick={() => setScaleMode("fill")}
							className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
								scaleMode === "fill"
									? "bg-blue-100 text-blue-700"
									: "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
							}`}
							title="Fill container space"
						>
							Fill
						</button>
					</div>

					{/* Ruler & Grid toggle */}
					<label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer font-semibold select-none bg-white border border-gray-300 rounded px-2.5 py-1.5 shadow-sm hover:bg-gray-50 transition-colors">
						<input
							type="checkbox"
							checked={showRuler}
							onChange={(e) => setShowRuler(e.target.checked)}
							className="rounded text-blue-600 accent-blue-600 cursor-pointer w-3.5 h-3.5"
						/>
						Ruler & Grid
					</label>

					{/* Photos Manage */}
					<button
						type="button"
						onClick={() => setMediaManagerOpen(true)}
						className="flex items-center gap-1.5 text-xs text-gray-700 font-bold bg-white border border-gray-300 rounded px-2.5 py-1.5 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
					>
						<Image className="w-3.5 h-3.5 text-blue-600" />
						Manage Photos
					</button>
				</div>

				{/* Right: Scroll & Zoom configuration */}
				<div className="flex items-center gap-2">
					{/* Flip scroll direction */}
					<label
						className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer font-semibold select-none bg-white border border-gray-300 rounded px-2.5 py-1.5 shadow-sm hover:bg-gray-50 transition-colors"
						title="Invert direction when scrolling wheel to switch pages"
					>
						<input
							type="checkbox"
							checked={invertPageScroll}
							onChange={(e) => setInvertPageScroll(e.target.checked)}
							className="rounded text-blue-600 accent-blue-600 cursor-pointer w-3.5 h-3.5"
						/>
						Invert Page Scroll
					</label>

					{/* Shortcut config */}
					<label
						className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer font-semibold select-none bg-white border border-gray-300 rounded px-2.5 py-1.5 shadow-sm hover:bg-gray-50 transition-colors"
						title="Enable Ctrl+Scroll to zoom page instead of browser"
					>
						<input
							type="checkbox"
							checked={ctrlScrollZoomReport}
							onChange={(e) => setCtrlScrollZoomReport(e.target.checked)}
							className="rounded text-blue-600 accent-blue-600 cursor-pointer w-3.5 h-3.5"
						/>
						Ctrl+Scroll Zoom
					</label>
				</div>
			</div>

			{/* ─── Page Viewer ─── */}
			<div
				ref={containerRef}
				className="flex-1 bg-gray-300 overflow-auto flex p-8 relative"
				tabIndex={-1}
				style={{ scrollBehavior: "smooth" }}
			>
				{totalPages === 0 ? (
					<div className="text-gray-500 text-sm italic margin-auto">
						No packages match.
					</div>
				) : (
					<div
						style={{
							width: `calc(${pageW} * ${scale})`,
							height: `calc(${pageH} * ${scale})`,
							margin: "auto",
							position: "relative",
						}}
					>
						<div
							style={{
								transform: `scale(${scale})`,
								transformOrigin: "top left",
								transition: "transform 0.15s ease",
								width: pageW,
								height: pageH,
								padding: `0px ${pagePad} ${pagePad} ${pagePad}`,
								background: "white",
								boxShadow:
									"0 4px 24px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.12)",
								position: "absolute",
								top: 0,
								left: 0,
							}}
						>
							{showRuler && (
								<>
									<HorizontalRuler widthMm={isLandscape ? 297 : 210} />
									<VerticalRuler heightMm={isLandscape ? 210 : 297} />
									<Gridlines />
								</>
							)}
							{/* Hidden all-pages ref for printing */}
							<div ref={printRef} style={{ display: "none" }}>
								{pages.map((pg, idx) => {
									const pagePrintKey = `print-page-${idx}`;
									return (
										<div
											key={pagePrintKey}
											style={{
												width: pageW,
												height: pageH,
												padding: `0px ${pagePad} ${pagePad} ${pagePad}`,
												background: "white",
												pageBreakAfter:
													idx < pages.length - 1 ? "always" : "auto",
											}}
										>
											<PackingListPage
												items={pg.items}
												allInstances={filteredAndSortedInstances}
												groupLabel={pg.label}
												pageIndex={idx}
												totalPages={pages.length}
												isFirstPageOfGroup={
													pages.findIndex((p) => p.label === pg.label) === idx
												}
												display={displaySettings}
												pkg={pkgSettings}
												headerData={effectiveHeaderData}
												clientData={clientData}
												clientOrderData={effectiveClientOrderData}
												clientShipmentData={clientShipmentData}
												companyData={companyData}
												companyProfile={companyProfile}
												signatures={signatures}
												hiddenMediaUrls={hiddenMediaUrls}
											/>
										</div>
									);
								})}
							</div>

							{/* Visible current page */}
							<PackingListPage
								key={`visible-${currentPage}`}
								items={page?.items ?? []}
								allInstances={filteredAndSortedInstances}
								groupLabel={page?.label}
								pageIndex={currentPage}
								totalPages={totalPages}
								isFirstPageOfGroup={
									pages.findIndex((p) => p.label === page?.label) ===
									currentPage
								}
								display={displaySettings}
								pkg={pkgSettings}
								headerData={effectiveHeaderData}
								clientData={clientData}
								clientOrderData={effectiveClientOrderData}
								clientShipmentData={clientShipmentData}
								companyData={companyData}
								companyProfile={companyProfile}
								signatures={signatures}
							/>
						</div>
					</div>
				)}
			</div>
			{mediaManagerOpen && (
				<MediaManagerModal
					instances={filteredAndSortedInstances}
					hiddenMediaUrls={hiddenMediaUrls}
					onUpdateHiddenUrls={setHiddenMediaUrls}
					onClose={() => setMediaManagerOpen(false)}
				/>
			)}
		</div>
	);
};

interface MediaManagerModalProps {
	instances: any[];
	hiddenMediaUrls: string[];
	onUpdateHiddenUrls: (urls: string[]) => void;
	onClose: () => void;
}

const MediaManagerModal: React.FC<MediaManagerModalProps> = ({
	instances,
	hiddenMediaUrls,
	onUpdateHiddenUrls,
	onClose,
}) => {
	const mediaInstances = React.useMemo(() => {
		return instances.filter(
			(inst) =>
				(inst.box_photo_urls && inst.box_photo_urls.length > 0) ||
				inst.pkd_items?.some(
					(item: any) => item.photo_urls && item.photo_urls.length > 0,
				),
		);
	}, [instances]);

	const [activeTabIdx, setActiveTabIdx] = useState(0);
	const [localHiddenUrls, setLocalHiddenUrls] =
		useState<string[]>(hiddenMediaUrls);

	const handleToggleLocal = useCallback((url: string) => {
		setLocalHiddenUrls((prev) =>
			prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
		);
	}, []);

	const handleCloseAndSave = useCallback(() => {
		onUpdateHiddenUrls(localHiddenUrls);
		onClose();
	}, [localHiddenUrls, onUpdateHiddenUrls, onClose]);

	if (mediaInstances.length === 0) {
		return (
			<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[99999] p-4">
				<div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300 scale-100 flex flex-col p-6 text-center">
					<div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
						<Image className="w-8 h-8 text-indigo-600 animate-pulse" />
					</div>
					<h3 className="text-lg font-bold text-slate-800 mb-2">
						No Media Available
					</h3>
					<p className="text-sm text-slate-500 mb-6 font-medium">
						None of the selected packages or items have associated photos in the
						database.
					</p>
					<button
						type="button"
						onClick={onClose}
						className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-md cursor-pointer"
					>
						Close
					</button>
				</div>
			</div>
		);
	}

	const activeInst = mediaInstances[activeTabIdx];
	const boxPhotos = activeInst?.box_photo_urls || [];
	const itemsWithPhotos =
		activeInst?.pkd_items?.filter(
			(i: any) => i.photo_urls && i.photo_urls.length > 0,
		) || [];

	return (
		<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[99999] p-4">
			<div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[80vh] overflow-hidden flex flex-col transform transition-all duration-300">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 shrink-0">
					<div className="flex items-center gap-2">
						<Image className="w-5 h-5 text-indigo-600" />
						<h3 className="text-base font-bold text-slate-800">
							Manage Photos for Report
						</h3>
					</div>
					<button
						type="button"
						onClick={handleCloseAndSave}
						className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
					>
						✕
					</button>
				</div>

				{/* Modal Body */}
				<div className="flex-1 flex overflow-hidden">
					{/* Left Sidebar Tabs */}
					<div className="w-1/3 border-r bg-slate-50 overflow-y-auto p-3 flex flex-col gap-1 shrink-0">
						<div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
							Packages
						</div>
						{mediaInstances.map((inst, idx) => {
							const isSelected = idx === activeTabIdx;
							const boxPhotosCount = inst.box_photo_urls?.length ?? 0;
							const itemPhotosCount =
								inst.pkd_items?.reduce(
									(sum: number, item: any) =>
										sum + (item.photo_urls?.length ?? 0),
									0,
								) ?? 0;
							const totalPhotosCount = boxPhotosCount + itemPhotosCount;

							const allUrls = [
								...(inst.box_photo_urls || []),
								...(inst.pkd_items?.flatMap((i: any) => i.photo_urls || []) ||
									[]),
							];
							const visibleCount = allUrls.filter(
								(url) => !localHiddenUrls.includes(url),
							).length;

							return (
								<button
									key={inst.id}
									type="button"
									onClick={() => setActiveTabIdx(idx)}
									className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-all cursor-pointer ${
										isSelected
											? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm border border-indigo-100"
											: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
									}`}
								>
									<span className="text-xs truncate">
										📦 Box {inst.package_number}{" "}
										{inst.instance_number > 1
											? `(Inst ${inst.instance_number})`
											: ""}
									</span>
									<span
										className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all ${
											isSelected
												? visibleCount === 0
													? "bg-slate-200 text-slate-700"
													: "bg-indigo-600 text-white"
												: visibleCount === 0
													? "bg-slate-200 text-slate-500"
													: "bg-slate-200 text-slate-700"
										}`}
									>
										{visibleCount}/{totalPhotosCount}
									</span>
								</button>
							);
						})}
					</div>

					{/* Right Content Area */}
					<div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
						{activeInst && (
							<>
								<div className="border-b pb-3">
									<h4 className="text-sm font-bold text-slate-800">
										Box {activeInst.package_number} Details
									</h4>
									<p className="text-xs text-slate-500 mt-1">
										Select or deselect pictures to show or hide them in the
										final report.
									</p>
								</div>

								{/* Box Photos Section */}
								<div>
									<h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
										📷 Box Photos ({boxPhotos.length})
									</h5>
									{boxPhotos.length === 0 ? (
										<p className="text-xs text-slate-400 italic">
											No box-level photos.
										</p>
									) : (
										<div className="grid grid-cols-3 gap-4">
											{boxPhotos.map((url: string, uidx: number) => {
												const isHidden = localHiddenUrls.includes(url);
												return (
													<button
														key={`box-manage-photo-${uidx}`}
														type="button"
														onClick={() => handleToggleLocal(url)}
														className={`relative group rounded-lg overflow-hidden border-2 text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
															isHidden
																? "border-slate-200 opacity-60 bg-slate-50"
																: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/5"
														}`}
													>
														<img
															src={url}
															alt={`Box ${uidx + 1}`}
															className="w-full h-28 object-cover"
														/>
														<div
															className={`absolute bottom-0 inset-x-0 py-1.5 px-2 text-[10px] font-semibold text-center select-none transition-colors ${
																isHidden
																	? "bg-slate-500 text-white"
																	: "bg-emerald-600 text-white"
															}`}
														>
															{isHidden ? "🚫 Hidden" : "✅ Shown"}
														</div>
													</button>
												);
											})}
										</div>
									)}
								</div>

								{/* Items with Photos Sections */}
								{itemsWithPhotos.length > 0 && (
									<div className="flex flex-col gap-6">
										<h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-t pt-4">
											🏷️ Item Photos
										</h5>
										{itemsWithPhotos.map((item: any, idx: number) => {
											const itemPhotos = item.photo_urls || [];
											return (
												<div
													key={`item-photos-section-${item.id}-${idx}`}
													className="bg-slate-50/50 p-4 rounded-lg border border-slate-100"
												>
													<div className="mb-3">
														<span className="text-xs font-bold text-slate-700 block">
															Item {idx + 1}: {item.item_num || "No #"}
														</span>
														<span className="text-xs text-slate-600 block mt-0.5 italic">
															{item.item_name || "No Description"}
														</span>
														<span className="inline-block mt-1 text-[10px] bg-slate-200/60 text-slate-700 px-2 py-0.5 rounded-full font-medium">
															Quantity: {item.quantity}
														</span>
													</div>
													<div className="grid grid-cols-3 gap-4">
														{itemPhotos.map((url: string, pidx: number) => {
															const isHidden = localHiddenUrls.includes(url);
															return (
																<button
																	key={`item-manage-photo-${item.id}-${pidx}`}
																	type="button"
																	onClick={() => handleToggleLocal(url)}
																	className={`relative group rounded-lg overflow-hidden border-2 text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
																		isHidden
																			? "border-slate-200 opacity-60 bg-slate-50"
																			: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/5"
																	}`}
																>
																	<img
																		src={url}
																		alt={`Item ${pidx + 1}`}
																		className="w-full h-28 object-cover"
																	/>
																	<div
																		className={`absolute bottom-0 inset-x-0 py-1.5 px-2 text-[10px] font-semibold text-center select-none transition-colors ${
																			isHidden
																				? "bg-slate-500 text-white"
																				: "bg-emerald-600 text-white"
																		}`}
																	>
																		{isHidden ? "🚫 Hidden" : "✅ Shown"}
																	</div>
																</button>
															);
														})}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</>
						)}
					</div>
				</div>

				{/* Modal Footer */}
				<div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-2 shrink-0">
					<button
						type="button"
						onClick={handleCloseAndSave}
						className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-md cursor-pointer"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	);
};
