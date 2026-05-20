import React from "react";

interface HeaderDataPanelProps {
	data: {
		reportName: string;
		reportNumber: string;
		reportDate: string;
		projectReference: string;
		finalDestinationCountry: string;
		transportModes: string[];
		showReportName?: boolean;
		showReportNumber?: boolean;
		showReportDate?: boolean;
		showProjectReference?: boolean;
		showFinalDestinationCountry?: boolean;
		nw?: string;
		gw?: string;
		totalVolume?: string;
		deliveryNoteRef?: string;
		deliveryDate?: string;
	};
	setData: React.Dispatch<React.SetStateAction<any>>;
	clientData: any;
	setClientData: React.Dispatch<React.SetStateAction<any>>;
	clientOrderData: any;
	setClientOrderData: React.Dispatch<React.SetStateAction<any>>;
	clientShipmentData: any;
	setClientShipmentData: React.Dispatch<React.SetStateAction<any>>;
	companyData: any;
	setCompanyData: React.Dispatch<React.SetStateAction<any>>;
	onSaveCompanyProfile: () => Promise<void>;
	onSaveClientDetails?: () => Promise<void>;
	isTemplateMode: boolean;
	setIsTemplateMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export const HeaderDataPanel: React.FC<HeaderDataPanelProps> = ({
	data,
	setData,
	clientData,
	setClientData,
	clientOrderData,
	setClientOrderData,
	clientShipmentData,
	setClientShipmentData,
	companyData,
	setCompanyData,
	onSaveCompanyProfile,
	onSaveClientDetails,
	isTemplateMode,
	setIsTemplateMode,
}) => {
	const handleChange = (key: string, value: any) => {
		setData((prev: any) => ({ ...prev, [key]: value }));
	};

	const handleClientChange = (key: string, value: any) => {
		setClientData((prev: any) => ({ ...prev, [key]: value }));
	};

	const handleOrderChange = (key: string, value: any) => {
		setClientOrderData((prev: any) => ({ ...prev, [key]: value }));
	};

	const handleShipmentChange = (key: string, value: any) => {
		setClientShipmentData((prev: any) => ({ ...prev, [key]: value }));
	};

	const handleCompanyChange = (key: string, value: any) => {
		setCompanyData((prev: any) => ({ ...prev, [key]: value }));
	};

	const [saving, setSaving] = React.useState(false);
	const [saved, setSaved] = React.useState(false);
	const handleSaveCompany = async () => {
		setSaving(true);
		setSaved(false);
		try {
			await onSaveCompanyProfile();
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} finally {
			setSaving(false);
		}
	};

	const [clientSaving, setClientSaving] = React.useState(false);
	const [clientSaved, setClientSaved] = React.useState(false);
	const handleSaveClient = async () => {
		if (!onSaveClientDetails) return;
		setClientSaving(true);
		setClientSaved(false);
		try {
			await onSaveClientDetails();
			setClientSaved(true);
			setTimeout(() => setClientSaved(false), 2000);
		} finally {
			setClientSaving(false);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			{/* ─── Mode Toggle ─────────────────────────────── */}
			<div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
				<span className="text-sm font-medium text-gray-700">Mode:</span>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setIsTemplateMode(false)}
						className={`px-3 py-1 text-xs font-semibold rounded ${
							!isTemplateMode
								? "bg-blue-600 text-white"
								: "bg-white text-gray-700 border"
						}`}
					>
						Report
					</button>
					<button
						type="button"
						onClick={() => setIsTemplateMode(true)}
						className={`px-3 py-1 text-xs font-semibold rounded ${
							isTemplateMode
								? "bg-purple-600 text-white"
								: "bg-white text-gray-700 border"
						}`}
					>
						Template
					</button>
				</div>
			</div>

			{isTemplateMode && (
				<div className="text-xs text-purple-600 font-semibold text-center -mt-4">
					You are currently editing a Template.
				</div>
			)}

			{/* ─── Basic Report Info ─────────────────────────── */}
			<div className="space-y-4">
				<h3 className="text-sm font-bold text-gray-800 border-b pb-1">
					Basic Info
				</h3>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="reportName"
							className="text-xs font-medium text-gray-600"
						>
							Report Name *
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={data.showReportName !== false}
								onChange={(e) =>
									handleChange("showReportName", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="reportName"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						placeholder="e.g. Packing List"
						value={data.reportName}
						onChange={(e) => handleChange("reportName", e.target.value)}
						required
					/>
				</div>

				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="reportNumber"
							className="text-xs font-medium text-gray-600"
						>
							Report Number
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={data.showReportNumber !== false}
								onChange={(e) =>
									handleChange("showReportNumber", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="reportNumber"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						placeholder="Auto-generated if left blank"
						value={data.reportNumber}
						onChange={(e) => handleChange("reportNumber", e.target.value)}
					/>
				</div>

				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="reportDate"
							className="text-xs font-medium text-gray-600"
						>
							Report Date
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={data.showReportDate !== false}
								onChange={(e) =>
									handleChange("showReportDate", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="reportDate"
						type="date"
						className="border rounded-md p-2 text-sm w-full"
						value={data.reportDate}
						onChange={(e) => handleChange("reportDate", e.target.value)}
					/>
				</div>

				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="projectReference"
							className="text-xs font-medium text-gray-600"
						>
							Project Reference
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={data.showProjectReference !== false}
								onChange={(e) =>
									handleChange("showProjectReference", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="projectReference"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						placeholder="e.g. PRJ-2026-001"
						value={data.projectReference}
						onChange={(e) => handleChange("projectReference", e.target.value)}
					/>
				</div>

				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="finalDestinationCountry"
							className="text-xs font-medium text-gray-600"
						>
							Final Destination Country
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={data.showFinalDestinationCountry !== false}
								onChange={(e) =>
									handleChange("showFinalDestinationCountry", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="finalDestinationCountry"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						placeholder="e.g. Saudi Arabia"
						value={data.finalDestinationCountry}
						onChange={(e) =>
							handleChange("finalDestinationCountry", e.target.value)
						}
					/>
				</div>

				{/* ─── Summary Totals ─── */}
				<div className="flex gap-2">
					<div className="flex flex-col gap-1 flex-1">
						<label className="text-xs font-medium text-gray-600">
							Net Weight (Kg)
						</label>
						<input
							type="number"
							className="border rounded-md p-2 text-sm w-full"
							value={data.nw || ""}
							onChange={(e) => handleChange("nw", e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1 flex-1">
						<label className="text-xs font-medium text-gray-600">
							Gross Weight (Kg)
						</label>
						<input
							type="number"
							className="border rounded-md p-2 text-sm w-full"
							value={data.gw || ""}
							onChange={(e) => handleChange("gw", e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1 flex-1">
						<label className="text-xs font-medium text-gray-600">
							Volume (m³)
						</label>
						<input
							type="number"
							className="border rounded-md p-2 text-sm w-full"
							step="0.001"
							value={data.totalVolume || ""}
							onChange={(e) => handleChange("totalVolume", e.target.value)}
						/>
					</div>
				</div>
			</div>

			{/* ─── Client Info ─────────────────────────────── */}
			<div className="space-y-4">
				<h3 className="text-sm font-bold text-gray-800 border-b pb-1 flex justify-between items-center">
					Client Info
					<button
						type="button"
						onClick={handleSaveClient}
						disabled={clientSaving || !onSaveClientDetails}
						className="text-xs font-normal text-blue-600 hover:underline disabled:opacity-50"
					>
						{clientSaving ? "Saving…" : clientSaved ? "✓ Saved" : "Save to DB"}
					</button>
				</h3>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="clientName"
							className="text-xs font-medium text-gray-600"
						>
							Name
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={clientData?.showName !== false}
								onChange={(e) =>
									handleClientChange("showName", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="clientName"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.name || ""}
						onChange={(e) => handleClientChange("name", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="clientTrn"
							className="text-xs font-medium text-gray-600"
						>
							TRN
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={clientData?.showTrn !== false}
								onChange={(e) =>
									handleClientChange("showTrn", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="clientTrn"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.trn || ""}
						onChange={(e) => handleClientChange("trn", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="clientAddr1"
							className="text-xs font-medium text-gray-600"
						>
							Address Line 1
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={clientData?.showAddressLine1 !== false}
								onChange={(e) =>
									handleClientChange("showAddressLine1", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="clientAddr1"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.address_line_1 || ""}
						onChange={(e) =>
							handleClientChange("address_line_1", e.target.value)
						}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">
						Address Line 2
					</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.address_line_2 || ""}
						onChange={(e) =>
							handleClientChange("address_line_2", e.target.value)
						}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">
						Address Line 3
					</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.address_line_3 || ""}
						onChange={(e) =>
							handleClientChange("address_line_3", e.target.value)
						}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Post Code</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.post_code || ""}
						onChange={(e) => handleClientChange("post_code", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">
						Contact Person
					</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.contact_person || ""}
						onChange={(e) =>
							handleClientChange("contact_person", e.target.value)
						}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Phone</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.phone || ""}
						onChange={(e) => handleClientChange("phone", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Email</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.email || ""}
						onChange={(e) => handleClientChange("email", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="clientCity"
							className="text-xs font-medium text-gray-600"
						>
							City
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={clientData?.showCity !== false}
								onChange={(e) =>
									handleClientChange("showCity", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="clientCity"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.city || ""}
						onChange={(e) => handleClientChange("city", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="clientCountry"
							className="text-xs font-medium text-gray-600"
						>
							Country
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={clientData?.showCountry !== false}
								onChange={(e) =>
									handleClientChange("showCountry", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="clientCountry"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.country || ""}
						onChange={(e) => handleClientChange("country", e.target.value)}
					/>
				</div>
			</div>

			{/* ─── Client Order Info ─────────────────────────── */}
			<div className="space-y-4">
				<h3 className="text-sm font-bold text-gray-800 border-b pb-1">
					Client Order Info
				</h3>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="custOrderRef"
							className="text-xs font-medium text-gray-600"
						>
							Customer Order #
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={clientOrderData?.showCustomerOrderRef !== false}
								onChange={(e) =>
									handleOrderChange("showCustomerOrderRef", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="custOrderRef"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientOrderData?.customer_order_ref || ""}
						onChange={(e) =>
							handleOrderChange("customer_order_ref", e.target.value)
						}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="quotationRef"
							className="text-xs font-medium text-gray-600"
						>
							Quotation Reference
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={clientOrderData?.showQuotationRef !== false}
								onChange={(e) =>
									handleOrderChange("showQuotationRef", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="quotationRef"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientOrderData?.quotation_ref || ""}
						onChange={(e) => handleOrderChange("quotation_ref", e.target.value)}
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">
						Delivery Note #
					</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={data?.deliveryNoteRef || ""}
						onChange={(e) => handleChange("deliveryNoteRef", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">
						Delivery Date
					</label>
					<input
						type="date"
						className="border rounded-md p-2 text-sm w-full"
						value={data?.deliveryDate || ""}
						onChange={(e) => handleChange("deliveryDate", e.target.value)}
					/>
				</div>
			</div>

			{/* ─── Client Shipment Info ───────────────────────── */}
			<div className="space-y-4">
				<h3 className="text-sm font-bold text-gray-800 border-b pb-1">
					Shipment Details
				</h3>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="consignee"
							className="text-xs font-medium text-gray-600"
						>
							Consignee
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={clientShipmentData?.showConsignee !== false}
								onChange={(e) =>
									handleShipmentChange("showConsignee", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="consignee"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.consignee || ""}
						onChange={(e) => handleShipmentChange("consignee", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="shippingDate"
							className="text-xs font-medium text-gray-600"
						>
							Shipping Date
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={clientShipmentData?.showShippingDate !== false}
								onChange={(e) =>
									handleShipmentChange("showShippingDate", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="shippingDate"
						type="date"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.shipping_date || ""}
						onChange={(e) =>
							handleShipmentChange("shipping_date", e.target.value)
						}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">
						Address Line 1
					</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.address_1 || ""}
						onChange={(e) => handleShipmentChange("address_1", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">
						Address Line 2
					</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.address_2 || ""}
						onChange={(e) => handleShipmentChange("address_2", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">
						Address Line 3
					</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.address_3 || ""}
						onChange={(e) => handleShipmentChange("address_3", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Post Code</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.post_code || ""}
						onChange={(e) => handleShipmentChange("post_code", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">
						Contact Person
					</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.contact || ""}
						onChange={(e) => handleShipmentChange("contact", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Phone</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.phone || ""}
						onChange={(e) => handleShipmentChange("phone", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Email</label>
					<input
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.email || ""}
						onChange={(e) => handleShipmentChange("email", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="shipCity"
							className="text-xs font-medium text-gray-600"
						>
							City
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={clientShipmentData?.showCity !== false}
								onChange={(e) =>
									handleShipmentChange("showCity", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="shipCity"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.city || ""}
						onChange={(e) => handleShipmentChange("city", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="shipCountry"
							className="text-xs font-medium text-gray-600"
						>
							Country
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={clientShipmentData?.showCountry !== false}
								onChange={(e) =>
									handleShipmentChange("showCountry", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="shipCountry"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.country || ""}
						onChange={(e) => handleShipmentChange("country", e.target.value)}
					/>
				</div>
			</div>

			{/* ─── Company Info ─────────────────────────────── */}
			<div className="space-y-4">
				<h3 className="text-sm font-bold text-gray-800 border-b pb-1 flex justify-between items-center">
					Company Info (Our Info)
					<button
						type="button"
						onClick={handleSaveCompany}
						disabled={saving}
						className="text-xs font-normal text-blue-600 hover:underline disabled:opacity-50"
					>
						{saving ? "Saving…" : saved ? "✓ Saved" : "Save to DB"}
					</button>
				</h3>

				{/* Logo upload */}
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="compLogo"
							className="text-xs font-medium text-gray-600"
						>
							Logo
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={companyData?.showLogo !== false}
								onChange={(e) =>
									handleCompanyChange("showLogo", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					{companyData?.logoUrl && (
						<div className="flex items-center gap-2 mb-1">
							<img
								src={companyData.logoUrl}
								alt="Company logo preview"
								className="h-10 object-contain border rounded"
							/>
							<button
								type="button"
								className="text-xs text-red-500 hover:underline"
								onClick={() => handleCompanyChange("logoUrl", null)}
							>
								Remove
							</button>
						</div>
					)}
					<input
						id="compLogo"
						type="file"
						accept="image/*"
						className="border rounded-md p-1.5 text-xs w-full"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (!file) return;
							const reader = new FileReader();
							reader.onload = () =>
								handleCompanyChange("logoUrl", reader.result as string);
							reader.readAsDataURL(file);
						}}
					/>
				</div>

				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="compName"
							className="text-xs font-medium text-gray-600"
						>
							Name
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={companyData?.showName !== false}
								onChange={(e) =>
									handleCompanyChange("showName", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="compName"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={companyData?.name || ""}
						onChange={(e) => handleCompanyChange("name", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="compTel"
							className="text-xs font-medium text-gray-600"
						>
							Tel
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={companyData?.showTel !== false}
								onChange={(e) =>
									handleCompanyChange("showTel", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="compTel"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={companyData?.tel || ""}
						onChange={(e) => handleCompanyChange("tel", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="compPoBox"
							className="text-xs font-medium text-gray-600"
						>
							PO Box
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={companyData?.showPoBox !== false}
								onChange={(e) =>
									handleCompanyChange("showPoBox", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="compPoBox"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						placeholder="e.g. 44291"
						value={companyData?.poBox || ""}
						onChange={(e) => handleCompanyChange("poBox", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="compStreet"
							className="text-xs font-medium text-gray-600"
						>
							Street
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={companyData?.showStreet !== false}
								onChange={(e) =>
									handleCompanyChange("showStreet", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="compStreet"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						placeholder="e.g. Ar Rasin - 2nd Street"
						value={companyData?.street || ""}
						onChange={(e) => handleCompanyChange("street", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="compArea"
							className="text-xs font-medium text-gray-600"
						>
							Area / District
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={companyData?.showArea !== false}
								onChange={(e) =>
									handleCompanyChange("showArea", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="compArea"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						placeholder="e.g. Mussafah M4"
						value={companyData?.area || ""}
						onChange={(e) => handleCompanyChange("area", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="compCity"
							className="text-xs font-medium text-gray-600"
						>
							City
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={companyData?.showCity !== false}
								onChange={(e) =>
									handleCompanyChange("showCity", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="compCity"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						placeholder="e.g. Abu Dhabi"
						value={companyData?.city || ""}
						onChange={(e) => handleCompanyChange("city", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="compCountry"
							className="text-xs font-medium text-gray-600"
						>
							Country
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={companyData?.showCountry !== false}
								onChange={(e) =>
									handleCompanyChange("showCountry", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="compCountry"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						placeholder="e.g. UAE"
						value={companyData?.country || ""}
						onChange={(e) => handleCompanyChange("country", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="compWebsite"
							className="text-xs font-medium text-gray-600"
						>
							Website
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={companyData?.showWebsite !== false}
								onChange={(e) =>
									handleCompanyChange("showWebsite", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="compWebsite"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={companyData?.website || ""}
						onChange={(e) => handleCompanyChange("website", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label
							htmlFor="compTrn"
							className="text-xs font-medium text-gray-600"
						>
							TRN
						</label>
						<label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={companyData?.showTrn !== false}
								onChange={(e) =>
									handleCompanyChange("showTrn", e.target.checked)
								}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
							/>
							Show on report
						</label>
					</div>
					<input
						id="compTrn"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={companyData?.trn || ""}
						onChange={(e) => handleCompanyChange("trn", e.target.value)}
					/>
				</div>
			</div>
		</div>
	);
};
