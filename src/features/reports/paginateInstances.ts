import type {
	ReportDisplaySettings,
	ReportPkgDetailsSettings,
} from "./settings-defaults";
import type { ReportInstanceData } from "./types";

// Estimated heights in pixels at 96dpi
const FONT_SCALE = { small: 0.82, medium: 1, large: 1.18 };
// Full A4 page heights in px at 96 dpi
const PAGE_H_PX = { portrait: 1123, landscape: 794 };

function getFontScale(
	display?: ReportDisplaySettings,
	fs?: "small" | "medium" | "large",
): number {
	if (display?.font_size_px) {
		return display.font_size_px / 12;
	}
	const size = fs || display?.font_size || "medium";
	return FONT_SCALE[size];
}

function getReportHeaderHeight(
	display: ReportDisplaySettings,
	hasGroupLabel: boolean,
): number {
	if (display.header_show_mode === "first_page_only") {
		return 0; // Hidden on continuation pages
	}

	const isLandscape = display.orientation === "landscape";

	// Margins and borders
	const bordersAndMargins = isLandscape
		? 3 + 6 + 6 + 2 + 8 // 25px
		: 5 + 12 + 10 + 2 + 12; // 41px

	// Left column (logo/company name)
	let leftH = 0;
	if (display.show_company_logo) {
		const logoSize = display.logo_size ?? 90;
		if (display.show_company_name) {
			leftH =
				Math.round(logoSize * (isLandscape ? 0.4 : 0.55)) +
				(isLandscape ? 2 : 4) +
				(isLandscape ? 10 : 12);
		} else {
			leftH =
				Math.round(logoSize * (isLandscape ? 0.65 : 0.9)) +
				(isLandscape ? 2 : 4);
		}
	} else if (display.show_company_name) {
		leftH = isLandscape ? 12 : 15;
	}

	// Center column (title and metadata)
	const titleH = isLandscape ? 20 : 26;
	const subTitleH = hasGroupLabel ? (isLandscape ? 12 : 15) : 0;
	const metadataH = isLandscape ? 12 : 15; // Ref, Date, Project, Dest
	const centerH = titleH + subTitleH + metadataH;

	// Right column (summary)
	const rightH = isLandscape ? 24 : 30;

	const rowH = Math.max(leftH, centerH, rightH);
	return bordersAndMargins + rowH;
}

