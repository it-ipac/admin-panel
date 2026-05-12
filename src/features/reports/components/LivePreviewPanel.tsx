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
	const containerRef = useRef<HTMLDivElement>(null);

	// Reset to page 0 whenever filter changes produce new results
	useEffect(() => {
		if (instances) {
			setCurrentPage(0);
		}
	}, [instances]);

	// Paginate instances into pages
	const pages = React.useMemo(() => {
		if (!instances) return [];
		return paginateInstances(
			instances,
			displaySettings,
			pkgSettings,
			filters.splitBy,
		);
	}, [instances, displaySettings, pkgSettings, filters.splitBy]);

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

				{/* Info */}
				<div className="text-xs text-gray-400">
					{instances?.length ?? 0} boxes ·{" "}
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
							padding: pagePad,
							background: "white",
							boxShadow:
								"0 4px 24px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.12)",
						}}
					>
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
											padding: pagePad,
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
