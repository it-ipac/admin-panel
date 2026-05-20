import type {
	ReportDisplaySettings,
	ReportPkgDetailsSettings,
} from "./settings-defaults";
import type { ReportInstanceData } from "./types";

// Estimated heights in pixels at 96dpi
const FONT_SCALE = { small: 0.82, medium: 1, large: 1.18 };
const PAGE_USABLE_H = { portrait: 750, landscape: 450 }; // px usable after header/footer

function getBoxBaseHeight(
	pkg: ReportPkgDetailsSettings,
	fs: "small" | "medium" | "large",
	isContinuation: boolean,
): number {
	const fm = FONT_SCALE[fs];
	if (isContinuation) {
		return 50 * fm + 14;
	}
	let h = 70 * fm; // box header + meta rows
	if (pkg.show_dimensions || pkg.show_weights) h += 22 * fm;
	if (pkg.show_items && pkg.items_detail_level === "full") {
		h += 28 * fm; // table header
	}
	h += 14; // card padding/margin
	return h;
}

function getRowHeight(fs: "small" | "medium" | "large"): number {
	return 22 * FONT_SCALE[fs];
}

function estimateBoxHeight(
	inst: ReportInstanceData,
	pkg: ReportPkgDetailsSettings,
	fs: "small" | "medium" | "large",
	display: ReportDisplaySettings,
): number {
	const fm = FONT_SCALE[fs];
	let h = 70 * fm; // box header + meta rows
	if (pkg.show_dimensions || pkg.show_weights) h += 22 * fm;
	if (pkg.show_items && inst.pkd_items.length > 0) {
		if (pkg.items_detail_level === "summary") {
			h += 20 * fm;
		} else {
			h += 28 * fm; // table header
			h += inst.pkd_items.length * 17 * fm; // rows
		}
	}
	h += 14; // card padding/margin
	if (display.include_signatures && display.signatures_scope === "box") {
		h += 45 * fm;
	}
	return h;
}

export function paginateInstances(
	instances: ReportInstanceData[],
	display: ReportDisplaySettings,
	pkg: ReportPkgDetailsSettings,
	splitBy: "none" | "destination" | "order",
): Array<{ label?: string; items: ReportInstanceData[] }> {
	if (!instances.length) return [{ items: [] }];

	const isHeaderHidden = display.header_show_mode === "first_page_only";
	const maxH = isHeaderHidden
		? PAGE_USABLE_H[display.orientation] + 140
		: PAGE_USABLE_H[display.orientation];
	const fs = display.font_size;

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
					const baseH = getBoxBaseHeight(pkg, fs, !isFirstPageForBox);
					const rowH = getRowHeight(fs);
					const availH = maxH - currentH;

					if (availH < baseH + rowH) {
						// Not enough space for header + at least 1 item
						if (current.length > 0) {
							pages.push({ label: group.label, items: current });
							current = [];
							currentH = 0;
						}
					}

					const usableH = maxH - currentH;
					const headerH = getBoxBaseHeight(pkg, fs, !isFirstPageForBox);
					const sigH =
						display.include_signatures && display.signatures_scope === "box"
							? 45 * FONT_SCALE[fs]
							: 0;

					// Check if all remaining items fit, including signatures if complete
					const totalRemainingH = headerH + itemsRemaining.length * rowH + sigH;
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
					const itemsToFit = Math.min(
						Math.floor((usableH - headerH) / rowH),
						itemsRemaining.length - 1,
					);

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
							currentH += headerH + rowH + actualSigH;
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
					currentH += headerH + slice.length * rowH; // has_more is guaranteed true, so no sigH added
					isFirstPageForBox = false;
					lineOffset += slice.length;
				}
			} else {
				// Summary or no items
				const boxH = estimateBoxHeight(inst, pkg, fs, display);
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
