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
		const baseFontSize = FONT_SIZE_MAP[display.font_size];
		const tc = display.theme_color;
		const ac = display.accent_color;

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
						padding: "40px",
					}}
				>
					{/* Header */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-start",
							borderBottom: `2px solid ${tc}`,
							paddingBottom: "20px",
							marginBottom: "40px",
						}}
					>
						<div>
							{display.show_company_logo && companyProfile?.logo_url && (
								<img
									src={companyProfile.logo_url}
									alt="Logo"
									style={{ height: "50px", objectFit: "contain" }}
								/>
							)}
							<div
								style={{
									fontSize: "14px",
									fontWeight: "bold",
									color: tc,
									marginTop: "5px",
								}}
							>
								{companyData?.name || "IPAC Valsem International"}
							</div>
						</div>
						<div
							style={{ textAlign: "right", fontSize: "11px", color: "#666" }}
						>
							<div>Tel: {companyData?.tel}</div>
							<div>PO Box: {companyData?.poBox}</div>
							<div>
								{companyData?.street}, {companyData?.area}
							</div>
							<div>
								{companyData?.city}, {companyData?.country}
							</div>
							<div>{companyData?.website}</div>
						</div>
					</div>

					{/* Title */}
					<div style={{ textAlign: "center", marginBottom: "40px" }}>
						<div
							style={{
								fontSize: "28px",
								fontWeight: "bold",
								color: tc,
								letterSpacing: "2px",
								textTransform: "uppercase",
							}}
						>
							{headerData.reportName || "PACKING LIST"}
						</div>
						<div
							style={{
								fontSize: "16px",
								fontWeight: "600",
								color: "#333",
								marginTop: "5px",
							}}
						>
							Order: {clientOrderData?.customer_order_ref || "N/A"}
						</div>
						{headerData.reportNumber && (
							<div
								style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}
							>
								Ref: <strong>{headerData.reportNumber}</strong>
							</div>
						)}
					</div>

					{/* Content Grid */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "30px",
							fontSize: "12px",
						}}
					>
						{/* Left Column: Client & Order */}
						<div
							style={{ display: "flex", flexDirection: "column", gap: "20px" }}
						>
							{/* Client Info */}
							<div
								style={{
									border: "1px solid #e0e0e0",
									borderRadius: "6px",
									padding: "15px",
								}}
							>
								<div
									style={{
										fontSize: "13px",
										fontWeight: "bold",
										color: tc,
										marginBottom: "10px",
										borderBottom: "1px solid #e0e0e0",
										paddingBottom: "5px",
									}}
								>
									Customer Info
								</div>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "5px",
									}}
								>
									<div>
										<span style={{ fontWeight: "600" }}>Name:</span>{" "}
										{clientData?.name}
									</div>
									<div>
										<span style={{ fontWeight: "600" }}>TRN:</span>{" "}
										{clientData?.trn}
									</div>
									<div>
										<span style={{ fontWeight: "600" }}>Address:</span>{" "}
										{clientData?.address_line_1}
									</div>
									<div>
										{clientData?.city}, {clientData?.country}
									</div>
								</div>
							</div>

							{/* Order Info */}
							<div
								style={{
									border: "1px solid #e0e0e0",
									borderRadius: "6px",
									padding: "15px",
								}}
							>
								<div
									style={{
										fontSize: "13px",
										fontWeight: "bold",
										color: tc,
										marginBottom: "10px",
										borderBottom: "1px solid #e0e0e0",
										paddingBottom: "5px",
									}}
								>
									Order Details
								</div>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "5px",
									}}
								>
									<div>
										<span style={{ fontWeight: "600" }}>Cust. Order #:</span>{" "}
										{clientOrderData?.customer_order_ref}
									</div>
									<div>
										<span style={{ fontWeight: "600" }}>Quotation Ref:</span>{" "}
										{clientOrderData?.quotation_ref}
									</div>
									<div>
										<span style={{ fontWeight: "600" }}>Cust. TRN:</span>{" "}
										{clientOrderData?.customer_trn}
									</div>
									<div>
										<span style={{ fontWeight: "600" }}>IPAC TRN:</span>{" "}
										{clientOrderData?.ipac_valsem_trn}
									</div>
									<div>
										<span style={{ fontWeight: "600" }}>Project Ref:</span>{" "}
										{headerData.projectReference}
									</div>
								</div>
							</div>
						</div>

						{/* Right Column: Shipment & Summary */}
						<div
							style={{ display: "flex", flexDirection: "column", gap: "20px" }}
						>
							{/* Shipment Info */}
							<div
								style={{
									border: "1px solid #e0e0e0",
									borderRadius: "6px",
									padding: "15px",
								}}
							>
								<div
									style={{
										fontSize: "13px",
										fontWeight: "bold",
										color: tc,
										marginBottom: "10px",
										borderBottom: "1px solid #e0e0e0",
										paddingBottom: "5px",
									}}
								>
									Shipment Details
								</div>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "5px",
									}}
								>
									<div>
										<span style={{ fontWeight: "600" }}>Consignee:</span>{" "}
										{clientShipmentData?.consignee}
									</div>
									<div>
										<span style={{ fontWeight: "600" }}>Shipping Date:</span>{" "}
										{clientShipmentData?.shipping_date}
									</div>
									<div>
										<span style={{ fontWeight: "600" }}>Destination:</span>{" "}
										{clientShipmentData?.city}, {clientShipmentData?.country}
									</div>
								</div>
							</div>

							{/* Summary Info (from items) */}
							<div
								style={{
									border: "1px solid #e0e0e0",
									borderRadius: "6px",
									padding: "15px",
								}}
							>
								<div
									style={{
										fontSize: "13px",
										fontWeight: "bold",
										color: tc,
										marginBottom: "10px",
										borderBottom: "1px solid #e0e0e0",
										paddingBottom: "5px",
									}}
								>
									Summary
								</div>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "5px",
									}}
								>
									<div>
										<span style={{ fontWeight: "600" }}>Total Boxes:</span>{" "}
										{items.length}
									</div>
									<div>
										<span style={{ fontWeight: "600" }}>
											Final Destination:
										</span>{" "}
										{headerData.finalDestinationCountry}
									</div>
								</div>
							</div>
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
							paddingTop: "10px",
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
				}}
			>
				{/* ─── Header ─────────────────────────────── */}
				<div style={{ flexShrink: 0 }}>
					{/* Colored top bar */}
					<div style={{ height: 5, background: tc, marginBottom: 12 }} />
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-start",
							paddingBottom: 10,
							borderBottom: `2px solid ${tc}`,
							marginBottom: 12,
						}}
					>
						{/* Left: company branding */}
						<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
							{display.show_company_logo && companyProfile?.logo_url && (
								<img
									src={companyProfile.logo_url}
									alt="Logo"
									style={{ height: 36, objectFit: "contain", marginBottom: 4 }}
								/>
							)}
							{display.show_company_name && (
								<div
									style={{
										fontSize: 10,
										fontWeight: 700,
										color: tc,
										letterSpacing: 1,
										textTransform: "uppercase",
									}}
								>
									{companyProfile?.name || "IPAC"}
								</div>
							)}
						</div>

						{/* Center: title */}
						<div style={{ textAlign: "center", flex: 1, padding: "0 16px" }}>
							<div
								style={{
									fontSize: HEADER_FONT_MAP[display.font_size],
									fontWeight: 800,
									color: tc,
									letterSpacing: 2,
									textTransform: "uppercase",
								}}
							>
								{groupLabel
									? `${headerData.reportName || "Client Report"}`
									: headerData.reportName || "Client Report"}
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
																	{item.item_num || "—"}
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
																	{item.item_name || "—"}
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
							</div>
						))
					)}
				</div>

				{/* ─── Footer ─────────────────────────────── */}
				<div style={{ flexShrink: 0, marginTop: 10 }}>
					{display.include_signatures && (
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
