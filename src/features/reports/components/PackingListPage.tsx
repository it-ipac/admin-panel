import React from "react";
import { getSignatureUrl, type SignatureRow } from "../hooks/useSignatures";
import type {
	ReportDisplaySettings,
	ReportPkgDetailsSettings,
} from "../settings-defaults";
import type { ReportInstanceData } from "../types";

interface PackingListPageProps {
	items: ReportInstanceData[];
	allInstances?: ReportInstanceData[];
	pageIndex: number;
	totalPages: number;
	groupLabel?: string;
	isFirstPageOfGroup?: boolean;
	display: ReportDisplaySettings;
	pkg: ReportPkgDetailsSettings;
	headerData: any;
	clientData: any;
	clientOrderData: any;
	clientShipmentData: any;
	companyData: any;
	companyProfile: any;
	signatures?: SignatureRow[];
	hiddenMediaUrls?: string[];
}

function renderFormattedText(
	text: string | null | undefined,
	enableFormatting: boolean,
): React.ReactNode {
	if (!text) return "";
	if (!enableFormatting) return text;

	// Temp replace escaped sequences with non-characters to prevent split
	const prepText = text.replace(/\\\^/g, "\u0001").replace(/\\~/g, "\u0002");

	const regex =
		/(<sup[^>]*>.*?<\/sup>|<sub[^>]*>.*?<\/sub>|\^[^^]+\^|~[^~]+~)/gi;
	const parts = prepText.split(regex);

	const restoreEscapes = (str: string) => {
		return str.replace(/\u0001/g, "^").replace(/\u0002/g, "~");
	};

	return parts.map((part, i) => {
		const lowerPart = part.toLowerCase();
		if (lowerPart.startsWith("<sup>") && lowerPart.endsWith("</sup>")) {
			const content = part.slice(5, -6);
			return <sup key={i}>{restoreEscapes(content)}</sup>;
		}
		if (lowerPart.startsWith("<sub") && lowerPart.endsWith("</sub>")) {
			const content = part.slice(5, -6);
			return <sub key={i}>{restoreEscapes(content)}</sub>;
		}
		if (part.startsWith("^") && part.endsWith("^")) {
			const content = part.slice(1, -1);
			return <sup key={i}>{restoreEscapes(content)}</sup>;
		}
		if (part.startsWith("~") && part.endsWith("~")) {
			const content = part.slice(1, -1);
			return <sub key={i}>{restoreEscapes(content)}</sub>;
		}
		return restoreEscapes(part);
	});
}

const FONT_SIZE_MAP = { small: "10px", medium: "12px", large: "14px" };
const HEADER_FONT_MAP = { small: "18px", medium: "22px", large: "26px" };

export const PackingListPage = React.forwardRef<
	HTMLDivElement,
	PackingListPageProps
