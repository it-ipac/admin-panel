import { NumberInput } from "./NumberInput";
import type { ManufacturingPartPreview } from "./types";

interface ManufacturingPartCardProps {
	label: string;
	part: ManufacturingPartPreview;
	issues?: string[];
	selectId?: string;
	fieldInputIds?: Partial<
		Record<"quantity" | "width" | "thickness" | "space", string>
	>;
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
	issues,
	selectId,
	fieldInputIds,
	showFields,
	removable,
	onRemove,
	onManufacturingTypeChange,
	onManufacturingFieldChange,
	onManufacturingOptionsToggle,
}: ManufacturingPartCardProps) {
	const hasIssues = !!issues && issues.length > 0;

	const renderMakePositiveButton = (
		field: "quantity" | "width" | "thickness" | "space",
		value: number | null,
	) => {
		if (value === null || !Number.isFinite(value) || value >= 0) return null;
		return (
			<button
				type="button"
				onClick={() =>
					onManufacturingFieldChange(part.key, field, Math.abs(value))
				}
				className="rounded border border-success-200 bg-success-50 px-1.5 py-0.5 text-[10px] font-medium text-success-700 hover:bg-success-100"
			>
				Make positive
			</button>
		);
	};

	return (
		<div
			className={`space-y-2 rounded-lg border p-3 ${
				hasIssues
					? "border-danger-200 bg-danger-50"
					: "border-neutral-100 bg-neutral-50"
			}`}
		>
			<div className="flex items-center justify-between">
				<p className="text-xs font-semibold text-neutral-700">{label}</p>
				<div className="flex items-center gap-2">
					{part.hasMatchedOptions && (
						<button
							type="button"
							onClick={() => onManufacturingOptionsToggle(part.key)}
							className="text-[11px] text-primary-600 hover:text-primary-700"
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
							className="text-xs text-neutral-500 hover:text-danger-600"
							aria-label={`Remove ${label}`}
						>
							×
						</button>
					)}
				</div>
			</div>
			<select
				id={selectId}
				value={part.typeId || ""}
				onChange={(event) =>
					onManufacturingTypeChange(part.key, event.target.value)
				}
				className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
			>
				<option value="">Select material...</option>
				{part.typeOptions.map((option) => (
					<option key={option.id} value={option.id}>
						{option.label}
					</option>
				))}
			</select>
			{!part.typeResolved && part.typeLabel && (
				<p className="text-[11px] text-warning-600">
					Not matched. Choose a material.
				</p>
			)}
			{hasIssues && (
				<ul className="space-y-1 rounded border border-danger-200 bg-white px-2 py-1 text-[11px] text-danger-700 list-disc list-inside">
					{issues.map((issue, index) => (
						<li key={`${part.key}-issue-${index}`}>{issue}</li>
					))}
				</ul>
			)}
			<div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
				{showFields.includes("quantity") && (
					<div>
						<div className="mb-1 flex items-center justify-between">
							<p className="text-neutral-400">Qty</p>
							{renderMakePositiveButton("quantity", part.quantity)}
						</div>
						<NumberInput
							inputId={fieldInputIds?.quantity}
							value={part.quantity}
							onChange={(value) =>
								onManufacturingFieldChange(part.key, "quantity", value)
							}
						/>
					</div>
				)}
				{showFields.includes("width") && (
					<div>
						<div className="mb-1 flex items-center justify-between">
							<p className="text-neutral-400">Width</p>
							{renderMakePositiveButton("width", part.width)}
						</div>
						<NumberInput
							inputId={fieldInputIds?.width}
							value={part.width}
							onChange={(value) =>
								onManufacturingFieldChange(part.key, "width", value)
							}
						/>
					</div>
				)}
				{showFields.includes("thickness") && (
					<div>
						<div className="mb-1 flex items-center justify-between">
							<p className="text-neutral-400">Thickness</p>
							{renderMakePositiveButton("thickness", part.thickness)}
						</div>
						<NumberInput
							inputId={fieldInputIds?.thickness}
							value={part.thickness}
							onChange={(value) =>
								onManufacturingFieldChange(part.key, "thickness", value)
							}
						/>
					</div>
				)}
				{showFields.includes("space") && (
					<div>
						<div className="mb-1 flex items-center justify-between">
							<p className="text-neutral-400">Space</p>
							{renderMakePositiveButton("space", part.space)}
						</div>
						<NumberInput
							inputId={fieldInputIds?.space}
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
