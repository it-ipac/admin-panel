import type React from "react";
import { useState } from "react";
import { getSignatureUrl, useSignatures } from "../hooks/useSignatures";
import type {
	ReportDisplaySettings,
	ReportPkgDetailsSettings,
} from "../settings-defaults";
import { SignaturePickerModal } from "./SignaturePickerModal";

interface AppearancePanelProps {
	display: ReportDisplaySettings;
	setDisplay: React.Dispatch<React.SetStateAction<ReportDisplaySettings>>;
	pkgDetails: ReportPkgDetailsSettings;
	setPkgDetails: React.Dispatch<React.SetStateAction<ReportPkgDetailsSettings>>;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
	title,
	children,
}) => (
	<div className="flex flex-col gap-2 pt-3">
		<div className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b pb-1">
			{title}
		</div>
		{children}
	</div>
);

const Toggle: React.FC<{
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
	disabled?: boolean;
}> = ({ label, checked, onChange, disabled }) => (
	<label
		className={`flex items-center gap-2 text-sm text-gray-700 cursor-pointer ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
	>
		<input
			type="checkbox"
			checked={checked}
			disabled={disabled}
			onChange={(e) => onChange(e.target.checked)}
		/>
		{label}
	</label>
);

export const AppearancePanel: React.FC<AppearancePanelProps> = ({
	display,
	setDisplay,
	pkgDetails,
	setPkgDetails,
}) => {
	const setD = (key: keyof ReportDisplaySettings, val: any) =>
		setDisplay((p) => ({ ...p, [key]: val }));
	const setP = (key: keyof ReportPkgDetailsSettings, val: any) =>
		setPkgDetails((p) => ({ ...p, [key]: val }));

	// Index of the signature field whose picker is open, or null
	const [pickerOpenIndex, setPickerOpenIndex] = useState<number | null>(null);
	const { query: sigsQuery } = useSignatures();
	const allSigs = sigsQuery.data ?? [];

	return (
		<>
			<div className="flex flex-col gap-1 text-sm">
				<Section title="Layout">
					<div className="flex gap-2">
						{(["portrait", "landscape"] as const).map((o) => (
							<button
								key={o}
								type="button"
								onClick={() => setD("orientation", o)}
								className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors capitalize ${display.orientation === o ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
							>
								{o === "portrait" ? "📄 Portrait" : "📄 Landscape"}
							</button>
						))}
					</div>
					<div className="flex flex-col gap-1">
						<label htmlFor="font-size" className="text-xs text-gray-500">
							Font Size Preset
						</label>
						<select
							id="font-size"
							className="border rounded p-1.5 text-sm bg-white"
							value={display.font_size}
							onChange={(e) => setD("font_size", e.target.value)}
						>
							<option value="small">Small</option>
							<option value="medium">Medium (default)</option>
							<option value="large">Large</option>
						</select>
					</div>
					<div className="flex flex-col gap-1 mt-1">
						<div className="flex justify-between items-center">
							<label
								htmlFor="font-size-px-slider"
								className="text-xs text-gray-500"
							>
								Text Font Size
							</label>
							<span className="text-xs font-semibold text-gray-700">
								{display.font_size_px ?? 12}px
							</span>
						</div>
						<input
							id="font-size-px-slider"
							type="range"
							min="8"
							max="20"
							step="1"
							value={display.font_size_px ?? 12}
							onChange={(e) =>
								setD("font_size_px", parseInt(e.target.value, 10))
							}
							className="w-full cursor-pointer accent-blue-600"
						/>
					</div>
					<div className="flex flex-col gap-1 mt-1">
						<div className="flex justify-between items-center">
							<label
								htmlFor="logo-size-slider"
								className="text-xs text-gray-500"
							>
								Logo Size (Height)
							</label>
							<span className="text-xs font-semibold text-gray-700">
								{display.logo_size ?? 90}px
							</span>
						</div>
						<input
							id="logo-size-slider"
							type="range"
							min="40"
							max="250"
							step="5"
							value={display.logo_size ?? 90}
							onChange={(e) => setD("logo_size", parseInt(e.target.value, 10))}
							className="w-full cursor-pointer accent-blue-600"
						/>
					</div>
					<div className="flex flex-col gap-1 mt-1">
						<div className="flex justify-between items-center">
							<label
								htmlFor="header-top-margin-slider"
								className="text-xs text-gray-500"
							>
								Header Top Margin
							</label>
							<span className="text-xs font-semibold text-gray-700">
								{display.header_top_margin ?? 20}mm
							</span>
						</div>
						<input
							id="header-top-margin-slider"
							type="range"
							min="0"
							max="50"
							step="1"
							value={display.header_top_margin ?? 20}
							onChange={(e) =>
								setD("header_top_margin", parseInt(e.target.value, 10))
							}
							className="w-full cursor-pointer accent-blue-600"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label htmlFor="header-layout" className="text-xs text-gray-500">
							Header Layout
						</label>
						<select
							id="header-layout"
							className="border rounded p-1.5 text-sm bg-white"
							value={display.header_layout}
							onChange={(e) => setD("header_layout", e.target.value)}
						>
							<option value="compact">Compact</option>
							<option value="standard">Standard</option>
							<option value="expanded">Expanded</option>
						</select>
					</div>
					<div className="flex flex-col gap-1">
						<label htmlFor="header-show-mode" className="text-xs text-gray-500">
							Page Header Visibility
						</label>
						<select
							id="header-show-mode"
							className="border rounded p-1.5 text-sm bg-white"
							value={display.header_show_mode ?? "all_pages"}
							onChange={(e) => setD("header_show_mode", e.target.value as any)}
						>
							<option value="all_pages">Show on All Pages</option>
							<option value="first_page_only">First Page / Cover Only</option>
						</select>
					</div>
					<div className="pt-2">
						<Toggle
							label="Enable Rich Text (Superscript/Subscript)"
							checked={display.enable_formatting}
							onChange={(v) => setD("enable_formatting", v)}
						/>
					</div>
				</Section>

				<Section title="Branding">
					<Toggle
						label="Show Company Logo"
						checked={display.show_company_logo}
						onChange={(v) => setD("show_company_logo", v)}
					/>
					<Toggle
						label="Show Company Name"
						checked={display.show_company_name}
						onChange={(v) => setD("show_company_name", v)}
					/>
					<div className="flex gap-2 items-center">
						<label
							htmlFor="theme-color-picker"
							className="text-xs text-gray-500 w-24"
						>
							Theme Color
						</label>
						<input
							id="theme-color-picker"
							type="color"
							className="w-8 h-7 cursor-pointer rounded"
							value={display.theme_color}
							onChange={(e) => setD("theme_color", e.target.value)}
						/>
						<span className="text-xs font-mono text-gray-500">
							{display.theme_color}
						</span>
					</div>
					<div className="flex gap-2 items-center">
						<label
							htmlFor="accent-color-picker"
							className="text-xs text-gray-500 w-24"
						>
							Accent / Row Color
						</label>
						<input
							id="accent-color-picker"
							type="color"
							className="w-8 h-7 cursor-pointer rounded"
							value={display.accent_color}
							onChange={(e) => setD("accent_color", e.target.value)}
						/>
						<span className="text-xs font-mono text-gray-500">
							{display.accent_color}
						</span>
					</div>
				</Section>

				<Section title="Header Fields">
					<Toggle
						label="Report Number"
						checked={display.show_report_number}
						onChange={(v) => setD("show_report_number", v)}
					/>
					<Toggle
						label="Report Date"
						checked={display.show_report_date}
						onChange={(v) => setD("show_report_date", v)}
					/>
					<Toggle
						label="Project Reference"
						checked={display.show_project_reference}
						onChange={(v) => setD("show_project_reference", v)}
					/>
					<Toggle
						label="Final Destination Country"
						checked={display.show_destination_country}
						onChange={(v) => setD("show_destination_country", v)}
					/>
					<Toggle
						label="QR Codes on Boxes"
						checked={pkgDetails.show_qr_code}
						onChange={(v) => setP("show_qr_code", v)}
					/>
				</Section>

				<Section title="Footer">
					<Toggle
						label="Page Numbers"
						checked={display.show_page_numbers}
						onChange={(v) => setD("show_page_numbers", v)}
					/>
					<Toggle
						label="Signature Blocks"
						checked={display.include_signatures}
						onChange={(v) => setD("include_signatures", v)}
					/>
					{display.include_signatures && (
						<>
							<div className="flex flex-col gap-1 pl-4 mb-2">
								<label
									htmlFor="signatures-scope"
									className="text-xs text-gray-500 font-medium"
								>
									Placement / Scope
								</label>
								<select
									id="signatures-scope"
									className="border rounded p-1.5 text-sm bg-white cursor-pointer"
									value={display.signatures_scope ?? "project"}
									onChange={(e) =>
										setD("signatures_scope", e.target.value as any)
									}
								>
									<option value="project">
										Project Scoped (Once at the end)
									</option>
									<option value="box">
										Box Scoped (Under each completed box)
									</option>
								</select>
							</div>
							<div className="pl-4 flex flex-col gap-2 mb-2">
								<span className="text-xs text-gray-500 font-medium">
									Signature Fields
								</span>
								{display.signature_fields.map((sig, i) => {
									const assignedSig = sig.image_id
										? allSigs.find((s) => s.id === sig.image_id)
										: undefined;
									return (
										<div key={`sig-field-${i}`} className="flex flex-col gap-1">
											<input
												type="text"
												value={sig.label}
												onChange={(e) => {
													const updated = [...display.signature_fields];
													updated[i] = { ...updated[i], label: e.target.value };
													setD("signature_fields", updated);
												}}
												className="border rounded px-2 py-1 text-xs"
												placeholder={`Signature ${i + 1} label`}
											/>
											<div className="flex items-center gap-2">
												{assignedSig ? (
													<img
														src={getSignatureUrl(assignedSig.image_path)}
														alt={assignedSig.label}
														style={{
															height: 26,
															maxWidth: 90,
															objectFit: "contain",
															border: "1px solid #e2e8f0",
															borderRadius: 4,
															background: "#f8fafc",
															padding: 2,
														}}
													/>
												) : (
													<span className="text-xs text-gray-400 italic">
														No image
													</span>
												)}
												<button
													type="button"
													onClick={() => setPickerOpenIndex(i)}
													className="text-xs px-2 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-600"
												>
													{assignedSig ? "Change…" : "Choose…"}
												</button>
												{sig.image_id && (
													<button
														type="button"
														onClick={() => {
															const updated = [...display.signature_fields];
															updated[i] = { ...updated[i], image_id: null };
															setD("signature_fields", updated);
														}}
														className="text-xs text-red-400 hover:text-red-600"
													>
														×
													</button>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</>
					)}
					<div className="flex flex-col gap-1">
						<label htmlFor="footer-text" className="text-xs text-gray-500">
							Footer Text (optional)
						</label>
						<input
							id="footer-text"
							type="text"
							value={display.footer_text || ""}
							onChange={(e) => setD("footer_text", e.target.value || null)}
							className="border rounded px-2 py-1 text-sm"
							placeholder="e.g. Confidential — IPAC"
						/>
					</div>
					<div className="flex flex-col gap-1 mt-1">
						<div className="flex justify-between items-center">
							<label
								htmlFor="footer-height-slider"
								className="text-xs text-gray-500"
							>
								Footer Height
							</label>
							<span className="text-xs font-semibold text-gray-700">
								{display.footer_height_px ?? 40}px
							</span>
						</div>
						<input
							id="footer-height-slider"
							type="range"
							min="20"
							max="120"
							step="5"
							value={display.footer_height_px ?? 40}
							onChange={(e) =>
								setD("footer_height_px", parseInt(e.target.value, 10))
							}
							className="w-full cursor-pointer accent-blue-600"
						/>
					</div>
					<div className="flex flex-col gap-1 mt-1">
						<div className="flex justify-between items-center">
							<label
								htmlFor="signature-height-slider"
								className="text-xs text-gray-500"
							>
								Signature Line Height
							</label>
							<span className="text-xs font-semibold text-gray-700">
								{display.signature_height_px ?? 30}px
							</span>
						</div>
						<input
							id="signature-height-slider"
							type="range"
							min="15"
							max="80"
							step="5"
							value={display.signature_height_px ?? 30}
							onChange={(e) =>
								setD("signature_height_px", parseInt(e.target.value, 10))
							}
							className="w-full cursor-pointer accent-blue-600"
						/>
					</div>
					<div className="flex flex-col gap-1 mt-1">
						<div className="flex justify-between items-center">
							<label className="text-xs text-gray-500">
								Signature Image Width
							</label>
							<span className="text-xs font-semibold text-gray-700">
								{display.signature_width_pct ?? 80}%
							</span>
						</div>
						<input
							type="range"
							min="20"
							max="100"
							step="5"
							value={display.signature_width_pct ?? 80}
							onChange={(e) =>
								setD("signature_width_pct", parseInt(e.target.value, 10))
							}
							className="w-full cursor-pointer accent-blue-600"
						/>
					</div>
					<div className="flex flex-col gap-1 mt-1">
						<label className="text-xs text-gray-500">Signature Alignment</label>
						<div className="flex gap-1">
							{(["left", "center", "right"] as const).map((a) => (
								<button
									key={a}
									type="button"
									onClick={() => setD("signature_align", a)}
									className={`flex-1 py-0.5 text-xs border rounded capitalize ${(display.signature_align ?? "center") === a ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
								>
									{a}
								</button>
							))}
						</div>
					</div>
					<div className="flex flex-col gap-1 mt-1">
						<div className="flex justify-between items-center">
							<label
								htmlFor="footer-gap-slider"
								className="text-xs text-gray-500"
							>
								Space Above Footer
							</label>
							<span className="text-xs font-semibold text-gray-700">
								{display.footer_body_gap_px ?? 0}px
							</span>
						</div>
						<input
							id="footer-gap-slider"
							type="range"
							min="0"
							max="200"
							step="10"
							value={display.footer_body_gap_px ?? 0}
							onChange={(e) =>
								setD("footer_body_gap_px", parseInt(e.target.value, 10))
							}
							className="w-full cursor-pointer accent-blue-600"
						/>
					</div>
				</Section>

				<Section title="Box Card">
					<div className="flex flex-col gap-1">
						<label htmlFor="box-display-mode" className="text-xs text-gray-500">
							Box Display Mode
						</label>
						<select
							id="box-display-mode"
							className="border rounded p-1.5 text-sm bg-white"
							value={pkgDetails.box_display_mode ?? "detailed"}
							onChange={(e) => {
								const val = e.target.value as "compact" | "detailed";
								setP("box_display_mode", val);
								setP("box_header_style", val);
							}}
						>
							<option value="compact">
								Compact (One line per box, no items)
							</option>
							<option value="detailed">
								Detailed (Card layout with items)
							</option>
						</select>
					</div>
					<div className="flex flex-col gap-1 mt-1">
						<label htmlFor="boxes-sort" className="text-xs text-gray-500">
							Sort Boxes By
						</label>
						<select
							id="boxes-sort"
							className="border rounded p-1.5 text-sm bg-white"
							value={pkgDetails.boxes_sort || "number"}
							onChange={(e) => setP("boxes_sort", e.target.value)}
						>
							<option value="number">Box Number (Ascending)</option>
							<option value="packed_date">
								Packed Date (Most Recent First)
							</option>
						</select>
					</div>

					<div className="mt-3 border rounded-lg p-2.5 bg-gray-50/50">
						<div className="text-xs font-semibold text-gray-700 mb-2">
							Line 1 Options (Compact & Detailed)
						</div>
						<div className="grid grid-cols-1 gap-1.5">
							<Toggle
								label="Line Number"
								checked={pkgDetails.show_line_number}
								onChange={(v) => setP("show_line_number", v)}
							/>
							<Toggle
								label="Box Number"
								checked={pkgDetails.show_box_number}
								onChange={(v) => setP("show_box_number", v)}
							/>
							<Toggle
								label="Quantity"
								checked={pkgDetails.show_quantity}
								onChange={(v) => setP("show_quantity", v)}
							/>
							<Toggle
								label="Internal Dimensions"
								checked={pkgDetails.show_internal_dims}
								onChange={(v) => setP("show_internal_dims", v)}
							/>
							<Toggle
								label="External Dimensions"
								checked={pkgDetails.show_external_dims}
								onChange={(v) => setP("show_external_dims", v)}
							/>
							<Toggle
								label="Tare"
								checked={pkgDetails.show_tare}
								onChange={(v) => setP("show_tare", v)}
							/>
							<Toggle
								label="Net Weight (N.W.)"
								checked={pkgDetails.show_net_weight}
								onChange={(v) => setP("show_net_weight", v)}
							/>
							<Toggle
								label="Gross Weight (G.W.)"
								checked={pkgDetails.show_gross_weight}
								onChange={(v) => setP("show_gross_weight", v)}
							/>
							<Toggle
								label="Unit m³"
								checked={pkgDetails.show_unit_m3}
								onChange={(v) => setP("show_unit_m3", v)}
							/>
							<Toggle
								label="Total m³"
								checked={pkgDetails.show_total_m3}
								onChange={(v) => setP("show_total_m3", v)}
							/>
							<Toggle
								label="Unit m²"
								checked={pkgDetails.show_unit_m2}
								onChange={(v) => setP("show_unit_m2", v)}
							/>
							<Toggle
								label="Total m²"
								checked={pkgDetails.show_total_m2}
								onChange={(v) => setP("show_total_m2", v)}
							/>
							<Toggle
								label="SEI Info"
								checked={pkgDetails.show_sei}
								onChange={(v) => setP("show_sei", v)}
							/>
							<Toggle
								label="IPAC Reference"
								checked={pkgDetails.show_ipac_reference}
								onChange={(v) => setP("show_ipac_reference", v)}
							/>
							<Toggle
								label="QR Code"
								checked={pkgDetails.show_qr_code}
								onChange={(v) => setP("show_qr_code", v)}
							/>
							<Toggle
								label="Client Reference"
								checked={pkgDetails.show_client_reference}
								onChange={(v) => setP("show_client_reference", v)}
							/>
							<Toggle
								label="Order Name"
								checked={pkgDetails.show_order_name}
								onChange={(v) => setP("show_order_name", v)}
							/>
							<Toggle
								label="Destination"
								checked={pkgDetails.show_destination}
								onChange={(v) => setP("show_destination", v)}
							/>
							<Toggle
								label="Status"
								checked={pkgDetails.show_status}
								onChange={(v) => setP("show_status", v)}
							/>
						</div>
					</div>

					<div
						className={`mt-2 border rounded-lg p-2.5 bg-gray-50/50 transition-opacity ${pkgDetails.box_display_mode === "compact" ? "opacity-40 pointer-events-none" : ""}`}
					>
						<div className="text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
							<span>Line 2 Options (Detailed Only)</span>
							{pkgDetails.box_display_mode === "compact" && (
								<span className="text-[10px] text-amber-600 font-normal">
									Requires Detailed Mode
								</span>
							)}
						</div>
						<div className="grid grid-cols-1 gap-1.5">
							<Toggle
								label="Total Qty of Items"
								checked={pkgDetails.show_total_qty_items}
								onChange={(v) => setP("show_total_qty_items", v)}
							/>
							<Toggle
								label="Last Packed Date"
								checked={pkgDetails.show_last_packed_date}
								onChange={(v) => setP("show_last_packed_date", v)}
							/>
							<Toggle
								label="Type of Box"
								checked={pkgDetails.show_box_type}
								onChange={(v) => setP("show_box_type", v)}
							/>
						</div>
					</div>

					<div
						className={`mt-2 border rounded-lg p-2.5 bg-gray-50/50 transition-opacity ${pkgDetails.box_display_mode === "compact" ? "opacity-40 pointer-events-none" : ""}`}
					>
						<div className="text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
							<span>Line 3 Options (Detailed Only)</span>
							{pkgDetails.box_display_mode === "compact" && (
								<span className="text-[10px] text-amber-600 font-normal">
									Requires Detailed Mode
								</span>
							)}
						</div>
						<div className="grid grid-cols-1 gap-1.5">
							<Toggle
								label="Box Pictures"
								checked={pkgDetails.show_box_photos}
								onChange={(v) => setP("show_box_photos", v)}
							/>
							<Toggle
								label="Include Packed Item Pictures"
								checked={pkgDetails.include_item_photos_in_box_photos}
								disabled={!pkgDetails.show_box_photos}
								onChange={(v) => setP("include_item_photos_in_box_photos", v)}
							/>
						</div>
					</div>
				</Section>

				<Section title="Items Card">
					<Toggle
						label="Show Items"
						checked={pkgDetails.show_items}
						onChange={(v) => setP("show_items", v)}
					/>
					{pkgDetails.show_items && (
						<>
							<div className="flex flex-col gap-1 pl-2">
								<label
									htmlFor="item-detail-level-select"
									className="text-xs text-gray-500"
								>
									Detail Level
								</label>
								<select
									id="item-detail-level-select"
									className="border rounded p-1.5 text-sm bg-white"
									value={pkgDetails.items_detail_level}
									onChange={(e) => setP("items_detail_level", e.target.value)}
								>
									<option value="summary">Summary (count only)</option>
									<option value="compact">Compact Card</option>
									<option value="detailed">Detailed Card</option>
								</select>
							</div>

							{pkgDetails.items_detail_level !== "summary" && (
								<div className="pl-2 flex flex-col gap-1.5 mt-2">
									<div className="flex flex-col gap-1">
										<label
											htmlFor="items-sort"
											className="text-xs text-gray-500"
										>
											Sort Items By
										</label>
										<select
											id="items-sort"
											className="border rounded p-1.5 text-sm bg-white"
											value={pkgDetails.items_sort}
											onChange={(e) => setP("items_sort", e.target.value)}
										>
											<option value="item_num">Item Number</option>
											<option value="description">Description</option>
										</select>
									</div>

									<div className="mt-2 border rounded-lg p-2.5 bg-gray-50/50">
										<div className="text-xs font-semibold text-gray-700 mb-1.5">
											Line 1 Options (Compact & Detailed)
										</div>
										<div className="grid grid-cols-1 gap-1.5">
											<Toggle
												label="Line Number"
												checked={pkgDetails.show_line_num_col}
												onChange={(v) => setP("show_line_num_col", v)}
											/>
											<Toggle
												label="Quantity"
												checked={pkgDetails.show_qty_col}
												onChange={(v) => setP("show_qty_col", v)}
											/>
											<Toggle
												label="Item # / Reference"
												checked={pkgDetails.show_item_num_col}
												onChange={(v) => setP("show_item_num_col", v)}
											/>
											<Toggle
												label="Description"
												checked={pkgDetails.show_description_col}
												onChange={(v) => setP("show_description_col", v)}
											/>
										</div>
									</div>

									<div
										className={`mt-2 border rounded-lg p-2.5 bg-gray-50/50 transition-opacity ${pkgDetails.items_detail_level !== "detailed" ? "opacity-40 pointer-events-none" : ""}`}
									>
										<div className="text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
											<span>Line 2 Options (Detailed Only)</span>
											{pkgDetails.items_detail_level !== "detailed" && (
												<span className="text-[10px] text-amber-600 font-normal">
													Requires Detailed Card
												</span>
											)}
										</div>
										<div className="grid grid-cols-1 gap-1.5">
											<Toggle
												label="All Additional Info (Dims, Net Weight)"
												checked={pkgDetails.show_item_additional_info}
												onChange={(v) => setP("show_item_additional_info", v)}
											/>
										</div>
									</div>

									<div
										className={`mt-2 border rounded-lg p-2.5 bg-gray-50/50 transition-opacity ${pkgDetails.items_detail_level !== "detailed" ? "opacity-40 pointer-events-none" : ""}`}
									>
										<div className="text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
											<span>Line 3 Options (Detailed Only)</span>
											{pkgDetails.items_detail_level !== "detailed" && (
												<span className="text-[10px] text-amber-600 font-normal">
													Requires Detailed Card
												</span>
											)}
										</div>
										<div className="grid grid-cols-1 gap-1.5">
											<Toggle
												label="QR Code"
												checked={pkgDetails.show_item_qr_code}
												onChange={(v) => setP("show_item_qr_code", v)}
											/>
											<Toggle
												label="Item Pictures"
												checked={pkgDetails.show_item_photos}
												onChange={(v) => setP("show_item_photos", v)}
											/>
										</div>
									</div>
								</div>
							)}
						</>
					)}
				</Section>
			</div>
			{pickerOpenIndex !== null && (
				<SignaturePickerModal
					selectedId={display.signature_fields[pickerOpenIndex]?.image_id}
					onSelect={(sig) => {
						const updated = [...display.signature_fields];
						updated[pickerOpenIndex] = {
							...updated[pickerOpenIndex],
							image_id: sig?.id ?? null,
						};
						setD("signature_fields", updated);
						setPickerOpenIndex(null);
					}}
					onClose={() => setPickerOpenIndex(null)}
				/>
			)}
		</>
	);
};
