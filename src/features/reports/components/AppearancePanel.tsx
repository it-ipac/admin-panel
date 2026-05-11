import type React from "react";
import type {
	ReportDisplaySettings,
	ReportPkgDetailsSettings,
} from "../settings-defaults";

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
}> = ({ label, checked, onChange }) => (
	<label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
		<input
			type="checkbox"
			checked={checked}
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

	return (
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
						Font Size
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
					checked={display.show_qr_codes}
					onChange={(v) => setD("show_qr_codes", v)}
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
					<div className="pl-4 flex flex-col gap-1">
						{display.signature_fields.map((sig, i) => {
							const sigKey = `sig-input-${i}`;
							return (
								<input
									key={sigKey}
									type="text"
									value={sig.label}
									onChange={(e) => {
										const updated = [...display.signature_fields];
										updated[i] = { label: e.target.value };
										setD("signature_fields", updated);
									}}
									className="border rounded px-2 py-1 text-xs"
									placeholder={`Signature ${i + 1} label`}
								/>
							);
						})}
					</div>
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
			</Section>

			<Section title="Box Card">
				<div className="flex flex-col gap-1">
					<label htmlFor="box-header-style" className="text-xs text-gray-500">
						Box Header Style
					</label>
					<select
						id="box-header-style"
						className="border rounded p-1.5 text-sm bg-white"
						value={pkgDetails.box_header_style}
						onChange={(e) => setP("box_header_style", e.target.value)}
					>
						<option value="compact">Compact</option>
						<option value="detailed">Detailed</option>
					</select>
				</div>
				<Toggle
					label="IPAC Reference"
					checked={pkgDetails.show_ipac_reference}
					onChange={(v) => setP("show_ipac_reference", v)}
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
				<Toggle
					label="Last Packed Date"
					checked={pkgDetails.show_last_packed_date}
					onChange={(v) => setP("show_last_packed_date", v)}
				/>
				<Toggle
					label="Item Count Summary"
					checked={pkgDetails.show_item_count_summary}
					onChange={(v) => setP("show_item_count_summary", v)}
				/>
				<Toggle
					label="Dimensions"
					checked={pkgDetails.show_dimensions}
					onChange={(v) => setP("show_dimensions", v)}
				/>
				<Toggle
					label="Weight"
					checked={pkgDetails.show_weights}
					onChange={(v) => setP("show_weights", v)}
				/>
			</Section>

			<Section title="Items Table">
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
								<option value="full">Full table</option>
							</select>
						</div>
						{pkgDetails.items_detail_level === "full" && (
							<div className="pl-2 flex flex-col gap-1.5">
								<div className="flex flex-col gap-1">
									<label htmlFor="items-sort" className="text-xs text-gray-500">
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
								<div className="text-xs text-gray-500 font-medium mt-1">
									Columns
								</div>
								<Toggle
									label="Item # column"
									checked={pkgDetails.show_item_num_col}
									onChange={(v) => setP("show_item_num_col", v)}
								/>
								<Toggle
									label="Description column"
									checked={pkgDetails.show_description_col}
									onChange={(v) => setP("show_description_col", v)}
								/>
								<Toggle
									label="Qty column"
									checked={pkgDetails.show_qty_col}
									onChange={(v) => setP("show_qty_col", v)}
								/>
								<div className="text-xs text-gray-500 font-medium mt-1">
									Style
								</div>
								<Toggle
									label="Alternating row highlight"
									checked={pkgDetails.table_alternating_rows}
									onChange={(v) => setP("table_alternating_rows", v)}
								/>
								{pkgDetails.table_alternating_rows && (
									<div className="flex gap-2 items-center pl-4">
										<input
											type="color"
											className="w-8 h-7 cursor-pointer rounded"
											value={pkgDetails.table_alternating_color}
											onChange={(e) =>
												setP("table_alternating_color", e.target.value)
											}
										/>
										<span className="text-xs font-mono text-gray-500">
											{pkgDetails.table_alternating_color}
										</span>
									</div>
								)}
								<Toggle
									label="Row borders"
									checked={pkgDetails.table_show_border}
									onChange={(v) => setP("table_show_border", v)}
								/>
							</div>
						)}
					</>
				)}
			</Section>
		</div>
	);
};
