import React from "react";
import type {
	ReportDisplaySettings,
	ReportPkgDetailsSettings,
} from "../settings-defaults";
import type { ReportInstanceData } from "../types";

interface PackingListPageProps {
	items: ReportInstanceData[];
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
		},
		ref,
	) => {
		const baseFontSize = display.font_size_px
			? `${display.font_size_px}px`
			: FONT_SIZE_MAP[display.font_size];
		const tc = display.theme_color;
		const ac = display.accent_color;

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
							clientOrderData?.customer_trn ||
							clientOrderData?.ipac_valsem_trn ||
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
								{clientOrderData?.customer_trn && (
									<div>
										<span style={{ fontWeight: "600" }}>Customer TRN #: </span>
										{clientOrderData.customer_trn}
									</div>
								)}
								{clientOrderData?.ipac_valsem_trn && (
									<div>
										<span style={{ fontWeight: "600" }}>
											IPAC-Valsem TRN #:{" "}
										</span>
										{clientOrderData.ipac_valsem_trn}
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
						display.header_show_mode === "first_page_only"
							? "10mm"
							: `${display.header_top_margin ?? 20}mm`,
					paddingLeft: "30px",
					paddingRight: "30px",
					paddingBottom: "30px",
				}}
			>
				{/* ─── Header ─────────────────────────────── */}
				{(!display.header_show_mode ||
					display.header_show_mode === "all_pages") && (
					<div style={{ flexShrink: 0 }}>
						{/* Colored top bar */}
						<div style={{ height: 5, background: tc, marginBottom: 12 }} />
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								paddingBottom: 10,
								borderBottom: `2px solid ${tc}`,
								marginBottom: 12,
							}}
						>
							{/* Left: company branding */}
							<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
								{display.show_company_logo &&
									showLogo &&
									(companyData?.logoUrl || companyProfile?.logo_url) && (
										<img
											src={companyData?.logoUrl || companyProfile.logo_url}
											alt="Logo"
											style={{
												height: nameVal
													? Math.round((display.logo_size ?? 90) * 0.55)
													: Math.round((display.logo_size ?? 90) * 0.9),
												objectFit: "contain",
												marginBottom: 4,
											}}
										/>
									)}
								{display.show_company_name && nameVal && (
									<div
										style={{
											fontSize: 10,
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
							<div style={{ textAlign: "center", flex: 1, padding: "0 16px" }}>
								<div
									style={{
										fontSize: display.font_size_px
											? `${Math.round(display.font_size_px * 1.83)}px`
											: HEADER_FONT_MAP[display.font_size],
										fontWeight: 800,
										color: tc,
										letterSpacing: 2,
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
											fontSize: 11,
											color: "#555",
											marginTop: 2,
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
										gap: 16,
										marginTop: 4,
										fontSize: 9.5,
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
									fontSize: 9,
									color: "#777",
									minWidth: 80,
								}}
							>
								<div>
									Boxes: <strong style={{ color: tc }}>{items.length}</strong>
								</div>
								<div>
									Items: <strong style={{ color: tc }}>{totalBoxItems}</strong>
								</div>
								{display.show_page_numbers && (
									<div style={{ marginTop: 4, fontStyle: "italic" }}>
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
					) : (
						items.map((inst) => (
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
								{/* Box header bar */}
								<div
									style={{
										background: ac,
										borderBottom: `2px solid ${tc}`,
										padding: "6px 10px",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "flex-start",
									}}
								>
									<div>
										<div style={{ fontWeight: 700, fontSize: 13, color: tc }}>
											Box {inst.package_number}
											{inst.instance_number > 1
												? ` — Instance ${inst.instance_number}`
												: ""}
											{inst.is_continuation ? " (Continued)" : ""}
										</div>
										<div
											style={{
												display: "flex",
												flexWrap: "wrap",
												gap: "4px 12px",
												marginTop: 2,
												fontSize: 9.5,
												color: "#444",
											}}
										>
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
										</div>
										{pkg.show_order_name && (
											<div style={{ fontSize: 9, color: "#666", marginTop: 1 }}>
												{inst.order_name}
											</div>
										)}
									</div>
									{display.show_qr_codes && (
										<div
											style={{
												width: 44,
												height: 44,
												background: "#fff",
												border: "1px solid #bbb",
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
												justifyContent: "center",
												fontSize: 7,
												color: "#999",
												textAlign: "center",
												flexShrink: 0,
												borderRadius: 3,
											}}
										>
											▥<br />
											QR
										</div>
									)}
								</div>

								{/* Meta row */}
								{true && (
									<div
										style={{
											padding: "4px 10px",
											background: "#fafcff",
											borderBottom: "1px solid #eef",
											display: "flex",
											flexWrap: "wrap",
											gap: "2px 16px",
											fontSize: 9.5,
										}}
									>
										{pkg.show_item_count_summary && (
											<>
												<span>
													Lines:{" "}
													<strong>
														{inst.overall_lines ?? inst.pkd_items.length}
													</strong>
												</span>
												<span>
													Total Qty:{" "}
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
												Packed:{" "}
												<strong>
													{new Date(inst.last_packed_at).toLocaleDateString()}
												</strong>
											</span>
										)}
										{pkg.show_weights && (
											<span>
												Weight: <strong>—</strong>
											</span>
										)}
										{pkg.show_dimensions && (
											<span>
												Dims: <strong>— × — × — cm</strong>
											</span>
										)}
										{pkg.show_status && (
											<span>
												Status:{" "}
												<strong style={{ textTransform: "capitalize" }}>
													{inst.status}
												</strong>
											</span>
										)}
									</div>
								)}

								{/* Items table */}
								{pkg.show_items && inst.pkd_items.length > 0 && (
									<div style={{ padding: "4px 0 2px" }}>
										{pkg.items_detail_level === "summary" ? (
											<div
												style={{
													padding: "2px 10px",
													fontSize: 9.5,
													color: "#555",
													fontStyle: "italic",
												}}
											>
												{inst.item_count} item{inst.item_count !== 1 ? "s" : ""}{" "}
												packed
											</div>
										) : (
											<table
												style={{
													width: "100%",
													borderCollapse: "collapse",
													fontSize: baseFontSize,
												}}
											>
												<thead>
													<tr style={{ background: tc }}>
														{pkg.show_line_num_col && (
															<th
																style={{
																	padding: "3px 8px",
																	textAlign: "left",
																	color: "#fff",
																	fontWeight: 600,
																	fontSize: 9,
																	width: 40,
																}}
															>
																No.
															</th>
														)}
														{pkg.show_item_num_col && (
															<th
																style={{
																	padding: "3px 8px",
																	textAlign: "left",
																	color: "#fff",
																	fontWeight: 600,
																	fontSize: 9,
																	width: 90,
																}}
															>
																Item #
															</th>
														)}
														{pkg.show_description_col && (
															<th
																style={{
																	padding: "3px 8px",
																	textAlign: "left",
																	color: "#fff",
																	fontWeight: 600,
																	fontSize: 9,
																}}
															>
																Description
															</th>
														)}
														{pkg.show_qty_col && (
															<th
																style={{
																	padding: "3px 8px",
																	textAlign: "right",
																	color: "#fff",
																	fontWeight: 600,
																	fontSize: 9,
																	width: 40,
																}}
															>
																Qty
															</th>
														)}
													</tr>
												</thead>
												<tbody>
													{sortedItems(inst.pkd_items).map((item, i) => (
														<tr
															key={item.id}
															style={{
																background:
																	pkg.table_alternating_rows && i % 2 === 1
																		? pkg.table_alternating_color
																		: "#fff",
																borderBottom: pkg.table_show_border
																	? "1px solid #e8eef4"
																	: undefined,
															}}
														>
															{pkg.show_line_num_col && (
																<td
																	style={{
																		padding: "2.5px 8px",
																		color: "#555",
																		fontSize: 9.5,
																	}}
																>
																	{(inst.line_offset || 0) + i + 1}
																</td>
															)}
															{pkg.show_item_num_col && (
																<td
																	style={{
																		padding: "2.5px 8px",
																		color: "#555",
																		fontFamily: "monospace",
																		fontSize: 9.5,
																	}}
																>
																	{item.item_num
																		? renderFormattedText(
																				item.item_num,
																				display.enable_formatting,
																			)
																		: "—"}
																</td>
															)}
															{pkg.show_description_col && (
																<td
																	style={{
																		padding: "2.5px 8px",
																		color: "#222",
																		fontSize: 9.5,
																		lineHeight: 1.35,
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

															{pkg.show_qty_col && (
																<td
																	style={{
																		padding: "2.5px 8px",
																		textAlign: "right",
																		fontWeight: 700,
																		color: tc,
																		fontSize: 10,
																	}}
																>
																	{item.quantity}
																</td>
															)}
														</tr>
													))}
												</tbody>
											</table>
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
														<div
															style={{
																borderBottom: `1px solid #aaa`,
																height: 20,
																marginBottom: 3,
															}}
														/>
														<div style={{ fontSize: 8.5, color: "#666" }}>
															{sig.label}
														</div>
													</div>
												);
											})}
										</div>
									)}
							</div>
						))
					)}
				</div>

				{/* ─── Footer ─────────────────────────────── */}
				<div
					style={{
						flexShrink: 0,
						marginTop: "auto",
						height: display.footer_height_px
							? `${display.footer_height_px}px`
							: "40px",
						display: "flex",
						flexDirection: "column",
						justifyContent: "flex-end",
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
											<div
												style={{
													borderBottom: `1px solid #aaa`,
													height: 28,
													marginBottom: 4,
												}}
											/>
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
							}}
						>
							{display.footer_text}
						</div>
					)}
					<div
						style={{
							borderTop: "1px solid #e0e8f0",
							paddingTop: 4,
							display: "flex",
							justifyContent: "space-between",
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
