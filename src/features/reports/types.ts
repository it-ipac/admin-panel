export type FilterParams = {
	clientId: string | null;
	orderId: string | null;
	dateFrom: string | null;
	dateTo: string | null;
	// 'instance_created_at' uses order_pkg_instance.created_at
	// 'item_packed_at' uses MAX(pkd_item.created_at) — the real "packed" date
	dateFilterMode: "item_packed_at" | "instance_created_at";
	tags: string[];
	destinations: string[];
	// "has_items" means the box has at least one packed item (the main use-case)
	hasItemsOnly: boolean;
	// Split mode for batch printing
	splitBy: "none" | "destination" | "order";
};

export type ReportInstanceData = {
	id: string;
	instance_number: number;
	ipac_reference: string | null;
	destination: string | null;
	status: string;
	created_at: string;
	last_packed_at: string | null; // derived: MAX(pkd_item.created_at)
	item_count: number;
	order_id: string;
	order_name: string;
	order_reference: string | null;
	package_number: number;
	package_reference: string | null;
	pkd_items: Array<{
		id: string;
		quantity: number;
		item_name: string | null;
		item_num: string | null;
	}>;
	is_continuation?: boolean;
	has_more?: boolean;
	line_offset?: number;
	overall_lines?: number;
	overall_qty?: number;
};
