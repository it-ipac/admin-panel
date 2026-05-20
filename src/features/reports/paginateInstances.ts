import type {
	ReportDisplaySettings,
	ReportPkgDetailsSettings,
} from "./settings-defaults";
import type { ReportInstanceData } from "./types";

// Estimated heights in pixels at 96dpi
const FONT_SCALE = { small: 0.82, medium: 1, large: 1.18 };
// Full A4 page heights in px at 96 dpi
const PAGE_H_PX = { portrait: 1123, landscape: 794 };
// Page side padding in px (≈20mm * 3.78)
const PAGE_SIDE_PAD_PX = 76;

function getBoxBaseHeight(
	pkg: ReportPkgDetailsSettings,
	fs: "small" | "medium" | "large",
	isContinuation: boolean,
	inst?: ReportInstanceData,
	hiddenMediaUrls: string[] = [],
	display?: ReportDisplaySettings,
): number {
	const fm = FONT_SCALE[fs];
	if (pkg.box_display_mode === "compact") {
		return 24 * fm;
	}
	if (isContinuation) {
		return 50 * fm + 14;
	}
	let h = 70 * fm; // box header + meta rows
	if (
		pkg.show_dimensions ||
		pkg.show_weights ||
		pkg.show_internal_dims ||
		pkg.show_external_dims ||
		pkg.show_net_weight ||
		pkg.show_gross_weight ||
		pkg.show_unit_m3 ||
		pkg.show_unit_m2 ||
		pkg.show_sei
	) {
		h += 22 * fm;
	}
	if (pkg.show_items && pkg.items_detail_level === "full") {
		h += 28 * fm; // table header
	}

	// Add box photos height if visible
	let photosH = 0;
	if (pkg.show_box_photos && !isContinuation && inst?.box_photo_urls) {
		const visibleBoxPhotos = inst.box_photo_urls.filter(
			(url) => !hiddenMediaUrls.includes(url),
		);
		if (visibleBoxPhotos.length > 0) {
			const orientation = display?.orientation || "portrait";
			const cols = orientation === "landscape" ? 11 : 7;
			const rows = Math.ceil(visibleBoxPhotos.length / cols);
			photosH = rows * 72 + 16;
		}
	}
	h += photosH;

	h += 14; // card padding/margin
	return h;
}

function getItemHeight(
	item: any,
	pkg: ReportPkgDetailsSettings,
	fs: "small" | "medium" | "large",
	hiddenMediaUrls: string[] = [],
): number {
	const fm = FONT_SCALE[fs];
	let h = 22 * fm; // base row height
	if (pkg.show_item_photos && item.photo_urls) {
		const visibleItemPhotos = item.photo_urls.filter(
			(url: string) => !hiddenMediaUrls.includes(url),
		);
		if (visibleItemPhotos.length > 0) {
			h += 55 * fm; // photo container height (45px img + margins/paddings)
		}
	}
	return h;
}

function estimateBoxHeight(
	inst: ReportInstanceData,
	pkg: ReportPkgDetailsSettings,
	fs: "small" | "medium" | "large",
	display: ReportDisplaySettings,
	hiddenMediaUrls: string[] = [],
): number {
	const fm = FONT_SCALE[fs];
	if (pkg.box_display_mode === "compact") {
		return 24 * fm;
	}
	let h = 70 * fm; // box header + meta rows
	if (
		pkg.show_dimensions ||
		pkg.show_weights ||
		pkg.show_internal_dims ||
		pkg.show_external_dims ||
		pkg.show_net_weight ||
		pkg.show_gross_weight ||
		pkg.show_unit_m3 ||
		pkg.show_unit_m2 ||
		pkg.show_sei
	) {
		h += 22 * fm;
	}
	if (pkg.show_items && inst.pkd_items.length > 0) {
		if (pkg.items_detail_level === "summary") {
			h += 20 * fm;
		} else {
			h += 28 * fm; // table header
			h += inst.pkd_items.reduce(
				(sum, item) => sum + getItemHeight(item, pkg, fs, hiddenMediaUrls),
				0,
			);
		}
	}

	// Add box photos height if visible
	let photosH = 0;
	if (pkg.show_box_photos && inst.box_photo_urls) {
		const visibleBoxPhotos = inst.box_photo_urls.filter(
			(url) => !hiddenMediaUrls.includes(url),
		);
		if (visibleBoxPhotos.length > 0) {
			const cols = display.orientation === "landscape" ? 11 : 7;
			const rows = Math.ceil(visibleBoxPhotos.length / cols);
			photosH = rows * 72 + 16;
		}
	}
	h += photosH;

	h += 14; // card padding/margin
	if (display.include_signatures && display.signatures_scope === "box") {
		// signing line height + label text + padding
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

	// Dynamically compute max usable height from actual A4 dimensions
	// = full page height − top margin − side pad (approx) − header block − footer
	const topMarginPx = (display.header_top_margin ?? 20) * 3.78;
	const footerPx = display.footer_height_px ?? 40;
	const footerGapPx = display.footer_body_gap_px ?? 0;
	const headerBlockPx = isHeaderHidden ? 0 : 140;
	const maxH =
		PAGE_H_PX[display.orientation] -
		topMarginPx -
		PAGE_SIDE_PAD_PX -
		headerBlockPx -
		footerPx -
		footerGapPx;

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
				pkg.items_detail_level === "full" &&
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
						(sum, item) => sum + getItemHeight(item, pkg, fs, hiddenMediaUrls),
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
						);
						if (headerH + currentSliceH + itemH <= usableH) {
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
							const sliceH = slice.reduce(
								(sum, item) =>
									sum + getItemHeight(item, pkg, fs, hiddenMediaUrls),
								0,
							);
							currentH += headerH + sliceH + actualSigH;
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
						(sum, item) => sum + getItemHeight(item, pkg, fs, hiddenMediaUrls),
						0,
					);
					currentH += headerH + sliceH; // has_more is guaranteed true, so no sigH added
					isFirstPageForBox = false;
					lineOffset += slice.length;
				}
			} else {
				// Summary or no items
				const boxH = estimateBoxHeight(inst, pkg, fs, display, hiddenMediaUrls);
				if (currentH + boxH > maxH && current.length > 0) {
					pages.push({ label: group.label, items: current });
					current = [inst];
					currentH = boxH;
				} else {
					current.push(inst);
					currentH += boxH;
				}
			}
		}
		if (current.length > 0) {
			pages.push({ label: group.label, items: current });
		}
	}

	return pages.length > 0 ? pages : [{ items: [] }];
}
