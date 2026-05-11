import type React from "react";
import {
	useCompanyProfileQuery,
	useReportInstancesQuery,
} from "../hooks/useReportBuilderQueries";
import type {
	ReportDisplaySettings,
	ReportPkgDetailsSettings,
} from "../settings-defaults";
import type { FilterParams } from "../types";

interface LivePreviewPanelProps {
	filters: FilterParams;
	displaySettings: ReportDisplaySettings;
	pkgSettings: ReportPkgDetailsSettings;
	headerData: any;
}

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({
	filters,
	displaySettings,
	pkgSettings,
	headerData,
}) => {
	const { data: instances, isLoading } = useReportInstancesQuery(filters);
	const { data: companyProfile } = useCompanyProfileQuery();

	if (isLoading) {
		return (
			<div className="p-8 text-center text-gray-500">
				Loading preview data...
			</div>
		);
	}

	const {
		theme_color,
		header_layout,
		show_company_logo,
		show_qr_codes,
		include_signatures,
		footer_text,
	} = displaySettings;
	const { show_dimensions, show_weights, show_items, items_detail_level } =
		pkgSettings;

	return (
		<div
			className="flex flex-col h-full bg-white text-black font-sans text-sm p-8"
			style={{ color: "#333" }}
		>
			{/* Header */}
			<header
				className={`flex ${header_layout === "compact" ? "items-center justify-between" : "flex-col gap-4"} mb-8 border-b-2 pb-4`}
				style={{ borderColor: theme_color }}
			>
				{show_company_logo && companyProfile?.logo_url && (
					<img
						src={companyProfile.logo_url}
						alt="Company Logo"
						className="h-16 object-contain"
					/>
				)}
				<div
					className={`flex flex-col ${header_layout === "compact" ? "text-right" : "text-center"}`}
				>
					<h1
						className="text-2xl font-bold uppercase tracking-wider"
						style={{ color: theme_color }}
					>
						{headerData.reportName || "Client Report"}
					</h1>
					<div className="flex flex-col text-xs text-gray-600 mt-2">
						{headerData.reportNumber && (
							<span>Report No: {headerData.reportNumber}</span>
						)}
						{headerData.reportDate && (
							<span>Date: {headerData.reportDate}</span>
						)}
						{headerData.projectReference && (
							<span>Project Ref: {headerData.projectReference}</span>
						)}
						{headerData.finalDestinationCountry && (
							<span>Destination: {headerData.finalDestinationCountry}</span>
						)}
					</div>
				</div>
			</header>

			{/* Body / Instances List */}
			<main className="flex-1">
				{!instances || instances.length === 0 ? (
					<div className="text-center text-gray-400 my-10 italic">
						No packages match the current filters.
					</div>
				) : (
					<div className="flex flex-col gap-6">
						{instances.map((inst) => (
							<div
								key={inst.id}
								className="border border-gray-200 rounded p-4 flex flex-col gap-2 page-break-inside-avoid"
							>
								<div className="flex justify-between items-start border-b border-gray-100 pb-2 mb-2">
									<div>
										<h3
											className="font-semibold text-lg"
											style={{ color: theme_color }}
										>
											Package {inst.order_package?.package_number || "?"} (Inst:{" "}
											{inst.instance_number})
										</h3>
										<div className="text-xs text-gray-500">
											Ref: {inst.order_package?.reference || "N/A"} | IPAC Ref:{" "}
											{inst.ipac_reference || "N/A"}
										</div>
									</div>
									{show_qr_codes && (
										<div className="w-16 h-16 bg-gray-100 border border-gray-300 flex items-center justify-center text-[8px] text-center text-gray-400">
											QR Code
											<br />
											[Placeholder]
										</div>
									)}
								</div>

								<div className="grid grid-cols-2 gap-4 text-xs">
									<div>
										<strong>Destination:</strong> {inst.destination || "N/A"}
									</div>
									<div>
										<strong>Status:</strong>{" "}
										<span className="capitalize">{inst.status}</span>
									</div>
									<div>
										<strong>Packed Date:</strong>{" "}
										{inst.packed_at
											? new Date(inst.packed_at).toLocaleDateString()
											: "N/A"}
									</div>
								</div>

								{/* Conditional Package Details */}
								{(show_dimensions || show_weights) && (
									<div className="bg-gray-50 p-2 rounded text-xs grid grid-cols-2 mt-2">
										{show_dimensions && (
											<div>
												<strong>Dimensions:</strong> (H x W x L) cm
											</div>
										)}
										{show_weights && (
											<div>
												<strong>Weight:</strong> 0 kg
											</div>
										)}
									</div>
								)}

								{show_items && (
									<div className="mt-2">
										<h4 className="text-xs font-semibold mb-1">Box Contents</h4>
										{items_detail_level === "summary" ? (
											<div className="text-xs text-gray-600 italic">
												Total Items: [Qty]
											</div>
										) : (
											<ul className="text-xs text-gray-600 list-disc list-inside">
												<li>Item 1 (Qty: 2)</li>
												<li>Item 2 (Qty: 5)</li>
											</ul>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</main>

			{/* Footer */}
			<footer className="mt-8 pt-4 border-t border-gray-200 flex flex-col gap-6 text-xs text-gray-500">
				{include_signatures && (
					<div className="flex justify-between mt-4">
						<div className="flex flex-col items-center gap-1 w-1/3">
							<div className="border-b border-gray-400 w-full h-12 mb-1"></div>
							<span>Prepared By</span>
						</div>
						<div className="flex flex-col items-center gap-1 w-1/3">
							<div className="border-b border-gray-400 w-full h-12 mb-1"></div>
							<span>Checked By</span>
						</div>
					</div>
				)}

				{footer_text && (
					<div className="text-center italic mt-2">{footer_text}</div>
				)}
				<div className="text-center mt-2">Page 1 of 1</div>
			</footer>
		</div>
	);
};