// Page side padding in px (≈20mm * 3.78)
function getBoxBaseHeight(
	pkg: ReportPkgDetailsSettings,
	fs: "small" | "medium" | "large",
	isContinuation: boolean,
	inst?: ReportInstanceData,
	hiddenMediaUrls: string[] = [],
	display?: ReportDisplaySettings,
): number {
	const fm = getFontScale(display, fs);
	if (pkg.box_display_mode === "compact") {
		return (pkg.show_qr_code && inst?.qr_token ? 36 : 24) * fm;
	}

	// Dynamic calculation of header wrapping based on content lengths
	let headerTextLen = 0;
	if (pkg.show_box_number !== false) headerTextLen += 15;
	if (pkg.show_quantity && inst?.package_qty) headerTextLen += 10;
	if (
		pkg.show_internal_dims &&
		(inst?.internal_length || inst?.internal_width || inst?.internal_height)
	)
		headerTextLen += 25;
	if (
		pkg.show_external_dims &&
		(inst?.external_length || inst?.external_width || inst?.external_height)
	)
		headerTextLen += 25;
	if (pkg.show_tare && inst?.tare) headerTextLen += 15;
	if (pkg.show_net_weight && inst?.net_weight) headerTextLen += 15;
	if (pkg.show_gross_weight && inst?.gross_weight) headerTextLen += 15;
	if (pkg.show_unit_m3) headerTextLen += 15;
	if (pkg.show_total_m3) headerTextLen += 15;
	if (pkg.show_unit_m2) headerTextLen += 15;
	if (pkg.show_total_m2) headerTextLen += 15;
	if (pkg.show_sei && inst?.sei_category) headerTextLen += 20;
	if (pkg.show_ipac_reference && inst?.ipac_reference)
		headerTextLen += inst.ipac_reference.length + 12;
	if (pkg.show_destination && inst?.destination)
		headerTextLen += inst.destination.length + 8;
	if (pkg.show_order_name && inst?.order_name)
		headerTextLen += inst.order_name.length + 8;

	// Calculate charPerLine dynamically
	const isLandscape = display?.orientation === "landscape";
	const hasQr = pkg.show_qr_code && inst?.qr_token;
	const pageWidth = isLandscape ? 1123 : 794;
	const padding = 30 * 2; // 30px left & right
	const qrWidth = hasQr ? 60 : 0;
	const textWidth = pageWidth - padding - qrWidth;
	const charWidth = 5.2 * fm; // char width at font-size 10px is ~5.2px at fm = 1
	const charPerLine = Math.max(20, Math.floor(textWidth / charWidth));

	const headerLines = Math.max(1, Math.ceil(headerTextLen / charPerLine));

	// Line 1: header row — text height scales with fm, padding is fixed CSS px
	let h = Math.round(14 * fm) * headerLines + 16; // 16px = 12px padding + 2px border + 2px safety
	if (hasQr) {
		// QR image 48px (scales) + 12px padding (fixed)
		h = Math.max(h, Math.round(48 * fm) + 12);
	}

	// Line 2: Detailed box info
	const hasLine2 =
		pkg.show_total_qty_items || pkg.show_last_packed_date || pkg.show_box_type;
	if (hasLine2 && !isContinuation) {
		// 9.5px text (scales) + 8px padding (fixed)
		h += Math.round(9.5 * fm) + 8;
	}

	// Add item table header if items are shown (and not summary)
	if (
		pkg.show_items &&
		inst &&
		inst.pkd_items &&
		inst.pkd_items.length > 0 &&
		pkg.items_detail_level !== "summary"
	) {
		// Table <thead> row: 9px text (scales) + 12px padding (fixed) + 2px border (fixed)
		const tableHeaderH = Math.round(9 * fm) + 14;
		// Container div: paddingTop(4) + marginTop(4) + paddingBottom — all fixed CSS px
		const paddingBottom = isContinuation || inst.has_more ? 10 : 20;
		const containerH = 4 + paddingBottom + 4;
		h += tableHeaderH + containerH;
	}

	// Line 3: Box photos
	let photosH = 0;
	if (pkg.show_box_photos && !isContinuation) {
		let allPhotos = [...(inst?.box_photo_urls || [])];
		if (pkg.include_item_photos_in_box_photos && inst?.pkd_items) {
			const itemPhotos = inst.pkd_items.flatMap(
				(item: any) => item.photo_urls || [],
			);
			allPhotos = [...allPhotos, ...itemPhotos];
		}
		const visibleBoxPhotos = allPhotos.filter(
			(url) => !hiddenMediaUrls.includes(url),
		);
		if (visibleBoxPhotos.length > 0) {
			const cols = isLandscape ? 11 : 7;
			const rows = Math.ceil(visibleBoxPhotos.length / cols);
			photosH = rows * 72 + 16;
		}
	}
	h += photosH;
	h += 8; // safety margin
	return h;
}

