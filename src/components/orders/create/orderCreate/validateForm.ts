interface ValidateParams {
	orderName: string;
	clientMode: "existing" | "new";
	selectedClientId: string;
	newClientName: string;
	excelFile: File | null;
	packageCount: number;
}

export const validateOrderCreateForm = ({
	orderName,
	clientMode,
	selectedClientId,
	newClientName,
	excelFile,
	packageCount,
}: ValidateParams) => {
	const errors: Record<string, string> = {};
	if (!orderName.trim()) errors.orderName = "Order name is required";
	if (clientMode === "existing" && !selectedClientId) {
		errors.client = "Select an existing client";
	}
	if (clientMode === "new" && !newClientName.trim()) {
		errors.client = "Client name is required";
	}
	if (!excelFile) errors.file = "Excel file is required";
	if (excelFile && packageCount === 0) {
		errors.file = "No package rows detected. Check column B starting at row 4.";
	}
	return errors;
};