>(
	(
		{
			items,
			allInstances = [],
			pageIndex,
			totalPages,
			groupLabel,
			isFirstPageOfGroup,
			display,
			pkg,
			headerData,
			clientData,
			clientOrderData,
			clientShipmentData,
			companyData,
			companyProfile,
			signatures = [],
			hiddenMediaUrls = [],
		},
		ref,
	) => {
		const baseFontSize = display.font_size_px
			? `${display.font_size_px}px`
			: FONT_SIZE_MAP[display.font_size];
		const tc = display.theme_color;
		const ac = display.accent_color;
		const isLandscape = display.orientation === "landscape";

		const origin =
			typeof window !== "undefined" && window.location.origin
				? window.location.origin
				: "https://ipac-admin.vercel.app";

		const getCompanyField = (
			key: string,
			rawKey: string,
			defaultValue = "",
		) => {
			const showKey = `show${key.charAt(0).toUpperCase()}${key.slice(1)}`;
			const showRawKey = `show_${rawKey}`;

			const show = companyData
				? companyData[showKey] !== false
				: companyProfile
					? companyProfile[showRawKey] !== false
					: true;

			if (!show) return null;

			return companyData?.[key] ?? companyProfile?.[rawKey] ?? defaultValue;
		};

		const nameVal = getCompanyField(
			"name",
			"name",
			"IPAC Valsem International",
		);
		const telVal = getCompanyField("tel", "phone");
		const poBoxVal = getCompanyField("poBox", "po_box");
		const streetVal = getCompanyField("street", "address_line_1");
		const areaVal = getCompanyField("area", "address_line_2");
		const cityVal = getCompanyField("city", "city");
		const countryVal = getCompanyField("country", "country");
		const websiteVal = getCompanyField("website", "website");

		const showLogo = companyData
			? companyData.showLogo !== false
			: companyProfile
				? companyProfile.show_logo !== false
				: true;

		const sortedItems = (pkdItems: ReportInstanceData["pkd_items"]) => {
			if (pkg.items_sort === "description") {
				return [...pkdItems].sort((a, b) =>
					(a.item_name || "").localeCompare(b.item_name || ""),
				);
			}
			return [...pkdItems].sort((a, b) =>
				(a.item_num || "").localeCompare(b.item_num || ""),
			);
		};

		const totalBoxItems = items.reduce((s, i) => s + i.item_count, 0);

		if (isFirstPageOfGroup) {
			return (
				<div
					ref={ref}
					style={{
						fontFamily: "'Segoe UI', 'Inter', sans-serif",
						fontSize: baseFontSize,
						color: "#1a1a2e",
						display: "flex",
						flexDirection: "column",
						width: "100%",
						height: "100%",
						overflow: "hidden",
						background: "white",
						paddingTop: `${display.header_top_margin ?? 20}mm`,
						paddingLeft: "40px",
						paddingRight: "40px",
						paddingBottom: "40px",
					}}
				>
					{/* Header */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							borderBottom: `2px solid ${tc}`,
							paddingBottom: "20px",
							marginBottom: "40px",
						}}
					>
						<div>
							{display.show_company_logo &&
								showLogo &&
								(companyData?.logoUrl || companyProfile?.logo_url) && (
									<img
										src={companyData?.logoUrl || companyProfile.logo_url}
										alt="Logo"
										style={{
											height: nameVal
												? `${display.logo_size ?? 90}px`
												: `${(display.logo_size ?? 90) * 1.5}px`,
											objectFit: "contain",
										}}
									/>
								)}
							{nameVal && (
								<div
									style={{
										fontSize: "14px",
										fontWeight: "bold",
										color: tc,
										marginTop: "5px",
									}}
								>
									{renderFormattedText(nameVal, display.enable_formatting)}
								</div>
							)}
						</div>
						<div
							style={{ textAlign: "right", fontSize: "11px", color: "#666" }}
						>
							{telVal && (
								<div>
									Tel: {renderFormattedText(telVal, display.enable_formatting)}
								</div>
							)}
							{poBoxVal && (
								<div>
									PO Box:{" "}
									{renderFormattedText(poBoxVal, display.enable_formatting)}
								</div>
							)}
							{(streetVal || areaVal) && (
								<div>
									{streetVal &&
										renderFormattedText(streetVal, display.enable_formatting)}
									{streetVal && areaVal && ", "}
									{areaVal &&
										renderFormattedText(areaVal, display.enable_formatting)}
								</div>
							)}
							{(cityVal || countryVal) && (
								<div>
									{cityVal &&
										renderFormattedText(cityVal, display.enable_formatting)}
									{cityVal && countryVal && ", "}
									{countryVal &&
										renderFormattedText(countryVal, display.enable_formatting)}
								</div>
							)}
							{websiteVal && (
								<div>
									{renderFormattedText(websiteVal, display.enable_formatting)}
								</div>
							)}
						</div>
					</div>

					{/* Title */}
					{(headerData.showReportName !== false ||
						(clientOrderData?.showCustomerOrderRef !== false &&
							clientOrderData?.customer_order_ref &&
							clientOrderData.customer_order_ref !== "N/A") ||
						(headerData.showReportNumber !== false &&
							headerData.reportNumber)) && (
						<div style={{ textAlign: "center", marginBottom: "40px" }}>
							{headerData.showReportName !== false && (
								<div
									style={{
										fontSize: display.font_size_px
											? `${Math.round(display.font_size_px * 2.33)}px`
											: "28px",
										fontWeight: "bold",
										color: tc,
										letterSpacing: "2px",
										textTransform: "uppercase",
									}}
								>
									{headerData.reportName ||
										clientOrderData?.order_name ||
										"PACKING LIST"}
								</div>
							)}
							{clientOrderData?.showCustomerOrderRef !== false &&
								clientOrderData?.customer_order_ref &&
								clientOrderData.customer_order_ref !== "N/A" &&
								clientOrderData.customer_order_ref !==
									headerData.reportName && (
									<div
										style={{
											fontSize: "16px",
											fontWeight: "600",
											color: "#333",
											marginTop: "5px",
										}}
									>
										Order: {clientOrderData.customer_order_ref}
									</div>
								)}
							{headerData.showReportNumber !== false &&
								headerData.reportNumber && (
									<div
										style={{
											fontSize: "14px",
											color: "#666",
											marginTop: "5px",
										}}
									>
										Ref: <strong>{headerData.reportNumber}</strong>
									</div>
								)}
						</div>
					)}

					{/* ── COVER BODY ── */}
					<div
						style={{
							fontSize: `${display.font_size_px ?? 11}px`,
							display: "flex",
							flexDirection: "column",
							gap: "9px",
							flex: 1,
						}}
					>
						{/* Date */}
						{display.show_report_date && headerData.reportDate && (
							<div>
								<span style={{ fontWeight: "700", color: tc }}>Date: </span>
								{new Date(headerData.reportDate).toLocaleDateString("en-GB")}
							</div>
						)}

						{/* CUSTOMER */}
						{clientData?.name && (
							<div
								style={{ borderBottom: "1px solid #ddd", paddingBottom: "7px" }}
							>
								<div
									style={{ fontWeight: "700", color: tc, marginBottom: "4px" }}
								>
									Customer:{" "}
									<span style={{ fontWeight: "400" }}>{clientData.name}</span>
								</div>
								{(clientData.address_line_1 ||
									clientData.address_line_2 ||
									clientData.address_line_3) && (
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr 1fr",
											gap: "2px 12px",
											marginBottom: "2px",
										}}
									>
										{clientData.address_line_1 && (
											<div>
												<span style={{ fontWeight: "600" }}>Address 1: </span>
												{clientData.address_line_1}
											</div>
										)}
										{clientData.address_line_2 && (
											<div>
												<span style={{ fontWeight: "600" }}>Address 2: </span>
												{clientData.address_line_2}
											</div>
										)}
										{clientData.address_line_3 && (
											<div>
												<span style={{ fontWeight: "600" }}>Address 3: </span>
												{clientData.address_line_3}
											</div>
										)}
									</div>
								)}
								{(clientData.post_code ||
									clientData.city ||
									clientData.country) && (
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr 1fr",
											gap: "2px 12px",
											marginBottom: "2px",
										}}
									>
										{clientData.post_code && (
											<div>
												<span style={{ fontWeight: "600" }}>Post Code: </span>
												{clientData.post_code}
											</div>
										)}
										{clientData.city && (
											<div>
												<span style={{ fontWeight: "600" }}>City: </span>
												{clientData.city}
											</div>
										)}
										{clientData.country && (
											<div>
												<span style={{ fontWeight: "600" }}>Country: </span>
												{clientData.country}
											</div>
										)}
									</div>
								)}
								{(clientData.contact_person ||
									clientData.phone ||
									clientData.email) && (
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr 1fr",
											gap: "2px 12px",
										}}
									>
										{clientData.contact_person && (
											<div>
												<span style={{ fontWeight: "600" }}>Contact: </span>
												{clientData.contact_person}
											</div>
										)}
										{clientData.phone && (
											<div>
												<span style={{ fontWeight: "600" }}>Phone: </span>
												{clientData.phone}
											</div>
										)}
										{clientData.email && (
											<div>
												<span style={{ fontWeight: "600" }}>Email: </span>
												{clientData.email}
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* ORDER REFS */}
						{(clientOrderData?.customer_order_ref ||
							clientOrderData?.quotation_ref ||
							(clientData?.showTrn !== false && clientData?.trn) ||
							(companyData?.showTrn !== false && companyData?.trn) ||
							headerData.deliveryNoteRef ||
							headerData.deliveryDate) && (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "2px 16px",
									borderBottom: "1px solid #ddd",
									paddingBottom: "7px",
								}}
							>
								{clientOrderData?.customer_order_ref && (
									<div>
										<span style={{ fontWeight: "600" }}>
											Customer Order #:{" "}
										</span>
										{clientOrderData.customer_order_ref}
									</div>
								)}
								{clientOrderData?.quotation_ref && (
									<div>
										<span style={{ fontWeight: "600" }}>
											Quotation Reference:{" "}
										</span>
										{clientOrderData.quotation_ref}
									</div>
								)}
								{clientData?.showTrn !== false && clientData?.trn && (
									<div>
										<span style={{ fontWeight: "600" }}>Customer TRN #: </span>
										{clientData.trn}
									</div>
								)}
								{companyData?.showTrn !== false && companyData?.trn && (
									<div>
										<span style={{ fontWeight: "600" }}>
											IPAC-Valsem TRN #:{" "}
										</span>
										{companyData.trn}
									</div>
								)}
								{headerData.deliveryNoteRef && (
									<div>
										<span style={{ fontWeight: "600" }}>Delivery Note #: </span>
										{headerData.deliveryNoteRef}
									</div>
								)}
								{headerData.deliveryDate && (
									<div>
										<span style={{ fontWeight: "600" }}>Delivery Date: </span>
										{headerData.deliveryDate}
									</div>
								)}
							</div>
						)}

						{/* PROJECT REFERENCE */}
						{display.show_project_reference && headerData.projectReference && (
							<div
								style={{ borderBottom: "1px solid #ddd", paddingBottom: "7px" }}
							>
								<span style={{ fontWeight: "700", color: tc }}>
									Project Reference:{" "}
								</span>
								<span style={{ fontWeight: "600" }}>
									{headerData.projectReference}
								</span>
							</div>
						)}

						{/* SHIPMENT DETAILS */}
						{(clientShipmentData?.consignee ||
							clientShipmentData?.shipping_date ||
							clientShipmentData?.address_1 ||
							clientShipmentData?.city) && (
							<div
								style={{ borderBottom: "1px solid #ddd", paddingBottom: "7px" }}
							>
								<div
									style={{
										fontWeight: "700",
										color: tc,
										textTransform: "uppercase",
										letterSpacing: "0.4px",
										marginBottom: "5px",
									}}
								>
									Shipment Details
								</div>
								{(clientShipmentData?.consignee ||
									clientShipmentData?.shipping_date) && (
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr",
											gap: "2px 12px",
											marginBottom: "2px",
										}}
									>
										{clientShipmentData?.consignee && (
											<div>
												<span style={{ fontWeight: "600" }}>Consignee: </span>
												{clientShipmentData.consignee}
											</div>
										)}
										{clientShipmentData?.shipping_date && (
											<div>
												<span style={{ fontWeight: "600" }}>
													Shipping Date:{" "}
												</span>
												{new Date(
													clientShipmentData.shipping_date,
												).toLocaleDateString("en-GB")}
											</div>
										)}
									</div>
								)}
								{(clientShipmentData?.address_1 ||
									clientShipmentData?.address_2 ||
									clientShipmentData?.address_3) && (
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr 1fr",
											gap: "2px 12px",
											marginBottom: "2px",
										}}
									>
										{clientShipmentData?.address_1 && (
											<div>
												<span style={{ fontWeight: "600" }}>Address 1: </span>
												{clientShipmentData.address_1}
											</div>
										)}
										{clientShipmentData?.address_2 && (
											<div>
												<span style={{ fontWeight: "600" }}>Address 2: </span>
												{clientShipmentData.address_2}
											</div>
										)}
										{clientShipmentData?.address_3 && (
											<div>
												<span style={{ fontWeight: "600" }}>Address 3: </span>
												{clientShipmentData.address_3}
											</div>
										)}
									</div>
								)}
								{(clientShipmentData?.post_code ||
									clientShipmentData?.city ||
									clientShipmentData?.country) && (
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr 1fr",
											gap: "2px 12px",
											marginBottom: "2px",
										}}
									>
										{clientShipmentData?.post_code && (
											<div>
												<span style={{ fontWeight: "600" }}>Post Code: </span>
												{clientShipmentData.post_code}
											</div>
										)}
										{clientShipmentData?.city && (
											<div>
												<span style={{ fontWeight: "600" }}>City: </span>
												{clientShipmentData.city}
											</div>
										)}
										{clientShipmentData?.country && (
											<div>
												<span style={{ fontWeight: "600" }}>Country: </span>
												{clientShipmentData.country}
											</div>
										)}
									</div>
								)}
								{(clientShipmentData?.contact ||
									clientShipmentData?.phone ||
									clientShipmentData?.email) && (
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr 1fr",
											gap: "2px 12px",
										}}
									>
										{clientShipmentData?.contact && (
											<div>
												<span style={{ fontWeight: "600" }}>Contact: </span>
												{clientShipmentData.contact}
											</div>
										)}
										{clientShipmentData?.phone && (
											<div>
												<span style={{ fontWeight: "600" }}>Phone: </span>
												{clientShipmentData.phone}
											</div>
										)}
										{clientShipmentData?.email && (
											<div>
												<span style={{ fontWeight: "600" }}>Email: </span>
												{clientShipmentData.email}
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* SUMMARY TOTALS */}
						<div
							style={{ display: "flex", flexDirection: "column", gap: "3px" }}
						>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "2px 16px",
								}}
							>
								<div>
									<span style={{ fontWeight: "700", color: tc }}>
										Total number of Boxes:{" "}
									</span>
									{items.length}
								</div>
								{headerData.totalVolume && (
									<div>
										<span style={{ fontWeight: "700", color: tc }}>
											Total volume:{" "}
										</span>
										{headerData.totalVolume} m³
									</div>
								)}
							</div>
							{(headerData.nw || headerData.gw) && (
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: "2px 16px",
									}}
								>
									{headerData.nw && (
										<div>
											<span style={{ fontWeight: "600" }}>NW: </span>
											{headerData.nw} Kg
										</div>
									)}
									{headerData.gw && (
										<div>
											<span style={{ fontWeight: "600" }}>GW: </span>
											{headerData.gw} Kg
										</div>
									)}
								</div>
							)}
							{headerData.transportModes &&
								headerData.transportModes.length > 0 && (
									<div
										style={{
											display: "flex",
											gap: "8px",
											alignItems: "center",
										}}
									>
										<span style={{ fontWeight: "600" }}>Transport mode:</span>
										{["Road", "Air", "Sea", "Other"].map((m) => (
											<span
												key={m}
												style={{
													display: "flex",
													alignItems: "center",
													gap: "3px",
												}}
											>
												<span
													style={{
														width: "9px",
														height: "9px",
														border: "1px solid #555",
														display: "inline-block",
														background: headerData.transportModes.includes(
															m.toLowerCase(),
														)
															? tc
															: "transparent",
													}}
												/>
												{m}
											</span>
										))}
									</div>
								)}
							{display.show_destination_country &&
								headerData.finalDestinationCountry && (
									<div>
										<span style={{ fontWeight: "600" }}>
											Final destination country:{" "}
										</span>
										{headerData.finalDestinationCountry}
									</div>
								)}
						</div>
					</div>

					{/* Footer */}
					<div
						style={{
							marginTop: "auto",
							textAlign: "center",
							fontSize: "10px",
							color: "#999",
							borderTop: "1px solid #e0e0e0",
							paddingTop: "6px",
							height: display.footer_height_px
								? `${display.footer_height_px}px`
								: "40px",
							display: "flex",
							flexDirection: "column",
							justifyContent: "flex-end",
						}}
					>
						Page 1 of {totalPages}
					</div>
				</div>
			);
		}

		return (
			<div
				ref={ref}
				style={{
					fontFamily: "'Segoe UI', 'Inter', sans-serif",
					fontSize: baseFontSize,
					color: "#1a1a2e",
					display: "flex",
					flexDirection: "column",
					width: "100%",
					height: "100%",
					overflow: "hidden",
					background: "white",
					paddingTop:
						isLandscape
							? "10mm"
							: display.header_show_mode === "first_page_only"
								? "10mm"
								: `${display.header_top_margin ?? 20}mm`,
					paddingLeft: "30px",
					paddingRight: "30px",
					paddingBottom: isLandscape ? "15px" : "30px",
				}}
			>
				{/* ─── Header ─────────────────────────────── */}
				{(!display.header_show_mode ||
					display.header_show_mode === "all_pages") && (
					<div style={{ flexShrink: 0 }}>
						{/* Colored top bar */}
						<div style={{ height: isLandscape ? 3 : 5, background: tc, marginBottom: isLandscape ? 6 : 12 }} />
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								paddingBottom: isLandscape ? 6 : 10,
								borderBottom: `2px solid ${tc}`,
								marginBottom: isLandscape ? 8 : 12,
							}}
						>
							{/* Left: company branding */}
							<div style={{ display: "flex", flexDirection: "column", gap: isLandscape ? 1 : 3 }}>
								{display.show_company_logo &&
									showLogo &&
									(companyData?.logoUrl || companyProfile?.logo_url) && (
										<img
											src={companyData?.logoUrl || companyProfile.logo_url}
											alt="Logo"
											style={{
												height: nameVal
													? Math.round((display.logo_size ?? 90) * (isLandscape ? 0.4 : 0.55))
													: Math.round((display.logo_size ?? 90) * (isLandscape ? 0.65 : 0.9)),
												objectFit: "contain",
												marginBottom: isLandscape ? 2 : 4,
											}}
										/>
									)}
								{display.show_company_name && nameVal && (
									<div
										style={{
											fontSize: isLandscape ? 8.5 : 10,
											fontWeight: 700,
											color: tc,
											letterSpacing: 1,
											textTransform: "uppercase",
										}}
									>
										{renderFormattedText(nameVal, display.enable_formatting)}
									</div>
								)}
							</div>

							{/* Center: title */}
							<div style={{ textAlign: "center", flex: 1, padding: isLandscape ? "0 8px" : "0 16px" }}>
								<div
									style={{
										fontSize: display.font_size_px
											? `${Math.round(display.font_size_px * (isLandscape ? 1.35 : 1.83))}px`
											: isLandscape
												? "16px"
												: HEADER_FONT_MAP[display.font_size],
										fontWeight: 800,
										color: tc,
										letterSpacing: isLandscape ? 1 : 2,
										textTransform: "uppercase",
									}}
								>
									{groupLabel
										? `${headerData.reportName || clientOrderData?.order_name || "Client Report"}`
										: headerData.reportName ||
											clientOrderData?.order_name ||
											"Client Report"}
								</div>
								{groupLabel && (
									<div
										style={{
											fontSize: isLandscape ? 9.5 : 11,
											color: "#555",
											marginTop: isLandscape ? 1 : 2,
											fontStyle: "italic",
										}}
									>
										{groupLabel}
									</div>
								)}
								<div
									style={{
										display: "flex",
										justifyContent: "center",
										gap: isLandscape ? 12 : 16,
										marginTop: isLandscape ? 2 : 4,
										fontSize: isLandscape ? 8.5 : 9.5,
										color: "#666",
									}}
								>
									{display.show_report_number && headerData.reportNumber && (
										<span>
											Ref: <strong>{headerData.reportNumber}</strong>
										</span>
									)}
									{display.show_report_date && headerData.reportDate && (
										<span>
											Date: <strong>{headerData.reportDate}</strong>
										</span>
									)}
									{display.show_project_reference &&
										headerData.projectReference && (
											<span>
												Project: <strong>{headerData.projectReference}</strong>
											</span>
										)}
									{display.show_destination_country &&
										headerData.finalDestinationCountry && (
											<span>
												Destination:{" "}
												<strong>{headerData.finalDestinationCountry}</strong>
											</span>
										)}
								</div>
							</div>

							{/* Right: page summary */}
							<div
								style={{
									textAlign: "right",
									fontSize: isLandscape ? 8 : 9,
									color: "#777",
									minWidth: isLandscape ? 70 : 80,
								}}
							>
								<div>
									Boxes: <strong style={{ color: tc }}>{items.length}</strong>
								</div>
								<div>
									Items: <strong style={{ color: tc }}>{totalBoxItems}</strong>
								</div>
								{display.show_page_numbers && (
									<div style={{ marginTop: isLandscape ? 2 : 4, fontStyle: "italic" }}>
										Page {pageIndex + 1} of {totalPages}
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* ─── Body: Box Cards ─────────────────────── */}
				<div
					style={{
						flex: 1,
						overflow: "hidden",
						display: "flex",
						flexDirection: "column",
						gap: 8,
						marginBottom: display.footer_body_gap_px ?? 0,
					}}
				>
					{items.length === 0 ? (
						<div
							style={{
								textAlign: "center",
								color: "#aaa",
								marginTop: 60,
								fontStyle: "italic",
							}}
						>
							No packages match the selected filters.
						</div>
					) : pkg.box_display_mode === "compact" ? (
						<table
							style={{
								width: "100%",
								borderCollapse: "collapse",
								fontSize: baseFontSize,
								border: "1px solid #d8e4f0",
							}}
						>
							<thead>
								<tr style={{ background: tc, color: "#fff" }}>
									{pkg.show_line_number && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "left",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											Line #
										</th>
									)}
									{pkg.show_box_number && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "left",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											Box #
										</th>
									)}
									{pkg.show_ipac_reference && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "left",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											IPAC Ref
										</th>
									)}
									{pkg.show_quantity && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "center",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											Qty
										</th>
									)}
									{pkg.show_internal_dims && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "left",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											Int Dims (mm)
										</th>
									)}
									{pkg.show_external_dims && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "left",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											Ext Dims (cm)
										</th>
									)}
									{pkg.show_tare && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "right",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											Tare (kg)
										</th>
									)}
									{pkg.show_net_weight && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "right",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											NW (kg)
										</th>
									)}
									{pkg.show_gross_weight && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "right",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											GW (kg)
										</th>
									)}
									{pkg.show_unit_m3 && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "right",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											Unit m³
										</th>
									)}
									{pkg.show_total_m3 && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "right",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											Total m³
										</th>
									)}
									{pkg.show_unit_m2 && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "right",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											Unit m²
										</th>
									)}
									{pkg.show_total_m2 && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "right",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											Total m²
										</th>
									)}
									{pkg.show_sei && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "left",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											SEI
										</th>
									)}
									{pkg.show_qr_code && (
										<th
											style={{
												padding: "6px 8px",
												textAlign: "center",
												fontSize: 9.5,
												borderBottom: "1px solid #d8e4f0",
											}}
										>
											QR
										</th>
									)}
								</tr>
							</thead>
							<tbody>
								{items.map((inst, idx) => {
									const globalIndex = allInstances
										? allInstances.findIndex((x) => x.id === inst.id)
										: -1;
									const globalLineNumber =
										globalIndex !== -1 ? globalIndex + 1 : undefined;

									const extL = inst.external_length ?? 0;
									const extW = inst.external_width ?? 0;
									const extH = inst.external_height ?? 0;
									const unitM3 = (extL * extW * extH) / 1e6;
									const totalM3 = unitM3;

									const unitM2 = (extL * extW) / 1e4;
									const totalM2 = unitM2;

									const intDims =
										inst.internal_length ||
										inst.internal_width ||
										inst.internal_height
											? `${inst.internal_length ?? 0}×${inst.internal_width ?? 0}×${inst.internal_height ?? 0}`
											: "—";

									const extDims =
										inst.external_length ||
										inst.external_width ||
										inst.external_height
											? `${inst.external_length ?? 0}×${inst.external_width ?? 0}×${inst.external_height ?? 0}`
											: "—";

									const rowBg =
										pkg.table_alternating_rows && idx % 2 === 1
											? pkg.table_alternating_color
											: "transparent";

									return (
										<tr key={inst.id} style={{ background: rowBg }}>
											{pkg.show_line_number && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
													}}
												>
													{globalLineNumber ?? "—"}
												</td>
											)}
											{pkg.show_box_number && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
														fontWeight: 600,
													}}
												>
													Box {inst.package_number}
													{inst.instance_number > 1
														? `.${inst.instance_number}`
														: ""}
												</td>
											)}
											{pkg.show_ipac_reference && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
													}}
												>
													{inst.ipac_reference ?? "—"}
												</td>
											)}
											{pkg.show_quantity && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
														textAlign: "center",
													}}
												>
													{inst.package_qty ?? "—"}
												</td>
											)}
											{pkg.show_internal_dims && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
													}}
												>
													{intDims}
												</td>
											)}
											{pkg.show_external_dims && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
													}}
												>
													{extDims}
												</td>
											)}
											{pkg.show_tare && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
														textAlign: "right",
													}}
												>
													{inst.tare !== null && inst.tare !== undefined
														? Math.round(inst.tare)
														: "—"}
												</td>
											)}
											{pkg.show_net_weight && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
														textAlign: "right",
													}}
												>
													{inst.net_weight !== null &&
													inst.net_weight !== undefined
														? Math.round(inst.net_weight)
														: "—"}
												</td>
											)}
											{pkg.show_gross_weight && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
														textAlign: "right",
													}}
												>
													{inst.gross_weight !== null &&
													inst.gross_weight !== undefined
														? Math.round(inst.gross_weight)
														: "—"}
												</td>
											)}
											{pkg.show_unit_m3 && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
														textAlign: "right",
													}}
												>
													{unitM3 > 0 ? unitM3.toFixed(3) : "—"}
												</td>
											)}
											{pkg.show_total_m3 && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
														textAlign: "right",
													}}
												>
													{totalM3 > 0 ? totalM3.toFixed(3) : "—"}
												</td>
											)}
											{pkg.show_unit_m2 && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
														textAlign: "right",
													}}
												>
													{unitM2 > 0 ? unitM2.toFixed(2) : "—"}
												</td>
											)}
											{pkg.show_total_m2 && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
														textAlign: "right",
													}}
												>
													{totalM2 > 0 ? totalM2.toFixed(2) : "—"}
												</td>
											)}
											{pkg.show_sei && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
													}}
												>
													{inst.sei_category || inst.sei_protection
														? `SEI ${`${inst.sei_category || ""} ${inst.sei_protection || ""}`.trim()}`
														: "—"}
												</td>
											)}
											{pkg.show_qr_code && (
												<td
													style={{
														padding: "4px 8px",
														borderBottom: "1px solid #eef",
														textAlign: "center",
													}}
												>
													{inst.qr_token ? (
														<img
															src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${origin}/portal/scan/${inst.qr_token}`)}`}
															alt="QR"
															style={{
																width: 32,
																height: 32,
																display: "inline-block",
															}}
														/>
													) : (
														"—"
													)}
												</td>
											)}
										</tr>
									);
								})}
							</tbody>
						</table>
					) : (
						items.map((inst) => {
							const globalIndex = allInstances
								? allInstances.findIndex((x) => x.id === inst.id)
								: -1;
							const globalLineNumber =
								globalIndex !== -1 ? globalIndex + 1 : undefined;

							return (
								<div
									key={inst.id}
									style={{
										border: `1px solid #d8e4f0`,
										borderRadius: 6,
										overflow: "hidden",
										breakInside: "avoid",
										pageBreakInside: "avoid",
									}}
								>
									{/* Line 1: Main Box Info (Header) */}
									<div
										style={{
											background: ac,
											borderBottom: `2px solid ${tc}`,
											padding: "6px 10px",
											display: "grid",
											gridTemplateColumns: "1fr auto",
											alignItems: "center",
											gap: "12px",
										}}
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												flexWrap: "wrap",
												gap: "4px 10px",
												fontSize: 10,
												color: "#222",
											}}
										>
											{pkg.show_line_number && (
												<span style={{ fontWeight: 700, color: tc }}>
													#{globalLineNumber}
												</span>
											)}
											{pkg.show_box_number !== false && (
												<span
													style={{ fontWeight: 700, fontSize: 11, color: tc }}
												>
													Box {inst.package_number}
													{inst.instance_number > 1
														? `.${inst.instance_number}`
														: ""}
													{inst.is_continuation ? " (Cont.)" : ""}
												</span>
											)}
											{pkg.show_quantity &&
												inst.package_qty !== null &&
												inst.package_qty !== undefined && (
													<span>
														Qty: <strong>{inst.package_qty}</strong>
													</span>
												)}
											{pkg.show_internal_dims &&
												(inst.internal_length ||
													inst.internal_width ||
													inst.internal_height) && (
													<span>
														Int Dims:{" "}
														<strong>
															{inst.internal_length ?? 0}×
															{inst.internal_width ?? 0}×
															{inst.internal_height ?? 0} mm
														</strong>
													</span>
												)}
											{pkg.show_external_dims &&
												(inst.external_length ||
													inst.external_width ||
													inst.external_height) && (
													<span>
														Ext Dims:{" "}
														<strong>
															{inst.external_length ?? 0}×
															{inst.external_width ?? 0}×
															{inst.external_height ?? 0} cm
														</strong>
													</span>
												)}
											{pkg.show_tare &&
												inst.tare !== null &&
												inst.tare !== undefined && (
													<span>
														Tare: <strong>{Math.round(inst.tare)} kg</strong>
													</span>
												)}
											{pkg.show_net_weight &&
												inst.net_weight !== null &&
												inst.net_weight !== undefined && (
													<span>
														N.W.:{" "}
														<strong>{Math.round(inst.net_weight)} kg</strong>
													</span>
												)}
											{pkg.show_gross_weight &&
												inst.gross_weight !== null &&
												inst.gross_weight !== undefined && (
													<span>
														G.W.:{" "}
														<strong>{Math.round(inst.gross_weight)} kg</strong>
													</span>
												)}
											{pkg.show_unit_m3 && (
												<span>
													Unit m³:{" "}
													<strong>
														{(
															((inst.external_length ?? 0) *
																(inst.external_width ?? 0) *
																(inst.external_height ?? 0)) /
															1e6
														).toFixed(3)}
													</strong>
												</span>
											)}
											{pkg.show_total_m3 && (
												<span>
													Total m³:{" "}
													<strong>
														{(
															((inst.external_length ?? 0) *
																(inst.external_width ?? 0) *
																(inst.external_height ?? 0)) /
															1e6
														).toFixed(3)}
													</strong>
												</span>
											)}
											{pkg.show_unit_m2 && (
												<span>
													Unit m²:{" "}
													<strong>
														{(
															((inst.external_length ?? 0) *
																(inst.external_width ?? 0)) /
															1e4
														).toFixed(2)}
													</strong>
												</span>
											)}
											{pkg.show_total_m2 && (
												<span>
													Total m²:{" "}
													<strong>
														{(
															((inst.external_length ?? 0) *
																(inst.external_width ?? 0)) /
															1e4
														).toFixed(2)}
													</strong>
												</span>
											)}
											{pkg.show_sei &&
												(inst.sei_category || inst.sei_protection) && (
													<span>
														SEI:{" "}
														<strong>
															{`${inst.sei_category || ""} ${inst.sei_protection || ""}`.trim()}
														</strong>
													</span>
												)}
											{pkg.show_ipac_reference && inst.ipac_reference && (
												<span>
													IPAC Ref: <strong>{inst.ipac_reference}</strong>
												</span>
											)}
											{pkg.show_client_reference && inst.destination && (
												<span>
													Client Ref: <strong>{inst.destination}</strong>
												</span>
											)}
											{pkg.show_destination && inst.destination && (
												<span>
													Dest: <strong>{inst.destination}</strong>
												</span>
											)}
											{pkg.show_order_name && inst.order_name && (
												<span>
													Order: <strong>{inst.order_name}</strong>
												</span>
											)}
										</div>
										{pkg.show_qr_code && inst.qr_token && (
											<img
												src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${origin}/portal/scan/${inst.qr_token}`)}`}
												alt="QR"
												style={{
													width: 48,
													height: 48,
													border: "1px solid #ccc",
													borderRadius: 2,
													background: "#fff",
													flexShrink: 0,
												}}
											/>
										)}
									</div>

									{/* Line 2: Detailed Box Info */}
									{!inst.is_continuation &&
										(pkg.show_total_qty_items ||
											pkg.show_last_packed_date ||
											pkg.show_box_type) && (
											<div
												style={{
													padding: "4px 10px",
													background: "#fafcff",
													borderBottom: "1px solid #eef",
													display: "flex",
													flexWrap: "wrap",
													gap: "2px 16px",
													fontSize: 9.5,
													color: "#555",
												}}
											>
												{pkg.show_total_qty_items && (
													<>
														<span>
															Lines:{" "}
															<strong>
																{inst.overall_lines ?? inst.pkd_items.length}
															</strong>
														</span>
														<span>
															Total Qty of Items:{" "}
															<strong>
																{inst.overall_qty ??
																	inst.pkd_items.reduce(
																		(sum, item) => sum + item.quantity,
																		0,
																	)}
															</strong>
														</span>
													</>
												)}
												{pkg.show_last_packed_date && inst.last_packed_at && (
													<span>
														Packed Date:{" "}
														<strong>
															{new Date(
																inst.last_packed_at,
															).toLocaleDateString()}
														</strong>
													</span>
												)}
												{pkg.show_box_type && inst.box_type && (
													<span>
														Type of Box: <strong>{inst.box_type}</strong>
													</span>
												)}
											</div>
										)}

									{/* Line 3: Box Pictures */}
									{(() => {
										let boxPhotos = [...(inst.box_photo_urls || [])];
										if (
											pkg.include_item_photos_in_box_photos &&
											inst.pkd_items
										) {
											const itemPhotos = inst.pkd_items.flatMap(
												(item) => item.photo_urls || [],
											);
											boxPhotos = [...boxPhotos, ...itemPhotos];
										}
										const visibleBoxPhotos = boxPhotos.filter(
											(url) => !hiddenMediaUrls.includes(url),
										);
										if (
											!pkg.show_box_photos ||
											inst.is_continuation ||
											visibleBoxPhotos.length === 0
										)
											return null;
										return (
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: "8px",
													padding: "8px 10px",
													background: "#f8fafc",
													borderBottom: "1px solid #eef",
												}}
											>
												{visibleBoxPhotos.map((url, uidx) => (
													<img
														key={`box-photo-${uidx}`}
														src={url}
														alt={`Box ${uidx + 1}`}
														style={{
															height: "60px",
															objectFit: "cover",
															borderRadius: "4px",
															border: "1px solid #ddd",
															boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
														}}
													/>
												))}
											</div>
										);
									})()}

									{/* Items block */}
									{pkg.show_items && inst.pkd_items.length > 0 && (
										<div
											style={{
												paddingTop: "4px",
												paddingLeft: "10px",
												paddingRight: "10px",
												paddingBottom: inst.has_more ? "10px" : "20px",
											}}
										>
											{pkg.items_detail_level === "summary" ? (
												<div
													style={{
														padding: "2px 0",
														fontSize: 9.5,
														color: "#555",
														fontStyle: "italic",
													}}
												>
													{inst.item_count} item
													{inst.item_count !== 1 ? "s" : ""} packed
												</div>
											) : (
												(() => {
													const activeColumns = [];
													if (pkg.show_line_num_col)
														activeColumns.push("line_num");
													if (pkg.show_qty_col) activeColumns.push("qty");
													if (pkg.show_item_num_col)
														activeColumns.push("item_num");
													if (pkg.show_description_col)
														activeColumns.push("description");
													if (pkg.show_item_qr_code)
														activeColumns.push("qr_code");

													let leftColSpan = 0;
													if (pkg.show_line_num_col) leftColSpan++;
													if (pkg.show_qty_col) leftColSpan++;
													if (pkg.show_item_num_col) leftColSpan++;

													return (
														<table
															style={{
																width: "100%",
																borderCollapse: "collapse",
																border: "1px solid #cbd5e1",
																marginTop: "4px",
																fontSize: baseFontSize,
															}}
														>
															<thead>
																<tr
																	style={{
																		background: "#e8f1f5",
																		color: "#333",
																		borderBottom: "2px solid #cbd5e1",
																	}}
																>
																	{pkg.show_line_num_col && (
																		<th
																			style={{
																				padding: "6px 8px",
																				fontSize: "9px",
																				fontWeight: "600",
																				borderRight: "1px solid #d8e4f0",
																				textAlign: "left",
																				width: "40px",
																			}}
																		>
																			Line #
																		</th>
																	)}
																	{pkg.show_qty_col && (
																		<th
																			style={{
																				padding: "6px 8px",
																				fontSize: "9px",
																				fontWeight: "600",
																				borderRight: "1px solid #d8e4f0",
																				textAlign: "center",
																				width: "40px",
																			}}
																		>
																			Qty
																		</th>
																	)}
																	{pkg.show_item_num_col && (
																		<th
																			style={{
																				padding: "6px 8px",
																				fontSize: "9px",
																				fontWeight: "600",
																				borderRight: "1px solid #d8e4f0",
																				textAlign: "left",
																				width: "100px",
																			}}
																		>
																			Item #
																		</th>
																	)}
																	{pkg.show_description_col && (
																		<th
																			style={{
																				padding: "6px 8px",
																				fontSize: "9px",
																				fontWeight: "600",
																				borderRight: pkg.show_item_qr_code
																					? "1px solid #d8e4f0"
																					: "none",
																				textAlign: "left",
																			}}
																		>
																			Description
																		</th>
																	)}
																	{pkg.show_item_qr_code && (
																		<th
																			style={{
																				padding: "6px 8px",
																				fontSize: "9px",
																				fontWeight: "600",
																				textAlign: "center",
																				width: "65px",
																			}}
																		>
																			QR
																		</th>
																	)}
																</tr>
															</thead>
															<tbody>
																{sortedItems(inst.pkd_items).map(
																	(item, idx) => {
																		const hasDims =
																			item.length || item.width || item.height;
																		const hasWeight =
																			item.net_weight !== null &&
																			item.net_weight !== undefined;
																		const visibleItemPhotos = (
																			item.photo_urls || []
																		).filter(
																			(url) => !hiddenMediaUrls.includes(url),
																		);
																		const hasPhotos =
																			pkg.show_item_photos &&
																			!pkg.include_item_photos_in_box_photos &&
																			visibleItemPhotos.length > 0;

																		const showExtraInfo =
																			pkg.items_detail_level === "detailed" &&
																			pkg.show_item_additional_info &&
																			(hasDims || hasWeight);

																		const hasSecondRow =
																			showExtraInfo || hasPhotos;

																		const rowBg =
																			pkg.table_alternating_rows &&
																			idx % 2 === 1
																				? pkg.table_alternating_color
																				: "#fff";

																		return (
																			<React.Fragment key={item.id}>
																				{/* Row 1: Item Details */}
																				<tr
																					style={{
																						background: rowBg,
																					}}
																				>
																					{pkg.show_line_num_col && (
																						<td
																							style={{
																								padding: "6px 8px",
																								fontSize: "9.5px",
																								borderRight:
																									"1px solid #d8e4f0",
																								borderBottom: hasSecondRow
																									? "1px dashed #e2e8f0"
																									: "1px solid #cbd5e1",
																								color: "#666",
																							}}
																						>
																							{(inst.line_offset ?? 0) +
																								idx +
																								1}
																						</td>
																					)}
																					{pkg.show_qty_col && (
																						<td
																							style={{
																								padding: "6px 8px",
																								fontSize: "9.5px",
																								fontWeight: "bold",
																								textAlign: "center",
																								borderRight:
																									"1px solid #d8e4f0",
																								borderBottom: hasSecondRow
																									? "1px dashed #e2e8f0"
																									: "1px solid #cbd5e1",
																								color: tc,
																							}}
																						>
																							{item.quantity}
																						</td>
																					)}
																					{pkg.show_item_num_col && (
																						<td
																							style={{
																								padding: "6px 8px",
																								fontSize: "9.5px",
																								fontWeight: "600",
																								borderRight:
																									"1px solid #d8e4f0",
																								borderBottom: hasSecondRow
																									? "1px dashed #e2e8f0"
																									: "1px solid #cbd5e1",
																								color: "#333",
																								wordBreak: "break-all",
																							}}
																						>
																							{item.item_num || "—"}
																						</td>
																					)}
																					{pkg.show_description_col && (
																						<td
																							style={{
																								padding: "6px 8px",
																								fontSize: "9.5px",
																								borderRight:
																									pkg.show_item_qr_code
																										? "1px solid #d8e4f0"
																										: "none",
																								borderBottom: hasSecondRow
																									? "1px dashed #e2e8f0"
																									: "1px solid #cbd5e1",
																								color: "#111",
																							}}
																						>
																							{item.item_name
																								? renderFormattedText(
																										item.item_name,
																										display.enable_formatting,
																									)
																								: "—"}
																						</td>
																					)}
																					{pkg.show_item_qr_code && (
																						<td
																							rowSpan={hasSecondRow ? 2 : 1}
																							style={{
																								padding: "6px 8px",
																								textAlign: "center",
																								verticalAlign: "middle",
																								borderBottom:
																									"1px solid #cbd5e1",
																								width: "65px",
																							}}
																						>
																							{item.qr_token ? (
																								<img
																									src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
																										`${origin}/portal/scan/${item.qr_token}`,
																									)}`}
																									alt="QR"
																									style={{
																										width: 48,
																										height: 48,
																										border: "1px solid #ccc",
																										borderRadius: 2,
																										background: "#fff",
																										display: "inline-block",
																									}}
																								/>
																							) : (
																								"—"
																							)}
																						</td>
																					)}
																				</tr>

																				{/* Row 2: Dimensions, Weights, and Photos */}
																				{hasSecondRow && (
																					<tr
																						style={{
																							background: rowBg,
																						}}
																					>
																						{leftColSpan > 0 ? (
																							<>
																								{/* Left Column(s): Dimensions & Weight info */}
																								<td
																									colSpan={leftColSpan}
																									style={{
																										padding: "6px 8px",
																										fontSize: "9px",
																										color: "#333",
																										borderRight:
																											"1px solid #d8e4f0",
																										borderBottom:
																											"1px solid #cbd5e1",
																										verticalAlign: "top",
																									}}
																								>
																									<div
																										style={{
																											display: "flex",
																											flexDirection: "column",
																											gap: "2px",
																										}}
																									>
																										{hasDims && (
																											<div>
																												<span
																													style={{
																														color: "#64748b",
																														fontWeight: "600",
																													}}
																												>
																													Dims:{" "}
																												</span>
																												<strong
																													style={{
																														color: "#1e293b",
																													}}
																												>
																													{item.length ?? 0}×
																													{item.width ?? 0}×
																													{item.height ?? 0} mm
																												</strong>
																											</div>
																										)}
																										{hasWeight && (
																											<div>
																												<span
																													style={{
																														color: "#64748b",
																														fontWeight: "600",
																													}}
																												>
																													Weight:{" "}
																												</span>
																												<strong
																													style={{
																														color: "#1e293b",
																													}}
																												>
																													{Math.round(
																														item.net_weight!,
																													)}{" "}
																													kg
																												</strong>
																											</div>
																										)}
																									</div>
																								</td>

																								{/* Description Column: Item Photos */}
																								<td
																									style={{
																										padding: "6px 8px",
																										borderRight:
																											pkg.show_item_qr_code
																												? "1px solid #d8e4f0"
																												: "none",
																										borderBottom:
																											"1px solid #cbd5e1",
																										verticalAlign: "top",
																									}}
																								>
																									{hasPhotos && (
																										<div
																											style={{
																												display: "flex",
																												flexWrap: "wrap",
																												gap: "6px",
																											}}
																										>
																											{visibleItemPhotos.map(
																												(url, uidx) => (
																													<img
																														key={`item-photo-${uidx}`}
																														src={url}
																														alt={`Item ${uidx + 1}`}
																														style={{
																															height: "45px",
																															objectFit:
																																"contain",
																															borderRadius:
																																"4px",
																															border:
																																"1px solid #cbd5e1",
																														}}
																													/>
																												),
																											)}
																										</div>
																									)}
																								</td>
																							</>
																						) : (
																							<td
																								style={{
																									padding: "6px 8px",
																									borderRight:
																										pkg.show_item_qr_code
																											? "1px solid #d8e4f0"
																											: "none",
																									borderBottom:
																										"1px solid #cbd5e1",
																									verticalAlign: "top",
																								}}
																							>
																								<div
																									style={{
																										display: "flex",
																										flexDirection: "column",
																										gap: "6px",
																									}}
																								>
																									<div
																										style={{
																											display: "flex",
																											gap: "12px",
																										}}
																									>
																										{hasDims && (
																											<span>
																												Dims:{" "}
																												<strong>
																													{item.length ?? 0}×
																													{item.width ?? 0}×
																													{item.height ?? 0} mm
																												</strong>
																											</span>
																										)}
																										{hasWeight && (
																											<span>
																												Weight:{" "}
																												<strong>
																													{Math.round(
																														item.net_weight!,
																													)}{" "}
																													kg
																												</strong>
																											</span>
																										)}
																									</div>
																									{hasPhotos && (
																										<div
																											style={{
																												display: "flex",
																												flexWrap: "wrap",
																												gap: "6px",
																											}}
																										>
																											{visibleItemPhotos.map(
																												(url, uidx) => (
																													<img
																														key={`item-photo-${uidx}`}
																														src={url}
																														alt={`Item ${uidx + 1}`}
																														style={{
																															height: "45px",
																															objectFit:
																																"contain",
																															borderRadius:
																																"4px",
																															border:
																																"1px solid #cbd5e1",
																														}}
																													/>
																												),
																											)}
																										</div>
																									)}
																								</div>
																							</td>
																						)}
																					</tr>
																				)}
																			</React.Fragment>
																		);
																	},
																)}
															</tbody>
														</table>
													);
												})()
											)}
											{inst.has_more && (
												<div
													style={{
														padding: "4px 10px",
														fontSize: 9,
														color: "#666",
														fontStyle: "italic",
														textAlign: "right",
													}}
												>
													Continued on next page...
												</div>
											)}
										</div>
									)}
									{display.include_signatures &&
										display.signatures_scope === "box" &&
										!inst.has_more && (
											<div
												style={{
													display: "flex",
													gap: 20,
													padding: "8px 10px",
													borderTop: "1px solid #e8eef4",
													background: "#fafcff",
												}}
											>
												{display.signature_fields.map((sig, i) => {
													const sigKey = `sig-box-${inst.id}-${i}`;
													return (
														<div
															key={sigKey}
															style={{ flex: 1, textAlign: "center" }}
														>
															{(() => {
																const _m = sig.image_id
																	? signatures.find(
																			(s) => s.id === sig.image_id,
																		)
																	: undefined;
																return _m ? (
																	<div
																		style={{
																			display: "flex",
																			justifyContent:
																				display.signature_align ?? "center",
																		}}
																	>
																		<img
																			src={getSignatureUrl(_m.image_path)}
																			alt={_m.label}
																			style={{
																				height:
																					display.signature_height_px ?? 30,
																				width: `${display.signature_width_pct ?? 80}%`,
																				objectFit: "contain",
																				marginBottom: 3,
																			}}
																		/>
																	</div>
																) : (
																	<div
																		style={{
																			borderBottom: "1px solid #aaa",
																			height: display.signature_height_px ?? 30,
																			marginBottom: 3,
																		}}
																	/>
																);
															})()}
															<div style={{ fontSize: 8.5, color: "#666" }}>
																{sig.label}
															</div>
														</div>
													);
												})}
											</div>
										)}
								</div>
							);
						})
					)}
				</div>
				<div
					style={{
						flexShrink: 0,
						marginTop: "auto",
						borderTop: "1px solid #e0e8f0",
						paddingTop: "6px",
						minHeight: display.footer_height_px
							? `${display.footer_height_px}px`
							: "40px",
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-between",
					}}
				>
					{display.include_signatures &&
						(!display.signatures_scope ||
							display.signatures_scope === "project") &&
						pageIndex === totalPages - 1 && (
							<div style={{ display: "flex", gap: 20, marginBottom: 8 }}>
								{display.signature_fields.map((sig, i) => {
									const sigKey = `sig-page-${i}`;
									return (
										<div key={sigKey} style={{ flex: 1, textAlign: "center" }}>
											{(() => {
												const _m = sig.image_id
													? signatures.find((s) => s.id === sig.image_id)
													: undefined;
												return _m ? (
													<div
														style={{
															display: "flex",
															justifyContent:
																display.signature_align ?? "center",
														}}
													>
														<img
															src={getSignatureUrl(_m.image_path)}
															alt={_m.label}
															style={{
																height: display.signature_height_px ?? 30,
																width: `${display.signature_width_pct ?? 80}%`,
																objectFit: "contain",
																marginBottom: 4,
															}}
														/>
													</div>
												) : (
													<div
														style={{
															borderBottom: "1px solid #aaa",
															height: display.signature_height_px ?? 30,
															marginBottom: 4,
														}}
													/>
												);
											})()}
											<div style={{ fontSize: 9, color: "#666" }}>
												{sig.label}
											</div>
										</div>
									);
								})}
							</div>
						)}
					{display.footer_text && (
						<div
							style={{
								fontSize: 9,
								color: "#999",
								textAlign: "center",
								fontStyle: "italic",
								marginBottom: 4,
								marginTop: "auto",
							}}
						>
							{display.footer_text}
						</div>
					)}
					<div
						style={{
							marginTop: display.footer_text ? 0 : "auto",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<div style={{ fontSize: 8.5, color: "#aaa" }}>
							{companyProfile?.name || "IPAC"} — Confidential
						</div>
						{display.show_page_numbers && (
							<div style={{ fontSize: 8.5, color: "#aaa" }}>
								Page {pageIndex + 1} / {totalPages}
							</div>
						)}
					</div>
				</div>
			</div>
		);
	},
);

PackingListPage.displayName = "PackingListPage";
