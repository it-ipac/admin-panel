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
import { getBoxTags } from "../utils";
import { MediaManagerModal } from "./MediaManagerModal";
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
		if (filters.statusFilter) {
			result = result.filter((inst) => inst.status === filters.statusFilter);
		}
		if (filters.boxId) {
			result = result.filter((inst) => inst.id === filters.boxId);
		}
		// Client-side tag filter: match instance.tag against selected tag names using fallback helper
		if (filters.tags.length > 0) {
			result = result.filter((inst) => {
				const instTags = getBoxTags(inst);
				return filters.tags.some((t) => instTags.includes(t.toLowerCase()));
			});
		}

		// 2. Sort — destination priority first, then tag priority within same dest
		const tagTerms = (filters.tagSortPriority || "")
			.split(",")
			.map((t) => t.trim().toLowerCase())
			.filter(Boolean);
		const destTerms = (filters.destSortPriority || "")
			.split(",")
			.map((t) => t.trim().toLowerCase())
			.filter(Boolean);

		result.sort((a, b) => {
			const sortModePriority = filters.sortMode || "destination_first";

			// Parse destinations
			const destsA = String(a.destination || "")
				.toLowerCase()
				.split(/[,;/]+/)
				.map((t) => t.trim())
				.filter(Boolean);
			const destsB = String(b.destination || "")
				.toLowerCase()
				.split(/[,;/]+/)
				.map((t) => t.trim())
				.filter(Boolean);

			const rankDestA =
				destTerms.length > 0
					? destTerms.findIndex((dt) => destsA.includes(dt))
					: -1;
			const rankDestB =
				destTerms.length > 0
					? destTerms.findIndex((dt) => destsB.includes(dt))
					: -1;

			const scoreDestA = rankDestA === -1 ? destTerms.length : rankDestA;
			const scoreDestB = rankDestB === -1 ? destTerms.length : rankDestB;

			// Parse tags using fallback helper
			const tagsA = getBoxTags(a);
			const tagsB = getBoxTags(b);

			// Map tags to indices in tagTerms, sorted ascending
			const tagRanksA = tagsA
				.map((t) => tagTerms.indexOf(t))
				.filter((idx) => idx !== -1)
				.sort((x, y) => x - y);
			const tagRanksB = tagsB
				.map((t) => tagTerms.indexOf(t))
				.filter((idx) => idx !== -1)
				.sort((x, y) => x - y);

			const minTagRankA = tagRanksA.length > 0 ? tagRanksA[0] : tagTerms.length;
			const minTagRankB = tagRanksB.length > 0 ? tagRanksB[0] : tagTerms.length;

			const compareRanks = (arr1: number[], arr2: number[]) => {
				const len = Math.max(arr1.length, arr2.length);
				for (let i = 0; i < len; i++) {
					const val1 = arr1[i] !== undefined ? arr1[i] : tagTerms.length;
					const val2 = arr2[i] !== undefined ? arr2[i] : tagTerms.length;
					if (val1 !== val2) return val1 - val2;
				}
				return 0;
			};

			if (sortModePriority === "tag_first") {
				// 1. Tag primary (highest priority tag group)
				if (tagTerms.length > 0) {
					if (minTagRankA !== minTagRankB) return minTagRankA - minTagRankB;
				}
				// 2. Destination secondary
				if (destTerms.length > 0) {
					if (scoreDestA !== scoreDestB) return scoreDestA - scoreDestB;
				}
				// 3. Tag secondary (full combination)
				if (tagTerms.length > 0) {
					const cmp = compareRanks(tagRanksA, tagRanksB);
					if (cmp !== 0) return cmp;
				}
			} else if (sortModePriority === "tag_combination") {
				// 1. Tag combination primary
				if (tagTerms.length > 0) {
					const cmp = compareRanks(tagRanksA, tagRanksB);
					if (cmp !== 0) return cmp;
				}
				// 2. Destination secondary
				if (destTerms.length > 0) {
					if (scoreDestA !== scoreDestB) return scoreDestA - scoreDestB;
				}
			} else {
				// Default: destination_first
				// 1. Destination primary
				if (destTerms.length > 0) {
					if (scoreDestA !== scoreDestB) return scoreDestA - scoreDestB;
				}
				// 2. Tag combination secondary
				if (tagTerms.length > 0) {
					const cmp = compareRanks(tagRanksA, tagRanksB);
					if (cmp !== 0) return cmp;
				}
			}

			// C. Fallback to normal sort
			const sortMode = pkgSettings.boxes_sort || "number";
			if (sortMode === "packed_date") {
				const timeA = a.last_packed_at
					? new Date(a.last_packed_at).getTime()
					: 0;
				const timeB = b.last_packed_at
					? new Date(b.last_packed_at).getTime()
					: 0;
				if (timeA !== timeB) {
					return timeB - timeA;
				}
				const createdA = new Date(a.created_at).getTime();
				const createdB = new Date(b.created_at).getTime();
				return createdB - createdA;
			}

			if (a.package_number !== b.package_number) {
				return a.package_number - b.package_number;
			}
			return a.instance_number - b.instance_number;
		});

		// 3. Photos-first: stable partition so boxes with photos lead the report
		// while keeping the sort order above within each group
		if (filters.photosFirst) {
			const hasPhotos = (inst: (typeof result)[number]) =>
				(inst.box_photo_urls?.length ?? 0) > 0 ||
				inst.pkd_items?.some((i: any) => (i.photo_urls?.length ?? 0) > 0);
			result = [
				...result.filter((inst) => hasPhotos(inst)),
				...result.filter((inst) => !hasPhotos(inst)),
			];
		}

		return result;
	}, [
		instances,
		filters.packedOnly,
		filters.statusFilter,
		filters.photosFirst,
		filters.boxId,
		filters.tags,
		pkgSettings.boxes_sort,
		filters.tagSortPriority,
		filters.destSortPriority,
		filters.sortMode,
	]);

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

	// Reset navigation when instances or filter selections change
	const instanceIdsHash = filteredAndSortedInstances
		.map((inst) => inst.id)
		.join(",");
	const orderIdsHash = filters.orderIds.join(",");
	const destinationsHash = filters.destinations.join(",");
	const tagsHash = filters.tags.join(",");

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset page/report only on actual filter scope or instance list changes
	useEffect(() => {
		setCurrentPage(0);
		setCurrentReportIndex(0);
	}, [
		filters.clientId,
		orderIdsHash,
		filters.dateFrom,
		filters.dateTo,
		filters.dateFilterMode,
		tagsHash,
		destinationsHash,
		filters.hasItemsOnly,
		filters.packedOnly,
		filters.statusFilter,
		filters.splitBy,
		filters.boxId,
		instanceIdsHash,
		filters.tagSortPriority,
		filters.destSortPriority,
	]);

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

	// Cap currentPage if totalPages shrinks
	useEffect(() => {
		if (totalPages > 0 && currentPage >= totalPages) {
			setCurrentPage(totalPages - 1);
		}
	}, [totalPages, currentPage]);

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
			setScale(Math.min(sx, sy)); // Fit both width and height inside the container space
		} else if (scaleMode === "fill") {
			setScale(sx); // Zoom in to fill the width of the parent (scrolling vertically if needed)
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
			// Arrow keys paging: go to next/previous page (ArrowRight/ArrowDown -> next, ArrowLeft/ArrowUp -> prev)
			if (
				e.key === "ArrowRight" ||
				e.key === "ArrowDown" ||
				e.key === "ArrowLeft" ||
				e.key === "ArrowUp"
			) {
				// Ignore if the user is typing inside an input, textarea or select
				const activeTag = document.activeElement?.tagName.toLowerCase();
				if (
					activeTag === "input" ||
					activeTag === "textarea" ||
					activeTag === "select"
				) {
					return;
				}
				e.preventDefault();
				if (e.key === "ArrowRight" || e.key === "ArrowDown") {
					setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
				} else {
					setCurrentPage((p) => Math.max(0, p - 1));
				}
				return;
			}

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
	}, [ctrlScrollZoomReport, invertPageScroll, totalPages]);

	const isLandscape = displaySettings.orientation === "landscape";
	const pageW = isLandscape ? "297mm" : "210mm";
	const pageH = isLandscape ? "210mm" : "297mm";
	const pagePad = isLandscape ? "6mm" : "12mm";

	if (!filters.clientId && filters.orderIds.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-neutral-400 text-sm italic">
				Select a client to preview the report.
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full flex-col gap-3 text-neutral-500">
				<div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
				<span className="text-sm">Loading packages...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-full text-danger-500 text-sm">
				Error loading data. Check console.
			</div>
		);
	}

	const page = pages[currentPage];

	return (
		<div className="flex flex-col h-full">
			{/* ─── Report Switcher (report_per_order mode) ─── */}
			{isReportPerOrder && totalReports > 1 && (
				<div className="flex items-center gap-2 px-4 py-1.5 bg-accent-50 border-b border-accent-200 shrink-0">
					<span className="text-xs font-semibold text-accent-700 mr-1">
						Report:
					</span>
					<button
						type="button"
						onClick={() => {
							setCurrentReportIndex((r) => Math.max(0, r - 1));
							setCurrentPage(0);
						}}
						disabled={currentReportIndex === 0}
						className="p-1 rounded hover:bg-accent-100 disabled:opacity-30 transition-colors"
					>
						<ChevronLeft className="w-3.5 h-3.5 text-accent-700" />
					</button>
					<span className="text-xs font-medium text-accent-800 min-w-[100px] text-center">
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
						className="p-1 rounded hover:bg-accent-100 disabled:opacity-30 transition-colors"
					>
						<ChevronRight className="w-3.5 h-3.5 text-accent-700" />
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
										? "bg-accent-600"
										: "bg-accent-200 hover:bg-accent-400"
								}`}
								title={rg.orderName}
							/>
						))}
					</div>
					<span className="text-xs text-accent-500 ml-auto">
						{currentReportIndex + 1} / {totalReports}
					</span>
				</div>
			)}

			{/* ─── Page Nav Toolbar ─── */}
			<div className="flex flex-wrap items-center justify-between px-4 py-2 bg-neutral-100 border-b shrink-0 gap-3">
				{/* Left: Navigation & Info */}
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1 bg-white border border-neutral-300 rounded p-0.5 shadow-sm">
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
							disabled={currentPage === 0}
							className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 transition-colors"
						>
							<ChevronLeft className="w-4 h-4 text-neutral-600" />
						</button>
						<span className="text-xs font-semibold text-neutral-700 min-w-[75px] text-center select-none">
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
							className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 transition-colors"
						>
							<ChevronRight className="w-4 h-4 text-neutral-600" />
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
										className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentPage ? "bg-primary-600" : "bg-neutral-300 hover:bg-neutral-400"}`}
									/>
								);
							})}
						</div>
					)}

					<div className="text-xs text-neutral-500 font-medium hidden sm:inline-block">
						{activeInstances.length} boxes ·{" "}
						{isLandscape ? "Landscape" : "Portrait"}
						{page?.label && (
							<span className="ml-2 px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded font-medium">
								{page.label}
							</span>
						)}
					</div>
				</div>

				{/* Middle/Center: Zoom & View Options */}
				<div className="flex items-center gap-2 flex-wrap">
					{/* Zoom widget */}
					<div className="flex items-center gap-1 bg-white border border-neutral-300 rounded px-1.5 py-0.5 shadow-sm">
						<button
							type="button"
							onClick={() => {
								setScaleMode("manual");
								setScale((prev) => Math.max(prev - 0.1, 0.2));
							}}
							className="p-1 rounded hover:bg-neutral-100 font-bold text-neutral-500 text-xs w-6 h-6 flex items-center justify-center transition-colors cursor-pointer"
							title="Zoom Out"
						>
							-
						</button>
						<span className="text-xs font-bold text-neutral-700 min-w-[36px] text-center select-none">
							{Math.round(scale * 100)}%
						</span>
						<button
							type="button"
							onClick={() => {
								setScaleMode("manual");
								setScale((prev) => Math.min(prev + 0.1, 3));
							}}
							className="p-1 rounded hover:bg-neutral-100 font-bold text-neutral-500 text-xs w-6 h-6 flex items-center justify-center transition-colors cursor-pointer"
							title="Zoom In"
						>
							+
						</button>
						<div className="w-[1px] h-4 bg-neutral-200 mx-1" />
						<button
							type="button"
							onClick={() => setScaleMode("fit")}
							className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
								scaleMode === "fit"
									? "bg-primary-100 text-primary-700"
									: "text-neutral-600 hover:text-primary-600 hover:bg-primary-50"
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
									? "bg-primary-100 text-primary-700"
									: "text-neutral-600 hover:text-primary-600 hover:bg-primary-50"
							}`}
							title="Fill container space"
						>
							Fill
						</button>
					</div>

					{/* Ruler & Grid toggle */}
					<label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer font-semibold select-none bg-white border border-neutral-300 rounded px-2.5 py-1.5 shadow-sm hover:bg-neutral-50 transition-colors">
						<input
							type="checkbox"
							checked={showRuler}
							onChange={(e) => setShowRuler(e.target.checked)}
							className="rounded text-primary-600 accent-primary-600 cursor-pointer w-3.5 h-3.5"
						/>
						Ruler & Grid
					</label>

					{/* Photos Manage */}
					<button
						type="button"
						onClick={() => setMediaManagerOpen(true)}
						className="flex items-center gap-1.5 text-xs text-neutral-700 font-bold bg-white border border-neutral-300 rounded px-2.5 py-1.5 shadow-sm hover:bg-neutral-50 transition-colors cursor-pointer"
					>
						<Image className="w-3.5 h-3.5 text-primary-600" />
						Manage Photos
					</button>
				</div>

				{/* Right: Scroll & Zoom configuration */}
				<div className="flex items-center gap-2">
					{/* Flip scroll direction */}
					<label
						className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer font-semibold select-none bg-white border border-neutral-300 rounded px-2.5 py-1.5 shadow-sm hover:bg-neutral-50 transition-colors"
						title="Invert direction when scrolling wheel to switch pages"
					>
						<input
							type="checkbox"
							checked={invertPageScroll}
							onChange={(e) => setInvertPageScroll(e.target.checked)}
							className="rounded text-primary-600 accent-primary-600 cursor-pointer w-3.5 h-3.5"
						/>
						Invert Page Scroll
					</label>

					{/* Shortcut config */}
					<label
						className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer font-semibold select-none bg-white border border-neutral-300 rounded px-2.5 py-1.5 shadow-sm hover:bg-neutral-50 transition-colors"
						title="Enable Ctrl+Scroll to zoom page instead of browser"
					>
						<input
							type="checkbox"
							checked={ctrlScrollZoomReport}
							onChange={(e) => setCtrlScrollZoomReport(e.target.checked)}
							className="rounded text-primary-600 accent-primary-600 cursor-pointer w-3.5 h-3.5"
						/>
						Ctrl+Scroll Zoom
					</label>
				</div>
			</div>

			{/* ─── Page Viewer ─── */}
			<div
				ref={containerRef}
				className="flex-1 bg-neutral-300 overflow-auto flex p-8 relative"
				tabIndex={-1}
				style={{ scrollBehavior: "smooth" }}
			>
				{totalPages === 0 ? (
					<div className="text-neutral-500 text-sm italic margin-auto">
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
								editable={true}
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
