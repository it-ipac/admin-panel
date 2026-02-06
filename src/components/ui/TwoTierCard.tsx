import type React from "react";
import { cn } from "../../lib/cn";

interface TwoTierCardProps {
	label: string;
	original: string | number | null | undefined;
	final: string | number | null | undefined;
	type?: "text" | "number" | "switch" | "select";
	onChange?: (val: any) => void;
	selectItems?: { label: string; value: string }[];
	className?: string;
	editable?: boolean;
	highlightChanges?: boolean;
}

const formatValue = (v: any) => {
	if (v === null || v === undefined) return "—";
	if (typeof v === "boolean") return v ? "Yes" : "No";
	return String(v);
};

export const TwoTierCard: React.FC<TwoTierCardProps> = ({
	label,
	original,
	final,
	type = "text",
	onChange,
	selectItems,
	className,
	editable = true,
	highlightChanges = false,
}) => {
	const hasChanged =
		final !== null && final !== undefined && original !== final;
	const showChangeHighlight = highlightChanges && hasChanged;

	const borderColor = showChangeHighlight
		? "border-orange-400"
		: "border-indigo-200";
	const headerBgColor = showChangeHighlight ? "bg-orange-50" : "bg-blue-50";
	const headerTextColor = showChangeHighlight
		? "text-orange-900"
		: "text-blue-800";

	return (
		<div
			className={cn(
				`flex flex-col border rounded-xl p-1 m-1 min-w-[100px] flex-1 ${borderColor} ${headerBgColor}`,
				className,
			)}
		>
			<div className="mb-1 px-2 rounded-full self-center">
				<span
					className={cn(
						`${headerTextColor} text-xs font-semibold text-center block`,
					)}
				>
					{label}
					{showChangeHighlight ? " *" : ""}
				</span>
			</div>

			{/* Original Row */}
			<div className="border border-indigo-200 rounded-lg px-1 py-1 mb-1 flex flex-col items-center justify-center bg-gray-50">
				<span className="text-[10px] text-amber-900 bg-amber-100 text-center w-full rounded-sm mb-1">
					Original
				</span>
				<span
					className="text-gray-900 text-sm font-semibold text-center w-full truncate px-1"
					title={formatValue(original)}
				>
					{formatValue(original)}
				</span>
			</div>

			{/* Final Row */}
			<div
				className={cn(
					`border rounded-lg px-1 py-1 flex flex-col items-center justify-center`,
					showChangeHighlight
						? "border-orange-400 bg-orange-50"
						: "border-indigo-200 bg-white",
				)}
			>
				<span
					className={cn(
						"text-[10px] text-center w-full rounded-sm mb-1",
						showChangeHighlight
							? "text-orange-900 bg-orange-100"
							: "text-green-900 bg-green-100",
					)}
				>
					Final{showChangeHighlight ? " ✓" : ""}
				</span>

				{editable ? (
					type === "select" ? (
						<select
							className="w-full text-center text-sm border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500"
							value={final === null || final === undefined ? "" : String(final)}
							onChange={(e) => onChange?.(e.target.value)}
						>
							<option value="">Select</option>
							{selectItems?.map((item) => (
								<option key={item.value} value={item.value}>
									{item.label}
								</option>
							))}
						</select>
					) : type === "switch" ? (
						<button
							className="w-full text-center text-sm py-0.5 rounded hover:bg-gray-100"
							onClick={() => onChange?.(!final)}
						>
							{final ? "Yes" : "No"}
						</button>
					) : (
						<input
							type={type === "number" ? "number" : "text"}
							className="w-full text-center text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500"
							value={final === null || final === undefined ? "" : String(final)}
							onChange={(e) => {
								const val = e.target.value;
								onChange?.(
									type === "number" ? (val === "" ? null : Number(val)) : val,
								);
							}}
						/>
					)
				) : (
					<span className="text-gray-900 text-sm font-semibold text-center w-full truncate px-1">
						{formatValue(final)}
					</span>
				)}
			</div>
		</div>
	);
};
