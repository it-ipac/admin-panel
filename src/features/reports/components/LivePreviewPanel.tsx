import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	useCompanyProfileQuery,
	useReportInstancesQuery,
} from "../hooks/useReportBuilderQueries";
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
}) => {
	const {
		data: instances,
		isLoading,
		error,
	} = useReportInstancesQuery(filters);
	const { data: companyProfile } = useCompanyProfileQuery();

	const [currentPage, setCurrentPage] = useState(0);
	const [scale, setScale] = useState(0.7);
	const [showRuler, setShowRuler] = useState(true);
	const containerRef = useRef<HTMLDivElement>(null);

	// Filter and sort instances
	const filteredAndSortedInstances = React.useMemo(() => {
		if (!instances) return [];

		// 1. Filter
		let result = [...instances];
		if (filters.packedOnly) {
			result = result.filter((inst) => inst.status === "packed");
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
	}, [instances, filters.packedOnly, pkgSettings.boxes_sort]);

	// Reset to page 0 whenever filter changes produce new results
	useEffect(() => {
		if (filteredAndSortedInstances) {
			setCurrentPage(0);
		}
	}, [filteredAndSortedInstances]);

	// Paginate instances into pages
	const pages = React.useMemo(() => {
		return paginateInstances(
			filteredAndSortedInstances,
			displaySettings,
			pkgSettings,
			filters.splitBy,
		);
	}, [
		filteredAndSortedInstances,
		displaySettings,
		pkgSettings,
		filters.splitBy,
	]);

	const totalPages = pages.length;

	// Compute scale to fit page in container
	const updateScale = useCallback(() => {
		if (!containerRef.current) return;
		const { clientWidth: cw, clientHeight: ch } = containerRef.current;
		const isLandscape = displaySettings.orientation === "landscape";
		// A4 at 96dpi: 794×1123, landscape: 1123×794
		const pageW = isLandscape ? 1123 : 794;
		const pageH = isLandscape ? 794 : 1123;
		const padding = 64;
		const sx = (cw - padding) / pageW;
		const sy = (ch - padding) / pageH;
		setScale(Math.min(sx, sy, 1));
	}, [displaySettings.orientation]);

	useEffect(() => {
		updateScale();
		const obs = new ResizeObserver(updateScale);
		if (containerRef.current) obs.observe(containerRef.current);
		return () => obs.disconnect();
	}, [updateScale]);

	const isLandscape = displaySettings.orientation === "landscape";
	const pageW = isLandscape ? "297mm" : "210mm";
	const pageH = isLandscape ? "210mm" : "297mm";
	const pagePad = "12mm";

	if (!filters.clientId && !filters.orderId) {
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
			{/* ─── Page Nav Toolbar ─── */}
			<div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b shrink-0 gap-4">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
						disabled={currentPage === 0}
						className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<span className="text-sm font-medium text-gray-700 min-w-[90px] text-center">
						{totalPages === 0
							? "0 pages"
							: `Page ${currentPage + 1} of ${totalPages}`}
					</span>
					<button
						type="button"
						onClick={() =>
							setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
						}
						disabled={currentPage >= totalPages - 1}
						className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>

				{/* Page dots */}
				{totalPages > 1 && totalPages <= 10 && (
					<div className="flex gap-1.5">
						{Array.from({ length: totalPages }).map((_, i) => {
							const pageKey = `page-dot-${i}`;
							return (
								<button
									key={pageKey}
									type="button"
									onClick={() => setCurrentPage(i)}
									className={`w-2 h-2 rounded-full transition-colors ${i === currentPage ? "bg-blue-600" : "bg-gray-300 hover:bg-gray-400"}`}
								/>
							);
						})}
					</div>
				)}

				{/* Ruler Toggle */}
				<div className="flex items-center gap-2">
					<label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer font-medium select-none bg-white border border-gray-300 rounded px-2.5 py-1 shadow-sm hover:bg-gray-50 transition-colors">
						<input
							type="checkbox"
							checked={showRuler}
							onChange={(e) => setShowRuler(e.target.checked)}
							className="rounded text-blue-600 accent-blue-600 cursor-pointer w-3.5 h-3.5"
						/>
						📏 Ruler & Grid
					</label>
				</div>

				{/* Info */}
				<div className="text-xs text-gray-400">
					{filteredAndSortedInstances.length} boxes ·{" "}
					{isLandscape ? "Landscape" : "Portrait"}
					{page?.label && (
						<span className="ml-2 text-blue-600 font-medium">{page.label}</span>
					)}
				</div>
			</div>

			{/* ─── Page Viewer ─── */}
			<div
				ref={containerRef}
				className="flex-1 bg-gray-300 overflow-hidden flex items-center justify-center relative"
			>
				{totalPages === 0 ? (
					<div className="text-gray-500 text-sm italic">No packages match.</div>
				) : (
					<div
						style={{
							transform: `scale(${scale})`,
							transformOrigin: "center center",
							transition: "transform 0.15s ease",
							width: pageW,
							height: pageH,
							padding: `0px ${pagePad} ${pagePad} ${pagePad}`,
							background: "white",
							boxShadow:
								"0 4px 24px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.12)",
							position: "relative",
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
											groupLabel={pg.label}
											pageIndex={idx}
											totalPages={pages.length}
											isFirstPageOfGroup={
												pages.findIndex((p) => p.label === pg.label) === idx
											}
											display={displaySettings}
											pkg={pkgSettings}
											headerData={headerData}
											clientData={clientData}
											clientOrderData={clientOrderData}
											clientShipmentData={clientShipmentData}
											companyData={companyData}
											companyProfile={companyProfile}
										/>
									</div>
								);
							})}
						</div>

						{/* Visible current page */}
						<PackingListPage
							key={`visible-${currentPage}`}
							items={page?.items ?? []}
							groupLabel={page?.label}
							pageIndex={currentPage}
							totalPages={totalPages}
							isFirstPageOfGroup={
								pages.findIndex((p) => p.label === page?.label) === currentPage
							}
							display={displaySettings}
							pkg={pkgSettings}
							headerData={headerData}
							clientData={clientData}
							clientOrderData={clientOrderData}
							clientShipmentData={clientShipmentData}
							companyData={companyData}
							companyProfile={companyProfile}
						/>
					</div>
				)}
			</div>
		</div>
	);
};
