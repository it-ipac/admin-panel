import { NumberInput } from "./NumberInput";
import type { ManufacturingPartPreview } from "./types";

interface ManufacturingPartCardProps {
	label: string;
	part: ManufacturingPartPreview;
	showFields: Array<"quantity" | "width" | "thickness" | "space">;
	removable?: boolean;
	onRemove?: () => void;
	onManufacturingTypeChange: (key: string, typeId: string) => void;
	onManufacturingFieldChange: (
		key: string,
		field: "quantity" | "width" | "thickness" | "space",
		value: number | null,
	) => void;
	onManufacturingOptionsToggle: (key: string) => void;
}

export function ManufacturingPartCard({
	label,
	part,
	showFields,
	removable,
	onRemove,
	onManufacturingTypeChange,
	onManufacturingFieldChange,
	onManufacturingOptionsToggle,
}: ManufacturingPartCardProps) {
	return (
		<div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
			<div className="flex items-center justify-between">
				<p className="text-xs font-semibold text-gray-700">{label}</p>
				<div className="flex items-center gap-2">
					{part.hasMatchedOptions && (
						<button
							type="button"
							onClick={() => onManufacturingOptionsToggle(part.key)}
							className="text-[11px] text-blue-600 hover:text-blue-700"
						>
							{part.showAllOptions
								? "Show matched options"
								: "Show all options"}
						</button>
					)}
					{removable && onRemove && (
						<button
							type="button"
							onClick={onRemove}
							className="text-xs text-gray-500 hover:text-red-600"
							aria-label={`Remove ${label}`}
						>
							×
						</button>
					)}
				</div>
			</div>
			<select
				value={part.typeId || ""}
				onChange={(event) =>
					onManufacturingTypeChange(part.key, event.target.value)
				}
				className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">Select material...</option>
				{part.typeOptions.map((option) => (
					<option key={option.id} value={option.id}>
						{option.label}
					</option>
				))}
			</select>
			{!part.typeResolved && part.typeLabel && (
				<p className="text-[11px] text-amber-600">
					Not matched. Choose a material.
				</p>
			)}
			<div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
				{showFields.includes("quantity") && (
					<div>
						<p className="text-gray-400">Qty</p>
						<NumberInput
							value={part.quantity}
							onChange={(value) =>
								onManufacturingFieldChange(part.key, "quantity", value)
							}
						/>
					</div>
				)}
				{showFields.includes("width") && (
					<div>
						<p className="text-gray-400">Width</p>
						<NumberInput
							value={part.width}
							onChange={(value) =>
								onManufacturingFieldChange(part.key, "width", value)
							}
						/>
					</div>
				)}
				{showFields.includes("thickness") && (
					<div>
						<p className="text-gray-400">Thickness</p>
						<NumberInput
							value={part.thickness}
							onChange={(value) =>
								onManufacturingFieldChange(part.key, "thickness", value)
							}
						/>
					</div>
				)}
				{showFields.includes("space") && (
					<div>
						<p className="text-gray-400">Space</p>
						<NumberInput
							value={part.space}
							onChange={(value) =>
								onManufacturingFieldChange(part.key, "space", value)
							}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