function getItemHeight(
	item: any,
	pkg: ReportPkgDetailsSettings,
	fs: "small" | "medium" | "large",
	hiddenMediaUrls: string[] = [],
	display?: ReportDisplaySettings,
): number {
	const fm = getFontScale(display, fs);
	const isLandscape = display?.orientation === "landscape";
	const pageWidth = isLandscape ? 1123 : 794;
	const tableWidth = pageWidth - 60 - 20; // 30px*2 page padding + 10px*2 container padding
	let activeColsWidth = 0;
	if (pkg.show_line_num_col) activeColsWidth += 40;
	if (pkg.show_qty_col) activeColsWidth += 40;
	if (pkg.show_item_num_col) activeColsWidth += 100;
	if (pkg.show_item_qr_code) activeColsWidth += 65;

	const descColWidth = tableWidth - activeColsWidth;
	const charWidth = 5.0 * fm; // char width at font-size 9.5px is ~5px at fm = 1
	const charPerLineDesc = Math.max(20, Math.floor(descColWidth / charWidth));
	const charPerLineNum = 18;

	// Row 1 lines of text
	let descLines = 1;
	if (item.item_name && item.item_name.length > charPerLineDesc) {
		descLines = Math.ceil(item.item_name.length / charPerLineDesc);
	}
	let numLines = 1;
	if (item.item_num && item.item_num.length > charPerLineNum) {
		numLines = Math.ceil(item.item_num.length / charPerLineNum);
	}
	const row1Lines = Math.max(descLines, numLines);
	// Row 1: text height scales with fm; padding (12px) is fixed CSS px
	const row1H = Math.round(14 * fm) * row1Lines + 12;

	const hasDims = item.length || item.width || item.height;
	const hasWeight = item.net_weight !== null && item.net_weight !== undefined;

	const visibleItemPhotos = (item.photo_urls || []).filter(
		(url: string) => !hiddenMediaUrls.includes(url),
	);
	const hasPhotos =
		pkg.show_item_photos &&
		!pkg.include_item_photos_in_box_photos &&
		visibleItemPhotos.length > 0;

	// Determine second-row content using the canonical per-field flags (matching the DOM)
	let row2H = 0;
	if (pkg.items_detail_level === "detailed") {
		if (hasPhotos) {
			// Photo row: image 45px (scales) + 12px padding (fixed)
			row2H = Math.round(45 * fm) + 12;
		} else {
			// Use show_item_dimensions / show_item_weight (canonical flags, not legacy show_item_additional_info)
			const showDims =
				pkg.show_item_dimensions !== false &&
				pkg.show_item_additional_info !== false &&
				hasDims;
			const showWeight =
				pkg.show_item_weight !== false &&
				pkg.show_item_additional_info !== false &&
				hasWeight;
			if (showDims || showWeight) {
				// Each visible line is ~11px text (scales) + 2px gap between lines
				// Total padding for the row is fixed 12px regardless of font scale
				const row2Lines = (showDims ? 1 : 0) + (showWeight ? 1 : 0);
				const contentH =
					Math.round(11 * fm) * row2Lines + 2 * Math.max(0, row2Lines - 1); // 2px gap between lines
				row2H = contentH + 12; // + fixed 12px cell padding
			}
		}
	}

	let totalH = row1H + row2H;

	// QR code spans both rows (rowSpan=2 when second row exists).
	// Forces row height up only if combined content rows are shorter than QR.
	// QR image 48px (scales) + 12px padding (fixed)
	const hasQR = pkg.show_item_qr_code && item.qr_token;
	if (hasQR) {
		const qrH = Math.round(48 * fm) + 12;
		totalH = Math.max(totalH, qrH);
	}

	totalH += 2; // border/safety margin
	return totalH;
}

