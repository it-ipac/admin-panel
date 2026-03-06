import { ManufacturingSectionsPanel } from "./ManufacturingSectionsPanel";
import { ManufacturingPartCard } from "./ManufacturingPartCard";
import { NumberInput, formatNumber } from "./NumberInput";
import type { OrderCreateConfirmDialogProps, PackagePreview } from "./types";

interface PackagePreviewSectionProps {
	packagePreviews: PackagePreview[];
	activePackage: number;
	setActivePackage: (index: number) => void;
	templateMode?: "legacy" | "v54plus";
	onPackageFieldChange: OrderCreateConfirmDialogProps["onPackageFieldChange"];
	onPackingTypeChange: OrderCreateConfirmDialogProps["onPackingTypeChange"];
	onPackingTypeOptionsToggle: OrderCreateConfirmDialogProps["onPackingTypeOptionsToggle"];
	onManufacturingTypeChange: OrderCreateConfirmDialogProps["onManufacturingTypeChange"];
	onManufacturingFieldChange: OrderCreateConfirmDialogProps["onManufacturingFieldChange"];
	onManufacturingOptionsToggle: OrderCreateConfirmDialogProps["onManufacturingOptionsToggle"];
	onManufacturingPartAdd: OrderCreateConfirmDialogProps["onManufacturingPartAdd"];
	onManufacturingPartRemove: OrderCreateConfirmDialogProps["onManufacturingPartRemove"];
}

const columnToNumber = (label: string) => {
	let result = 0;
	for (let index = 0; index < label.length; index += 1) {
		result = result * 26 + (label.charCodeAt(index) - 64);
	}
	return result;
};

const numberToColumn = (value: number) => {
	let remainder = value;
	let columnLabel = "";
	while (remainder > 0) {
		const current = (remainder - 1) % 26;
		columnLabel = String.fromCharCode(65 + current) + columnLabel;
		remainder = Math.floor((remainder - 1) / 26);
	}
	return columnLabel;
};

const shiftColumn = (
	label: string,
	templateMode: "legacy" | "v54plus" | undefined,
) => {
	if (templateMode !== "v54plus") return label;
	const numeric = columnToNumber(label);
	if (numeric <= 2) return label;
	const equipmentDimensionsStart = columnToNumber("M");
	const effectiveOffset = numeric >= equipmentDimensionsStart ? -1 : 2;
	return numberToColumn(numeric + effectiveOffset);
};

const renderDimensionInputs = (
	pkg: PackagePreview,
	path: "item" | "internal" | "external",
	onPackageFieldChange: OrderCreateConfirmDialogProps["onPackageFieldChange"],
) => (
	<div className="mt-1 grid grid-cols-3 gap-2">
		<NumberInput
			value={pkg[path].length}
			onChange={(value) =>
				onPackageFieldChange(pkg.packageNumber, `${path}.length` as any, value)
			}
		/>
		<NumberInput
			value={pkg[path].width}
			onChange={(value) =>
				onPackageFieldChange(pkg.packageNumber, `${path}.width` as any, value)
			}
		/>
		<NumberInput
			value={pkg[path].height}
			onChange={(value) =>
				onPackageFieldChange(pkg.packageNumber, `${path}.height` as any, value)
			}
		/>
	</div>
);

