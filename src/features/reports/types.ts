export type FilterParams = {
	clientId: string | null;
	/** Array of selected order IDs. Empty array = all orders for the client. */
	orderIds: string[];
	dateFrom: string | null;
	dateTo: string | null;
	// 'instance_created_at' uses order_pkg_instance.created_at
	// 'item_packed_at' uses MAX(pkd_item.created_at) — the real "packed" date
	dateFilterMode: "item_packed_at" | "instance_created_at";
	tags: string[];
	destinations: string[];
	// "has_items" means the box has at least one packed item (the main use-case)
	hasItemsOnly: boolean;
	// Only show boxes marked as packed
	packedOnly: boolean;
	// Split mode for batch printing
	splitBy: "none" | "destination" | "order" | "report_per_order";
	// Sort order for the order picker list
	orderSort: "name" | "reference";
	// Filter by a specific box ID
	boxId: string | null;
	tagSortPriority: string;
	/** Destination names sorted by priority (comma-separated), used for box ordering */
	destSortPriority: string;
	sortMode?: "destination_first" | "tag_first" | "tag_combination";
};

export type ReportInstanceData = {
	id: string;
	instance_number: number;
	ipac_reference: string | null;
	destination: string | null;
	tag: string | null;
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
		maintenance_db_id?: string | null;
		quantity: number;
		item_name: string | null;
		item_num: string | null;
		photo_urls?: string[];
		length?: number | null;
		width?: number | null;
		height?: number | null;
		net_weight?: number | null;
		qr_token?: string | null;
	}>;
	is_continuation?: boolean;
	has_more?: boolean;
	line_offset?: number;
	overall_lines?: number;
	overall_qty?: number;
	internal_length?: number | null;
	internal_width?: number | null;
	internal_height?: number | null;
	external_length?: number | null;
	external_width?: number | null;
	external_height?: number | null;
	net_weight?: number | null;
	gross_weight?: number | null;
	tare?: number | null;
	box_type?: string | null;
	sei_category?: number | null;
	sei_protection?: number | null;
	qr_token?: string | null;
	package_qty?: number | null;
	order_pkg_overview_id?: string | null;
	box_photo_urls?: string[];
	original_pkg_info_id?: string | null;
	final_pkg_info_id?: string | null;
	order_package_id?: string | null;
};