function estimateBoxHeight(
	inst: ReportInstanceData,
	pkg: ReportPkgDetailsSettings,
	fs: "small" | "medium" | "large",
	display: ReportDisplaySettings,
	hiddenMediaUrls: string[] = [],
): number {
	const fm = getFontScale(display, fs);
	if (pkg.box_display_mode === "compact") {
		return (pkg.show_qr_code && inst.qr_token ? 36 : 24) * fm;
	}

	// Dynamic calculation of header wrapping based on content lengths
	let headerTextLen = 0;
	if (pkg.show_box_number !== false) headerTextLen += 15;
	if (pkg.show_quantity && inst.package_qty) headerTextLen += 10;
	if (
		pkg.show_internal_dims &&
		(inst.internal_length || inst.internal_width || inst.internal_height)
	)
		headerTextLen += 25;
	if (
		pkg.show_external_dims &&
		(inst.external_length || inst.external_width || inst.external_height)
	)
		headerTextLen += 25;
	if (pkg.show_tare && inst.tare) headerTextLen += 15;
	if (pkg.show_net_weight && inst.net_weight) headerTextLen += 15;
	if (pkg.show_gross_weight && inst.gross_weight) headerTextLen += 15;
	if (pkg.show_unit_m3) headerTextLen += 15;
	if (pkg.show_total_m3) headerTextLen += 15;
	if (pkg.show_unit_m2) headerTextLen += 15;
	if (pkg.show_total_m2) headerTextLen += 15;
	if (pkg.show_sei && inst.sei_category) headerTextLen += 20;
	if (pkg.show_ipac_reference && inst.ipac_reference)
		headerTextLen += inst.ipac_reference.length + 12;
	if (pkg.show_destination && inst.destination)
		headerTextLen += inst.destination.length + 8;
	if (pkg.show_order_name && inst.order_name)
		headerTextLen += inst.order_name.length + 8;

	// Calculate charPerLine dynamically
	const isLandscape = display.orientation === "landscape";
	const hasQr = pkg.show_qr_code && inst.qr_token;
	const pageWidth = isLandscape ? 1123 : 794;
	const padding = 30 * 2;
	const qrWidth = hasQr ? 60 : 0;
	const textWidth = pageWidth - padding - qrWidth;
	const charWidth = 5.2 * fm;
	const charPerLine = Math.max(20, Math.floor(textWidth / charWidth));

	const headerLines = Math.max(1, Math.ceil(headerTextLen / charPerLine));

	// Line 1: text height scales, padding is fixed CSS px
	let h = Math.round(14 * fm) * headerLines + 16;
	if (hasQr) {
		h = Math.max(h, Math.round(48 * fm) + 12);
	}

	const hasLine2 =
		pkg.show_total_qty_items || pkg.show_last_packed_date || pkg.show_box_type;
	if (hasLine2) {
		h += Math.round(9.5 * fm) + 8;
	}
	if (pkg.show_items && inst.pkd_items.length > 0) {
		if (pkg.items_detail_level === "summary") {
			h += Math.round(12 * fm) + 18; // summary row: text + fixed padding
		} else {
			// Table header: 9px text (scales) + 12px padding (fixed) + 2px border (fixed)
			const tableHeaderH = Math.round(9 * fm) + 14;
			// Container div: all fixed CSS px (paddingTop + marginTop + paddingBottom)
			const containerH = 4 + 20 + 4; // bottom padding is 20px when has_more is false
			h += tableHeaderH + containerH;
			h += inst.pkd_items.reduce(
				(sum, item) =>
					sum + getItemHeight(item, pkg, fs, hiddenMediaUrls, display),
				0,
			);
		}
	}

	// Add box photos height if visible
	let photosH = 0;
	if (pkg.show_box_photos) {
		let allPhotos = [...(inst.box_photo_urls || [])];
		if (pkg.include_item_photos_in_box_photos && inst.pkd_items) {
			const itemPhotos = inst.pkd_items.flatMap(
				(item: any) => item.photo_urls || [],
			);
			allPhotos = [...allPhotos, ...itemPhotos];
		}
		const visibleBoxPhotos = allPhotos.filter(
			(url) => !hiddenMediaUrls.includes(url),
		);
		if (visibleBoxPhotos.length > 0) {
			const cols = isLandscape ? 11 : 7;
			const rows = Math.ceil(visibleBoxPhotos.length / cols);
			photosH = rows * 72 + 16;
		}
	}
	h += photosH;
	h += 8; // safety margin

	if (display.include_signatures && display.signatures_scope === "box") {
		h += (display.signature_height_px ?? 30) + 27;
	}
	return h;
}

