import type React from "react";

interface HeaderDataPanelProps {
	data: {
		reportName: string;
		reportNumber: string;
		reportDate: string;
		projectReference: string;
		finalDestinationCountry: string;
		transportModes: string[];
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
					<label
						htmlFor="reportName"
						className="text-xs font-medium text-gray-600"
					>
						Report Name *
					</label>
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
					<label
						htmlFor="reportNumber"
						className="text-xs font-medium text-gray-600"
					>
						Report Number
					</label>
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
					<label
						htmlFor="reportDate"
						className="text-xs font-medium text-gray-600"
					>
						Report Date
					</label>
					<input
						id="reportDate"
						type="date"
						className="border rounded-md p-2 text-sm w-full"
						value={data.reportDate}
						onChange={(e) => handleChange("reportDate", e.target.value)}
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label
						htmlFor="projectReference"
						className="text-xs font-medium text-gray-600"
					>
						Project Reference
					</label>
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
					<label
						htmlFor="finalDestinationCountry"
						className="text-xs font-medium text-gray-600"
					>
						Final Destination Country
					</label>
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
			</div>

			{/* ─── Client Info ─────────────────────────────── */}
			<div className="space-y-4">
				<h3 className="text-sm font-bold text-gray-800 border-b pb-1 flex justify-between items-center">
					Client Info
					<button
						type="button"
						className="text-xs text-blue-600 hover:underline font-normal"
					>
						Save to DB
					</button>
				</h3>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="clientName"
						className="text-xs font-medium text-gray-600"
					>
						Name
					</label>
					<input
						id="clientName"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.name || ""}
						onChange={(e) => handleClientChange("name", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="clientTrn"
						className="text-xs font-medium text-gray-600"
					>
						TRN
					</label>
					<input
						id="clientTrn"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.trn || ""}
						onChange={(e) => handleClientChange("trn", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="clientAddr1"
						className="text-xs font-medium text-gray-600"
					>
						Address Line 1
					</label>
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
					<label
						htmlFor="clientCity"
						className="text-xs font-medium text-gray-600"
					>
						City
					</label>
					<input
						id="clientCity"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.city || ""}
						onChange={(e) => handleClientChange("city", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="clientCountry"
						className="text-xs font-medium text-gray-600"
					>
						Country
					</label>
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
					<label
						htmlFor="custOrderRef"
						className="text-xs font-medium text-gray-600"
					>
						Customer Order #
					</label>
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
					<label
						htmlFor="quotationRef"
						className="text-xs font-medium text-gray-600"
					>
						Quotation Reference
					</label>
					<input
						id="quotationRef"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientOrderData?.quotation_ref || ""}
						onChange={(e) => handleOrderChange("quotation_ref", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="custTrn"
						className="text-xs font-medium text-gray-600"
					>
						Customer TRN
					</label>
					<input
						id="custTrn"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientOrderData?.customer_trn || ""}
						onChange={(e) => handleOrderChange("customer_trn", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="valsemTrn"
						className="text-xs font-medium text-gray-600"
					>
						IPAC-Valsem TRN
					</label>
					<input
						id="valsemTrn"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientOrderData?.ipac_valsem_trn || ""}
						onChange={(e) =>
							handleOrderChange("ipac_valsem_trn", e.target.value)
						}
					/>
				</div>
			</div>

			{/* ─── Client Shipment Info ───────────────────────── */}
			<div className="space-y-4">
				<h3 className="text-sm font-bold text-gray-800 border-b pb-1">
					Shipment Details
				</h3>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="consignee"
						className="text-xs font-medium text-gray-600"
					>
						Consignee
					</label>
					<input
						id="consignee"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.consignee || ""}
						onChange={(e) => handleShipmentChange("consignee", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="shippingDate"
						className="text-xs font-medium text-gray-600"
					>
						Shipping Date
					</label>
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
					<label
						htmlFor="shipCity"
						className="text-xs font-medium text-gray-600"
					>
						City
					</label>
					<input
						id="shipCity"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.city || ""}
						onChange={(e) => handleShipmentChange("city", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="shipCountry"
						className="text-xs font-medium text-gray-600"
					>
						Country
					</label>
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
				<h3 className="text-sm font-bold text-gray-800 border-b pb-1">
					Company Info (Our Info)
				</h3>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="compName"
						className="text-xs font-medium text-gray-600"
					>
						Name
					</label>
					<input
						id="compName"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={companyData?.name || ""}
						onChange={(e) => handleCompanyChange("name", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="compTel"
						className="text-xs font-medium text-gray-600"
					>
						Tel
					</label>
					<input
						id="compTel"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={companyData?.tel || ""}
						onChange={(e) => handleCompanyChange("tel", e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="compWebsite"
						className="text-xs font-medium text-gray-600"
					>
						Website
					</label>
					<input
						id="compWebsite"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={companyData?.website || ""}
						onChange={(e) => handleCompanyChange("website", e.target.value)}
					/>
				</div>
			</div>
		</div>
	);
};
