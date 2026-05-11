import type {
	ReportDisplaySettings,
	ReportPkgDetailsSettings,
} from "./settings-defaults";
import type { ReportInstanceData } from "./types";

// Estimated heights in pixels at 96dpi
const FONT_SCALE = { small: 0.82, medium: 1, large: 1.18 };
const PAGE_USABLE_H = { portrait: 800, landscape: 500 }; // px usable after header/footer

function estimateBoxHeight(
	inst: ReportInstanceData,
	pkg: ReportPkgDetailsSettings,
	fs: "small" | "medium" | "large",
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
	return h;
}

export function paginateInstances(
	instances: ReportInstanceData[],
	display: ReportDisplaySettings,
	pkg: ReportPkgDetailsSettings,
	splitBy: "none" | "destination" | "order",
): Array<{ label?: string; items: ReportInstanceData[] }> {
	if (!instances.length) return [{ items: [] }];

	const maxH = PAGE_USABLE_H[display.orientation];
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
		let current: ReportInstanceData[] = [];
		let currentH = 0;
		for (const inst of group.items) {
			const boxH = estimateBoxHeight(inst, pkg, fs);
			if (currentH + boxH > maxH && current.length > 0) {
				pages.push({ label: group.label, items: current });
				current = [inst];
				currentH = boxH;
			} else {
				current.push(inst);
				currentH += boxH;
			}
		}
		if (current.length > 0) {
			pages.push({ label: group.label, items: current });
		}
	}

	return pages.length > 0 ? pages : [{ items: [] }];
}
