const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'PackingListPage.tsx');
if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let src = fs.readFileSync(file, 'utf8');

const startMarker = `items.map((inst) => (`;
const endMarker = `\t\t\t\t\t\t))\n\t\t\t\t\t)}`;

const startIndex = src.indexOf(startMarker);
if (startIndex === -1) {
  console.error("Start marker not found!");
  process.exit(1);
}

const endIndex = src.indexOf(endMarker, startIndex);
if (endIndex === -1) {
  console.error("End marker not found!");
  process.exit(1);
}

// Extract content to verify it looks correct
const oldContent = src.substring(startIndex, endIndex + endMarker.length);
console.log("Found target content, length:", oldContent.length);

const newContent = `pkg.box_display_mode === "compact" ? (
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
											<th style={{ padding: "6px 8px", textAlign: "left", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>Line #</th>
										)}
										{pkg.show_box_number && (
											<th style={{ padding: "6px 8px", textAlign: "left", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>Box #</th>
										)}
										{pkg.show_ipac_reference && (
											<th style={{ padding: "6px 8px", textAlign: "left", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>IPAC Ref</th>
										)}
										{pkg.show_quantity && (
											<th style={{ padding: "6px 8px", textAlign: "center", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>Qty</th>
										)}
										{pkg.show_internal_dims && (
											<th style={{ padding: "6px 8px", textAlign: "left", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>Int Dims (mm)</th>
										)}
										{pkg.show_external_dims && (
											<th style={{ padding: "6px 8px", textAlign: "left", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>Ext Dims (cm)</th>
										)}
										{pkg.show_net_weight && (
											<th style={{ padding: "6px 8px", textAlign: "right", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>NW (kg)</th>
										)}
										{pkg.show_gross_weight && (
											<th style={{ padding: "6px 8px", textAlign: "right", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>GW (kg)</th>
										)}
										{pkg.show_unit_m3 && (
											<th style={{ padding: "6px 8px", textAlign: "right", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>Unit m³</th>
										)}
										{pkg.show_total_m3 && (
											<th style={{ padding: "6px 8px", textAlign: "right", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>Total m³</th>
										)}
										{pkg.show_unit_m2 && (
											<th style={{ padding: "6px 8px", textAlign: "right", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>Unit m²</th>
										)}
										{pkg.show_total_m2 && (
											<th style={{ padding: "6px 8px", textAlign: "right", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>Total m²</th>
										)}
										{pkg.show_sei && (
											<th style={{ padding: "6px 8px", textAlign: "left", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>SEI</th>
										)}
										{pkg.show_qr_code && (
											<th style={{ padding: "6px 8px", textAlign: "center", fontSize: 9.5, borderBottom: "1px solid #d8e4f0" }}>QR</th>
										)}
									</tr>
								</thead>
								<tbody>
									{items.map((inst, idx) => {
										const globalIndex = allInstances ? allInstances.findIndex((x) => x.id === inst.id) : -1;
										const globalLineNumber = globalIndex !== -1 ? globalIndex + 1 : undefined;

										const extL = inst.external_length ?? 0;
										const extW = inst.external_width ?? 0;
										const extH = inst.external_height ?? 0;
										const unitM3 = (extL * extW * extH) / 1e9;
										const totalM3 = unitM3;

										const unitM2 = (extL * extW) / 1e6;
										const totalM2 = unitM2;

										const intDims = inst.internal_length || inst.internal_width || inst.internal_height
											? \`\${inst.internal_length ?? 0}×\${inst.internal_width ?? 0}×\${inst.internal_height ?? 0}\`
											: "—";

										const extDims = inst.external_length || inst.external_width || inst.external_height
											? \`\${(inst.external_length ?? 0) / 10}×\${(inst.external_width ?? 0) / 10}×\${(inst.external_height ?? 0) / 10}\`
											: "—";

										const rowBg = pkg.table_alternating_rows && idx % 2 === 1
											? pkg.table_alternating_color
											: "transparent";

										return (
											<tr key={inst.id} style={{ background: rowBg }}>
												{pkg.show_line_number && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef" }}>{globalLineNumber ?? "—"}</td>
												)}
												{pkg.show_box_number && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef", fontWeight: 600 }}>
														Box {inst.package_number}
														{inst.instance_number > 1 ? \`.\${inst.instance_number}\` : ""}
													</td>
												)}
												{pkg.show_ipac_reference && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef" }}>{inst.ipac_reference ?? "—"}</td>
												)}
												{pkg.show_quantity && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef", textAlign: "center" }}>
														{inst.package_qty ?? "—"}
													</td>
												)}
												{pkg.show_internal_dims && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef" }}>{intDims}</td>
												)}
												{pkg.show_external_dims && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef" }}>{extDims}</td>
												)}
												{pkg.show_net_weight && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef", textAlign: "right" }}>
														{inst.net_weight !== null && inst.net_weight !== undefined ? inst.net_weight.toFixed(1) : "—"}
													</td>
												)}
												{pkg.show_gross_weight && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef", textAlign: "right" }}>
														{inst.gross_weight !== null && inst.gross_weight !== undefined ? inst.gross_weight.toFixed(1) : "—"}
													</td>
												)}
												{pkg.show_unit_m3 && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef", textAlign: "right" }}>
														{unitM3 > 0 ? unitM3.toFixed(3) : "—"}
													</td>
												)}
												{pkg.show_total_m3 && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef", textAlign: "right" }}>
														{totalM3 > 0 ? totalM3.toFixed(3) : "—"}
													</td>
												)}
												{pkg.show_unit_m2 && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef", textAlign: "right" }}>
														{unitM2 > 0 ? unitM2.toFixed(2) : "—"}
													</td>
												)}
												{pkg.show_total_m2 && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef", textAlign: "right" }}>
														{totalM2 > 0 ? totalM2.toFixed(2) : "—"}
													</td>
												)}
												{pkg.show_sei && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef" }}>
														{inst.sei_category ? \`SEI \${inst.sei_category}\${inst.sei_protection ? \` (\${inst.sei_protection})\` : ""}\` : "—"}
													</td>
												)}
												{pkg.show_qr_code && (
													<td style={{ padding: "4px 8px", borderBottom: "1px solid #eef", textAlign: "center" }}>
														{inst.qr_token ? (
															<img
																src={\`https://api.qrserver.com/v1/create-qr-code/?size=30x30&data=\${encodeURIComponent(inst.qr_token)}\`}
																alt="QR"
																style={{ width: 20, height: 20, display: "inline-block" }}
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
								const globalIndex = allInstances ? allInstances.findIndex((x) => x.id === inst.id) : -1;
								const globalLineNumber = globalIndex !== -1 ? globalIndex + 1 : undefined;

								return (
									<div
										key={inst.id}
										style={{
											border: \`1px solid #d8e4f0\`,
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
												borderBottom: \`2px solid \${tc}\`,
												padding: "6px 10px",
												display: "flex",
												justifyContent: "space-between",
												alignItems: "flex-start",
											}}
										>
											<div>
												<div style={{ fontWeight: 700, fontSize: 13, color: tc }}>
													{pkg.show_line_number && (
														<span style={{ marginRight: 6, opacity: 0.7 }}>
															#\${globalLineNumber}
														</span>
													)}
													{pkg.show_box_number !== false && (
														<>
															Box {inst.package_number}
															{inst.instance_number > 1
																? \` — Instance \${inst.instance_number}\`
																: ""}
														</>
													)}
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
											{pkg.show_qr_code && inst.qr_token && (
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
													<img
														src={\`https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=\${encodeURIComponent(inst.qr_token)}\`}
														alt="QR"
														style={{ width: 38, height: 38 }}
													/>
												</div>
											)}
										</div>

										{/* Meta row */}
										{(pkg.show_item_count_summary ||
											pkg.show_last_packed_date ||
											pkg.show_status ||
											pkg.show_quantity ||
											pkg.show_internal_dims ||
											pkg.show_external_dims ||
											pkg.show_net_weight ||
											pkg.show_gross_weight ||
											pkg.show_unit_m3 ||
											pkg.show_total_m3 ||
											pkg.show_unit_m2 ||
											pkg.show_total_m2 ||
											pkg.show_sei) && (
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
												{pkg.show_status && (
													<span>
														Status:{" "}
														<strong style={{ textTransform: "capitalize" }}>
															{inst.status}
														</strong>
													</span>
												)}
												{pkg.show_quantity && inst.package_qty !== null && inst.package_qty !== undefined && (
													<span>
														Qty: <strong>{inst.package_qty}</strong>
													</span>
												)}
												{pkg.show_internal_dims && (inst.internal_length || inst.internal_width || inst.internal_height) && (
													<span>
														Int Dims: <strong>{inst.internal_length ?? 0}×{inst.internal_width ?? 0}×{inst.internal_height ?? 0} mm</strong>
													</span>
												)}
												{pkg.show_external_dims && (inst.external_length || inst.external_width || inst.external_height) && (
													<span>
														Dims: <strong>{((inst.external_length ?? 0) / 10).toFixed(1)}×{((inst.external_width ?? 0) / 10).toFixed(1)}×{((inst.external_height ?? 0) / 10).toFixed(1)} cm</strong>
													</span>
												)}
												{pkg.show_net_weight && inst.net_weight !== null && inst.net_weight !== undefined && (
													<span>
														NW: <strong>{inst.net_weight.toFixed(1)} kg</strong>
													</span>
												)}
												{pkg.show_gross_weight && inst.gross_weight !== null && inst.gross_weight !== undefined && (
													<span>
														GW: <strong>{inst.gross_weight.toFixed(1)} kg</strong>
													</span>
												)}
												{pkg.show_unit_m3 && (
													<span>
														Unit m³: <strong>{(((inst.external_length ?? 0) * (inst.external_width ?? 0) * (inst.external_height ?? 0)) / 1e9).toFixed(3)}</strong>
													</span>
												)}
												{pkg.show_total_m3 && (
													<span>
														Total m³: <strong>{(((inst.external_length ?? 0) * (inst.external_width ?? 0) * (inst.external_height ?? 0)) / 1e9).toFixed(3)}</strong>
													</span>
												)}
												{pkg.show_unit_m2 && (
													<span>
														Unit m²: <strong>{(((inst.external_length ?? 0) * (inst.external_width ?? 0)) / 1e6).toFixed(2)}</strong>
													</span>
												)}
												{pkg.show_total_m2 && (
													<span>
														Total m²: <strong>{(((inst.external_length ?? 0) * (inst.external_width ?? 0)) / 1e6).toFixed(2)}</strong>
													</span>
												)}
												{pkg.show_sei && inst.sei_category && (
													<span>
														SEI: <strong>{inst.sei_category}{inst.sei_protection ? \` (\${inst.sei_protection})\` : ""}</strong>
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
														{inst.item_count} item{inst.item_count !== 1 ? "s" : ""} packed
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
																			borderBottom: "1px solid #ddd",
																			width: "40px",
																		}}
																	>
																		Line
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
																			borderBottom: "1px solid #ddd",
																			width: "100px",
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
																			borderBottom: "1px solid #ddd",
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
																			borderBottom: "1px solid #ddd",
																			width: "60px",
																		}}
																	>
																		Qty
																	</th>
																)}
															</tr>
														</thead>
														<tbody>
															{inst.pkd_items.map((item, idx) => (
																<tr
																	key={item.id}
																	style={{
																		background:
																			pkg.table_alternating_rows && idx % 2 === 1
																				? pkg.table_alternating_color
																				: "transparent",
																	}}
																>
																	{pkg.show_line_num_col && (
																		<td
																			style={{
																				padding: "2.5px 8px",
																				color: "#666",
																				fontSize: 9,
																			}}
																		>
																			{(inst.line_offset ?? 0) + idx + 1}
																		</td>
																	)}
																	{pkg.show_item_num_col && (
																		<td
																			style={{
																				padding: "2.5px 8px",
																				color: "#222",
																				fontWeight: 500,
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
														const sigKey = \`sig-box-\${inst.id}-\${i}\`;
														return (
															<div
																key={sigKey}
																style={{ flex: 1, textAlign: "center" }}
															>
																{(() => {
																	const _m = sig.image_id ? signatures.find((s) => s.id === sig.image_id) : undefined;
																	return _m ? (
																		<div style={{ display: "flex", justifyContent: display.signature_align ?? "center" }}>
																		<img src={getSignatureUrl(_m.image_path)} alt={_m.label} style={{ height: display.signature_height_px ?? 30, width: \`\${display.signature_width_pct ?? 80}%\`, objectFit: "contain", marginBottom: 3 }} />
																	</div>
																	) : (
																		<div style={{ borderBottom: "1px solid #aaa", height: display.signature_height_px ?? 30, marginBottom: 3 }} />
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
						)}`;

src = src.substring(0, startIndex) + newContent + src.substring(endIndex + endMarker.length);
fs.writeFileSync(file, src, 'utf8');
console.log("Successfully patched PackingListPage.tsx!");
