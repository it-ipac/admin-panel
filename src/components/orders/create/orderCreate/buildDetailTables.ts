import type {
	OrderCreateDetailTable,
	OrderCreateSummary,
} from "../OrderCreateConfirmDialog.tsx";

type NewClientDetails = {
	name: string;
	contact_person: string;
	email: string;
	phone: string;
	address: string;
};

interface Params {
	clientMode: "existing" | "new";
	newClient: NewClientDetails;
	orderName: string;
	summary: OrderCreateSummary;
	packageCount: number;
}

export const buildDetailTables = ({
	clientMode,
	newClient,
	orderName,
	summary,
	packageCount,
}: Params): OrderCreateDetailTable[] => {
	const tables: OrderCreateDetailTable[] = [
		{
			tableName: "orders",
			description: "Primary order record (created immediately).",
			columns: [
				{ column: "id", value: "Auto-generated", note: "UUID" },
				{ column: "order_name", value: orderName || "From Excel filename" },
				{ column: "client_id", value: summary.clientName },
				{ column: "production_status", value: "pending", note: "Default" },
				{ column: "commercial_status", value: "draft", note: "Default" },
				{ column: "created_at", value: "Auto-generated", note: "Timestamp" },
				{ column: "updated_at", value: "Auto-generated", note: "Timestamp" },
			],
		},
	];

	if (clientMode === "new") {
		tables.unshift({
			tableName: "clients",
			description: "New client record (created first).",
			columns: [
				{ column: "id", value: "Auto-generated", note: "UUID" },
				{ column: "name", value: newClient.name || "Required" },
				{ column: "contact_person", value: newClient.contact_person || "—" },
				{ column: "email", value: newClient.email || "—" },
				{ column: "phone", value: newClient.phone || "—" },
				{ column: "address", value: newClient.address || "—" },
				{ column: "created_at", value: "Auto-generated", note: "Timestamp" },
				{ column: "updated_at", value: "Auto-generated", note: "Timestamp" },
			],
		});
	}

	tables.push({
		tableName: "order_packages",
		description: "Packages created from the Calculation sheet (row 4 onward).",
		columns: [
			{
				column: "package_number",
				value: `1 → ${Math.max(packageCount, 1)}`,
				note: `${packageCount} package(s)`,
			},
			{ column: "status", value: "design", note: "Default" },
			{ column: "order_id", value: "New order id", note: "FK to orders" },
		],
	});

	return tables;
};
