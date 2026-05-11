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
}

export const HeaderDataPanel: React.FC<HeaderDataPanelProps> = ({
	data,
	setData,
}) => {
	const handleChange = (key: string, value: any) => {
		setData((prev: any) => ({ ...prev, [key]: value }));
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<label
					htmlFor="reportName"
					className="text-sm font-medium text-gray-700"
				>
					Report Name *
				</label>
				<input
					id="reportName"
					type="text"
					className="border rounded-md p-2 text-sm w-full"
					placeholder="e.g. Daily Packing Report"
					value={data.reportName}
					onChange={(e) => handleChange("reportName", e.target.value)}
					required
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label
					htmlFor="reportNumber"
					className="text-sm font-medium text-gray-700"
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
					className="text-sm font-medium text-gray-700"
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
					className="text-sm font-medium text-gray-700"
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
					className="text-sm font-medium text-gray-700"
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
	);
};
