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

export const AppearancePanel: React.FC<AppearancePanelProps> = ({
	display,
	setDisplay,
	pkgDetails,
	setPkgDetails,
}) => {
	const handleDisplayChange = (
		key: keyof ReportDisplaySettings,
		value: any,
	) => {
		setDisplay((prev) => ({ ...prev, [key]: value }));
	};

	const handlePkgChange = (key: keyof ReportPkgDetailsSettings, value: any) => {
		setPkgDetails((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<div className="flex flex-col gap-6">
			{/* Display Settings */}
			<div className="flex flex-col gap-3">
				<h3 className="text-sm font-semibold text-gray-800 border-b pb-1">
					Global Appearance
				</h3>

				<label className="flex items-center gap-2 text-sm text-gray-700">
					<input
						type="checkbox"
						checked={display.show_company_logo}
						onChange={(e) =>
							handleDisplayChange("show_company_logo", e.target.checked)
						}
					/>
					Show Company Profile Logo (Header)
				</label>

				<label className="flex items-center gap-2 text-sm text-gray-700">
					<input
						type="checkbox"
						checked={display.show_qr_codes}
						onChange={(e) =>
							handleDisplayChange("show_qr_codes", e.target.checked)
						}
					/>
					Show QR Codes
				</label>

				<label className="flex items-center gap-2 text-sm text-gray-700">
					<input
						type="checkbox"
						checked={display.include_signatures}
						onChange={(e) =>
							handleDisplayChange("include_signatures", e.target.checked)
						}
					/>
					Include Signature Block (Footer)
				</label>

				<div className="flex flex-col gap-1">
					<label htmlFor="theme-color" className="text-xs text-gray-500">
						Theme Color
					</label>
					<div className="flex gap-2 items-center">
						<input
							id="theme-color"
							type="color"
							className="w-8 h-8 rounded border p-0 cursor-pointer"
							value={display.theme_color}
							onChange={(e) =>
								handleDisplayChange("theme_color", e.target.value)
							}
						/>
						<span className="text-sm font-mono text-gray-600">
							{display.theme_color}
						</span>
					</div>
				</div>
			</div>

			{/* Package Detail Settings */}
			<div className="flex flex-col gap-3">
				<h3 className="text-sm font-semibold text-gray-800 border-b pb-1">
					Package Details
				</h3>

				<label className="flex items-center gap-2 text-sm text-gray-700">
					<input
						type="checkbox"
						checked={pkgDetails.show_dimensions}
						onChange={(e) =>
							handlePkgChange("show_dimensions", e.target.checked)
						}
					/>
					Show Dimensions
				</label>

				<label className="flex items-center gap-2 text-sm text-gray-700">
					<input
						type="checkbox"
						checked={pkgDetails.show_weights}
						onChange={(e) => handlePkgChange("show_weights", e.target.checked)}
					/>
					Show Weights
				</label>

				<label className="flex items-center gap-2 text-sm text-gray-700">
					<input
						type="checkbox"
						checked={pkgDetails.show_items}
						onChange={(e) => handlePkgChange("show_items", e.target.checked)}
					/>
					Show Box Content Items
				</label>

				{pkgDetails.show_items && (
					<div className="pl-6 flex flex-col gap-1">
						<label
							htmlFor="item-detail-level"
							className="text-xs text-gray-500"
						>
							Item Detail Level
						</label>
						<select
							id="item-detail-level"
							className="border rounded p-1 text-sm bg-white max-w-xs"
							value={pkgDetails.items_detail_level}
							onChange={(e) =>
								handlePkgChange("items_detail_level", e.target.value)
							}
						>
							<option value="summary">Summary (Quantity only)</option>
							<option value="full">Full Details</option>
						</select>
					</div>
				)}
			</div>
		</div>
	);
};