const normalizeLabel = (value: string | null | undefined): string =>
	(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function PackagePreviewSection({
	packagePreviews,
	activePackage,
	setActivePackage,
	templateMode,
	onPackageFieldChange,
	onPackingTypeChange,
	onPackingTypeOptionsToggle,
	onManufacturingTypeChange,
	onManufacturingFieldChange,
	onManufacturingOptionsToggle,
	onManufacturingPartAdd,
	onManufacturingPartRemove,
}: PackagePreviewSectionProps) {
	if (!packagePreviews.length) return null;
	const pkg = packagePreviews[activePackage];
	if (!pkg) return null;
	const normalizedBoxTypeLabel = normalizeLabel(pkg.boxTypeLabel);
	const isBaseOnlyPackage = normalizedBoxTypeLabel.includes("baseonly");

	const boxTypeColumn = shiftColumn("C", templateMode);
	const packingTypeColumn = shiftColumn("AB", templateMode);
	const itemDimColumns = ["M", "N", "O"]
		.map((column) => shiftColumn(column, templateMode))
		.join(", ");
	const internalDimColumns = ["V", "W", "X"]
		.map((column) => shiftColumn(column, templateMode))
		.join(", ");
	const externalDimColumns = ["Y", "Z", "AA"]
		.map((column) => shiftColumn(column, templateMode))
		.join(", ");
	const netWeightColumn = shiftColumn("U", templateMode);
	const tareColumn = shiftColumn("BAB", templateMode);

	return (
		<div className="rounded-lg border border-gray-200 p-4">
			<div className="flex items-center justify-between mb-3">
				<div>
					<p className="text-sm font-semibold text-gray-900">Package preview</p>
					<p className="text-xs text-gray-500">
						Review each package row from the Calculation sheet.
					</p>
				</div>
			</div>
			<div className="flex flex-wrap gap-2 mb-4">
				{packagePreviews.map((item, index) => (
					<button
						key={`pkg-tab-${item.packageNumber}`}
						type="button"
						onClick={() => setActivePackage(index)}
						className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
							activePackage === index
								? "border-blue-600 bg-blue-50 text-blue-700"
								: "border-gray-200 text-gray-600"
						}`}
					>
						Box {item.packageNumber}
					</button>
				))}
			</div>

			<div className="space-y-3 text-xs text-gray-700">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<p className="text-xs text-gray-500">Quantity (col A)</p>
						<NumberInput
							value={pkg.quantity}
							onChange={(value) =>
								onPackageFieldChange(pkg.packageNumber, "quantity", value)
							}
						/>
					</div>
					<div>
						<p className="text-xs text-gray-500">Box type (col {boxTypeColumn})</p>
						<input
							type="text"
							value={pkg.boxTypeLabel || ""}
							onChange={(event) =>
								onPackageFieldChange(
									pkg.packageNumber,
									"boxTypeLabel",
									event.target.value,
								)
							}
							className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						{!pkg.boxTypeResolved && (
							<p className="mt-1 text-xs text-amber-600">Not found in box types.</p>
						)}
					</div>
					<div>
						<p className="text-xs text-gray-500">Packing type (col {packingTypeColumn})</p>
						<select
							value={pkg.packingTypeId || ""}
							onChange={(event) =>
								onPackingTypeChange(pkg.packageNumber, event.target.value)
							}
							className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Select packing type...</option>
							{pkg.packingTypeOptions?.map((option) => (
								<option key={option.id} value={option.id}>
									{option.label}
								</option>
							))}
						</select>
						{!pkg.packingTypeResolved && (
							<p className="mt-1 text-xs text-amber-600">
								Not matched. Select a packing type.
							</p>
						)}
						{pkg.hasMatchedPackingOptions && (
							<button
								type="button"
								onClick={() => onPackingTypeOptionsToggle(pkg.packageNumber)}
								className="mt-1 text-[11px] text-blue-600 hover:text-blue-700"
							>
								{pkg.showAllPackingOptions
									? "Show matched options"
									: "Show all options"}
							</button>
						)}
					</div>
					<div>
						<p className="text-xs text-gray-500">Packing type raw</p>
						<input
							type="text"
							value={pkg.packingTypeRaw || ""}
							onChange={(event) =>
								onPackageFieldChange(
									pkg.packageNumber,
									"packingTypeRaw",
									event.target.value,
								)
							}
							className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<p className="text-xs text-gray-500">Item designation (col B)</p>
						<input
							type="text"
							value={pkg.designation || ""}
							onChange={(event) =>
								onPackageFieldChange(
									pkg.packageNumber,
									"designation",
									event.target.value,
								)
							}
							className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<p className="text-xs text-gray-500">Item dimensions ({itemDimColumns})</p>
						{renderDimensionInputs(pkg, "item", onPackageFieldChange)}
					</div>
					<div>
						<p className="text-xs text-gray-500">Internal dimensions ({internalDimColumns})</p>
						{renderDimensionInputs(pkg, "internal", onPackageFieldChange)}
					</div>
					<div>
						<p className="text-xs text-gray-500">External dimensions ({externalDimColumns})</p>
						{renderDimensionInputs(pkg, "external", onPackageFieldChange)}
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<p className="text-xs text-gray-500">Net weight ({netWeightColumn})</p>
						<NumberInput
							value={pkg.netWeight}
							onChange={(value) =>
								onPackageFieldChange(pkg.packageNumber, "netWeight", value)
							}
						/>
					</div>
					<div>
						<p className="text-xs text-gray-500">Tare ({tareColumn})</p>
						<NumberInput
							value={pkg.tare}
							onChange={(value) =>
								onPackageFieldChange(pkg.packageNumber, "tare", value)
							}
						/>
					</div>
					<div>
						<p className="text-xs text-gray-500">Gross (net + tare)</p>
						<p className="font-medium text-gray-900 mt-2">
							{formatNumber(pkg.grossWeight)}
						</p>
					</div>
				</div>

				<div className="pt-3 border-t border-gray-100">
					<p className="text-xs font-semibold text-gray-700 mb-2">
						Manufacturing (securing)
					</p>
					<ManufacturingSectionsPanel
						pkg={pkg}
						isBaseOnlyPackage={isBaseOnlyPackage}
						onManufacturingTypeChange={onManufacturingTypeChange}
						onManufacturingFieldChange={onManufacturingFieldChange}
						onManufacturingOptionsToggle={onManufacturingOptionsToggle}
						onManufacturingPartAdd={onManufacturingPartAdd}
						onManufacturingPartRemove={onManufacturingPartRemove}
					/>
				</div>

				<div className="pt-3 border-t border-gray-100">
					<p className="text-xs font-semibold text-gray-700 mb-2">Securing materials</p>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{pkg.securing?.length ? (
							pkg.securing.map((part, index) => (
								<div key={part.key} className="space-y-2">
									<ManufacturingPartCard label={`Securing ${index + 1}`} part={part} showFields={["quantity", "width", "thickness"]} onManufacturingTypeChange={onManufacturingTypeChange} onManufacturingFieldChange={onManufacturingFieldChange} onManufacturingOptionsToggle={onManufacturingOptionsToggle} />
								</div>
							))
						) : (
							<p className="text-xs text-gray-500">No securing materials detected.</p>
						)}
					</div>
				</div>

				<div className="pt-3 border-t border-gray-100">
					<p className="text-xs font-semibold text-gray-700 mb-2">Accessories</p>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{pkg.accessories?.length ? (
							pkg.accessories.map((part, index) => (
								<div key={part.key} className="space-y-2">
									<ManufacturingPartCard label={`Accessory ${index + 1}`} part={part} showFields={["quantity"]} onManufacturingTypeChange={onManufacturingTypeChange} onManufacturingFieldChange={onManufacturingFieldChange} onManufacturingOptionsToggle={onManufacturingOptionsToggle} />
								</div>
							))
						) : (
							<p className="text-xs text-gray-500">No accessories detected.</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
