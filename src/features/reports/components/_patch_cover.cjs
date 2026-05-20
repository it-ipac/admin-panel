const fs = require("node:fs");
const content = fs.readFileSync("PackingListPage.tsx", "utf8");

const startMarker = "				{/* Content Grid */}";
const endMarker = "\t\t\t\t\t{/* Footer */}";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
	console.error("Markers not found", startIdx, endIdx);
	process.exit(1);
}

const before = content.slice(0, startIdx);
const after = content.slice(endIdx);

const newBody = `				{/* ── COVER BODY ── */}
				<div style={{ fontSize: \`\${display.font_size_px ?? 11}px\`, display: "flex", flexDirection: "column", gap: "9px", flex: 1 }}>

					{/* Date */}
					{display.show_report_date && headerData.reportDate && (
						<div><span style={{ fontWeight: "700", color: tc }}>Date: </span>{new Date(headerData.reportDate).toLocaleDateString("en-GB")}</div>
					)}

					{/* CUSTOMER */}
					{clientData?.name && (
						<div style={{ borderBottom: "1px solid #ddd", paddingBottom: "7px" }}>
							<div style={{ fontWeight: "700", color: tc, marginBottom: "4px" }}>Customer: <span style={{ fontWeight: "400" }}>{clientData.name}</span></div>
							{(clientData.address_line_1 || clientData.address_line_2 || clientData.address_line_3) && (
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px 12px", marginBottom: "2px" }}>
									{clientData.address_line_1 && <div><span style={{ fontWeight: "600" }}>Address 1: </span>{clientData.address_line_1}</div>}
									{clientData.address_line_2 && <div><span style={{ fontWeight: "600" }}>Address 2: </span>{clientData.address_line_2}</div>}
									{clientData.address_line_3 && <div><span style={{ fontWeight: "600" }}>Address 3: </span>{clientData.address_line_3}</div>}
								</div>
							)}
							{(clientData.post_code || clientData.city || clientData.country) && (
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px 12px", marginBottom: "2px" }}>
									{clientData.post_code && <div><span style={{ fontWeight: "600" }}>Post Code: </span>{clientData.post_code}</div>}
									{clientData.city && <div><span style={{ fontWeight: "600" }}>City: </span>{clientData.city}</div>}
									{clientData.country && <div><span style={{ fontWeight: "600" }}>Country: </span>{clientData.country}</div>}
								</div>
							)}
							{(clientData.contact_person || clientData.phone || clientData.email) && (
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px 12px" }}>
									{clientData.contact_person && <div><span style={{ fontWeight: "600" }}>Contact: </span>{clientData.contact_person}</div>}
									{clientData.phone && <div><span style={{ fontWeight: "600" }}>Phone: </span>{clientData.phone}</div>}
									{clientData.email && <div><span style={{ fontWeight: "600" }}>Email: </span>{clientData.email}</div>}
								</div>
							)}
						</div>
					)}

					{/* ORDER REFS */}
					{(clientOrderData?.customer_order_ref || clientOrderData?.quotation_ref || clientOrderData?.customer_trn || clientOrderData?.ipac_valsem_trn || headerData.deliveryNoteRef || headerData.deliveryDate) && (
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px", borderBottom: "1px solid #ddd", paddingBottom: "7px" }}>
							{clientOrderData?.customer_order_ref && <div><span style={{ fontWeight: "600" }}>Customer Order #: </span>{clientOrderData.customer_order_ref}</div>}
							{clientOrderData?.quotation_ref && <div><span style={{ fontWeight: "600" }}>Quotation Reference: </span>{clientOrderData.quotation_ref}</div>}
							{clientOrderData?.customer_trn && <div><span style={{ fontWeight: "600" }}>Customer TRN #: </span>{clientOrderData.customer_trn}</div>}
							{clientOrderData?.ipac_valsem_trn && <div><span style={{ fontWeight: "600" }}>IPAC-Valsem TRN #: </span>{clientOrderData.ipac_valsem_trn}</div>}
							{headerData.deliveryNoteRef && <div><span style={{ fontWeight: "600" }}>Delivery Note #: </span>{headerData.deliveryNoteRef}</div>}
							{headerData.deliveryDate && <div><span style={{ fontWeight: "600" }}>Delivery Date: </span>{headerData.deliveryDate}</div>}
						</div>
					)}

					{/* PROJECT REFERENCE */}
					{display.show_project_reference && headerData.projectReference && (
						<div style={{ borderBottom: "1px solid #ddd", paddingBottom: "7px" }}>
							<span style={{ fontWeight: "700", color: tc }}>Project Reference: </span>
							<span style={{ fontWeight: "600" }}>{headerData.projectReference}</span>
						</div>
					)}

					{/* SHIPMENT DETAILS */}
					{(clientShipmentData?.consignee || clientShipmentData?.shipping_date || clientShipmentData?.address_1 || clientShipmentData?.city) && (
						<div style={{ borderBottom: "1px solid #ddd", paddingBottom: "7px" }}>
							<div style={{ fontWeight: "700", color: tc, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "5px" }}>Shipment Details</div>
							{(clientShipmentData?.consignee || clientShipmentData?.shipping_date) && (
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", marginBottom: "2px" }}>
									{clientShipmentData?.consignee && <div><span style={{ fontWeight: "600" }}>Consignee: </span>{clientShipmentData.consignee}</div>}
									{clientShipmentData?.shipping_date && <div><span style={{ fontWeight: "600" }}>Shipping Date: </span>{new Date(clientShipmentData.shipping_date).toLocaleDateString("en-GB")}</div>}
								</div>
							)}
							{(clientShipmentData?.address_1 || clientShipmentData?.address_2 || clientShipmentData?.address_3) && (
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px 12px", marginBottom: "2px" }}>
									{clientShipmentData?.address_1 && <div><span style={{ fontWeight: "600" }}>Address 1: </span>{clientShipmentData.address_1}</div>}
									{clientShipmentData?.address_2 && <div><span style={{ fontWeight: "600" }}>Address 2: </span>{clientShipmentData.address_2}</div>}
									{clientShipmentData?.address_3 && <div><span style={{ fontWeight: "600" }}>Address 3: </span>{clientShipmentData.address_3}</div>}
								</div>
							)}
							{(clientShipmentData?.post_code || clientShipmentData?.city || clientShipmentData?.country) && (
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px 12px", marginBottom: "2px" }}>
									{clientShipmentData?.post_code && <div><span style={{ fontWeight: "600" }}>Post Code: </span>{clientShipmentData.post_code}</div>}
									{clientShipmentData?.city && <div><span style={{ fontWeight: "600" }}>City: </span>{clientShipmentData.city}</div>}
									{clientShipmentData?.country && <div><span style={{ fontWeight: "600" }}>Country: </span>{clientShipmentData.country}</div>}
								</div>
							)}
							{(clientShipmentData?.contact || clientShipmentData?.phone || clientShipmentData?.email) && (
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px 12px" }}>
									{clientShipmentData?.contact && <div><span style={{ fontWeight: "600" }}>Contact: </span>{clientShipmentData.contact}</div>}
									{clientShipmentData?.phone && <div><span style={{ fontWeight: "600" }}>Phone: </span>{clientShipmentData.phone}</div>}
									{clientShipmentData?.email && <div><span style={{ fontWeight: "600" }}>Email: </span>{clientShipmentData.email}</div>}
								</div>
							)}
						</div>
					)}

					{/* SUMMARY TOTALS */}
					<div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px" }}>
							<div><span style={{ fontWeight: "700", color: tc }}>Total number of Boxes: </span>{items.length}</div>
							{headerData.totalVolume && <div><span style={{ fontWeight: "700", color: tc }}>Total volume: </span>{headerData.totalVolume} m\u00B3</div>}
						</div>
						{(headerData.nw || headerData.gw) && (
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px" }}>
								{headerData.nw && <div><span style={{ fontWeight: "600" }}>NW: </span>{headerData.nw} Kg</div>}
								{headerData.gw && <div><span style={{ fontWeight: "600" }}>GW: </span>{headerData.gw} Kg</div>}
							</div>
						)}
						{headerData.transportModes && headerData.transportModes.length > 0 && (
							<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
								<span style={{ fontWeight: "600" }}>Transport mode:</span>
								{["Road", "Air", "Sea", "Other"].map((m) => (
									<span key={m} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
										<span style={{ width: "9px", height: "9px", border: "1px solid #555", display: "inline-block", background: headerData.transportModes.includes(m.toLowerCase()) ? tc : "transparent" }} />
										{m}
									</span>
								))}
							</div>
						)}
						{display.show_destination_country && headerData.finalDestinationCountry && (
							<div><span style={{ fontWeight: "600" }}>Final destination country: </span>{headerData.finalDestinationCountry}</div>
						)}
					</div>

				</div>

				`;

const result = before + newBody + after;
fs.writeFileSync("PackingListPage.tsx", result, "utf8");
console.log("Done. File length:", result.length);
