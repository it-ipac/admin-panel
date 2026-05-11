export type FilterParams = {
	clientId: string | null;
	orderId: string | null;
	dateFrom: string | null;
	dateTo: string | null;
	dateFilterMode: "packed_at" | "created_at"; // Default packed_at
	tags: string[];
	destinations: string[];
	statuses: string[];
};

export type ReportInstanceData = {
	id: string;
	instance_number: number;
	ipac_reference: string | null;
	destination: string | null;
	status: string;
	packed_at: string | null;
	order_pkg_overview_id: string;
	order_package_id: string;
	// relations
	order_pkg_overview: {
		order_id: string;
		description: string | null;
	};
	order_package: {
		package_number: number;
		reference: string | null;
	};
};