export function paginateInstances(
	instances: ReportInstanceData[],
	display: ReportDisplaySettings,
	pkg: ReportPkgDetailsSettings,
	splitBy: "none" | "destination" | "order" | "report_per_order",
	hiddenMediaUrls: string[] = [],
): Array<{ label?: string; items: ReportInstanceData[] }> {
	if (!instances.length) return [{ items: [] }];

	const isHeaderHidden = display.header_show_mode === "first_page_only";
	const fs = display.font_size;
	const fm = getFontScale(display, fs);

	const topPaddingPx =
		isHeaderHidden || display.orientation === "landscape"
			? 10 * 3.78
			: (display.header_top_margin ?? 20) * 3.78;

	const paddingBottomPx = display.orientation === "landscape" ? 15 : 30;
	const pageOuterPadBottomPx =
		(display.orientation === "landscape" ? 6 : 12) * 3.78;

	const footerPx = display.footer_height_px ?? 40;
	const footerGapPx = display.footer_body_gap_px ?? 0;

	// Dynamic headerBlockPx calculation
	const hasGroupLabel = splitBy === "destination" || splitBy === "order";
	const headerBlockPx = getReportHeaderHeight(display, hasGroupLabel);

	const maxH =
		PAGE_H_PX[display.orientation] -
		topPaddingPx -
		pageOuterPadBottomPx -
		paddingBottomPx -
		headerBlockPx -
		footerPx -
		footerGapPx -
		10; // 10px general safety buffer

	// First split by group (destination/order) if needed
	let groups: Array<{ label?: string; items: ReportInstanceData[] }> = [];
	if (splitBy === "destination") {
		const map = new Map<string, ReportInstanceData[]>();
		for (const inst of instances) {
			const k = inst.destination || "No Destination";
			if (!map.has(k)) map.set(k, []);
			map.get(k)!.push(inst);
		}
		groups = Array.from(map.entries()).map(([label, items]) => ({
			label,
			items,
		}));
	} else if (splitBy === "order") {
		const map = new Map<string, ReportInstanceData[]>();
		for (const inst of instances) {
			const k = inst.order_name;
			if (!map.has(k)) map.set(k, []);
			map.get(k)!.push(inst);
		}
		groups = Array.from(map.entries()).map(([label, items]) => ({
			label,
			items,
		}));
	} else {
		groups = [{ items: instances }];
	}

	// Within each group, paginate by height
	const pages: Array<{ label?: string; items: ReportInstanceData[] }> = [];
	for (const group of groups) {
		// Prepend cover page for this group.
		// The cover page is the first page of the group, and isFirstPageOfGroup is true for it.
		// We pass all items of this group to the cover page so that it can display the correct counts.
		pages.push({ label: group.label, items: group.items });

		let current: ReportInstanceData[] = [];
		let currentH = 0;
		for (const inst of group.items) {
			if (
				pkg.box_display_mode !== "compact" &&
				pkg.show_items &&
				(pkg.items_detail_level === "compact" ||
					pkg.items_detail_level === "detailed") &&
				inst.pkd_items.length > 0
			) {
				const overallLines = inst.pkd_items.length;
				const overallQty = inst.pkd_items.reduce(
					(sum, item) => sum + item.quantity,
					0,
				);

				let itemsRemaining = [...inst.pkd_items];
				let isFirstPageForBox = true;
				let lineOffset = 0;

				while (itemsRemaining.length > 0) {
					const baseH = getBoxBaseHeight(
						pkg,
						fs,
						!isFirstPageForBox,
						inst,
						hiddenMediaUrls,
						display,
					);
					const availH = maxH - currentH;

					// Find height of the first item to see if it fits
					const firstItemH = getItemHeight(
						itemsRemaining[0],
						pkg,
						fs,
						hiddenMediaUrls,
						display,
					);

					if (availH < baseH + firstItemH) {
						// Not enough space for header + at least 1 item
						if (current.length > 0) {
							pages.push({ label: group.label, items: current });
							current = [];
							currentH = 0;
						}
					}

					const usableH = maxH - currentH;
					const headerH = getBoxBaseHeight(
						pkg,
						fs,
						!isFirstPageForBox,
						inst,
						hiddenMediaUrls,
						display,
					);
					const sigH =
						display.include_signatures && display.signatures_scope === "box"
							? (display.signature_height_px ?? 30) + 27
							: 0;

					// Check if all remaining items fit, including signatures if complete
					const itemsH = itemsRemaining.reduce(
						(sum, item) =>
							sum + getItemHeight(item, pkg, fs, hiddenMediaUrls, display),
						0,
					);
					const totalRemainingH = headerH + itemsH + sigH;

					if (totalRemainingH <= usableH) {
						// All remaining items fit!
						const slice = itemsRemaining;
						itemsRemaining = [];
						const partInst: ReportInstanceData = {
							...inst,
							pkd_items: slice,
							is_continuation: !isFirstPageForBox,
							has_more: false,
							line_offset: lineOffset,
							overall_lines: overallLines,
							overall_qty: overallQty,
						};
						current.push(partInst);
						currentH += totalRemainingH;
						isFirstPageForBox = false;
						lineOffset += slice.length;
						continue;
					}

					// If they don't all fit (including signatures), we must split.
					// Since we are splitting, this segment will NOT be the last segment,
					// so we won't render signatures here. Thus, has_more must be true.
					// To ensure has_more is true, we must leave at least 1 item for the next page.
					let itemsToFit = 0;
					let currentSliceH = 0;
					for (let i = 0; i < itemsRemaining.length; i++) {
						const itemH = getItemHeight(
							itemsRemaining[i],
							pkg,
							fs,
							hiddenMediaUrls,
							display,
						);
						if (headerH + currentSliceH + itemH + 10 * fm <= usableH) {
							currentSliceH += itemH;
							itemsToFit++;
						} else {
							break;
						}
					}
					// Ensure we leave at least 1 item for the next page
					itemsToFit = Math.min(itemsToFit, itemsRemaining.length - 1);

					if (itemsToFit <= 0) {
						// Not enough space to fit a split segment on this page.
						// Push current page and start a new one.
						if (current.length > 0) {
							pages.push({ label: group.label, items: current });
							current = [];
							currentH = 0;
						} else {
							// Force at least 1 item to avoid infinite loop on a fresh page
							const slice = itemsRemaining.slice(0, 1);
							itemsRemaining = itemsRemaining.slice(1);
							const partInst: ReportInstanceData = {
								...inst,
								pkd_items: slice,
								is_continuation: !isFirstPageForBox,
								has_more: itemsRemaining.length > 0,
								line_offset: lineOffset,
								overall_lines: overallLines,
								overall_qty: overallQty,
							};
							current.push(partInst);
							// If itemsRemaining is now empty, signatures will render
							const actualSigH = itemsRemaining.length === 0 ? sigH : 0;
							const extraPadH = itemsRemaining.length > 0 ? 10 * fm : 0;
							const sliceH = slice.reduce(
								(sum, item) =>
									sum + getItemHeight(item, pkg, fs, hiddenMediaUrls, display),
								0,
							);
							currentH += headerH + sliceH + actualSigH + extraPadH;
							isFirstPageForBox = false;
							lineOffset += slice.length;
						}
						continue;
					}

					const slice = itemsRemaining.slice(0, itemsToFit);
					itemsRemaining = itemsRemaining.slice(itemsToFit);

					const partInst: ReportInstanceData = {
						...inst,
						pkd_items: slice,
						is_continuation: !isFirstPageForBox,
						has_more: itemsRemaining.length > 0,
						line_offset: lineOffset,
						overall_lines: overallLines,
						overall_qty: overallQty,
					};

					current.push(partInst);
					const sliceH = slice.reduce(
						(sum, item) =>
							sum + getItemHeight(item, pkg, fs, hiddenMediaUrls, display),
						0,
					);
					currentH += headerH + sliceH + 10 * fm; // has_more is guaranteed true, so add extra 10 * fm
					isFirstPageForBox = false;
					lineOffset += slice.length;
				}
			} else {
				// Summary or no items
				const boxH = estimateBoxHeight(inst, pkg, fs, display, hiddenMediaUrls);
				// 8px gap renders between boxes when multiple boxes share a page (gap: 8 on the flex container)
				const interBoxGap = current.length > 0 ? 8 : 0;
				if (currentH + interBoxGap + boxH > maxH && current.length > 0) {
					pages.push({ label: group.label, items: current });
					current = [inst];
					currentH = boxH;
				} else {
					current.push(inst);
					currentH += interBoxGap + boxH;
				}
			}
		}
		if (current.length > 0) {
			pages.push({ label: group.label, items: current });
		}
	}

	return pages.length > 0 ? pages : [{ items: [] }];
}
