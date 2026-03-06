import { useState } from "react";
import { ManufacturingPartCard } from "./ManufacturingPartCard";
import type {
	ManufacturingPartPreview,
	OrderCreateConfirmDialogProps,
	PackagePreview,
} from "./types";

type PartField = "quantity" | "width" | "thickness" | "space";
type PartKind = "template" | "bar";

interface ManufacturingPartConfig {
	label: string;
	part: ManufacturingPartPreview;
	showFields: PartField[];
	kind: PartKind;
}

interface ManufacturingSectionsPanelProps {
	pkg: PackagePreview;
	isBaseOnlyPackage: boolean;
	onManufacturingTypeChange: OrderCreateConfirmDialogProps["onManufacturingTypeChange"];
	onManufacturingFieldChange: OrderCreateConfirmDialogProps["onManufacturingFieldChange"];
	onManufacturingOptionsToggle: OrderCreateConfirmDialogProps["onManufacturingOptionsToggle"];
	onManufacturingPartAdd: OrderCreateConfirmDialogProps["onManufacturingPartAdd"];
	onManufacturingPartRemove: OrderCreateConfirmDialogProps["onManufacturingPartRemove"];
}

const hasTextValue = (value: string | null | undefined): boolean =>
	(value || "").trim().length > 0;

const normalizeLabel = (value: string | null | undefined): string =>
	(value || "")
		.toLowerCase()
		.replace(/\bpacking\b/g, "pkg")
		.replace(/\bpackage\b/g, "pkg")
		.replace(/[^a-z0-9]/g, "");

const isGasPackingOnly = (boxTypeLabel: string | null | undefined): boolean =>
	normalizeLabel(boxTypeLabel).includes("gaspkgonly");

export function ManufacturingSectionsPanel({
	pkg,
	isBaseOnlyPackage,
	onManufacturingTypeChange,
	onManufacturingFieldChange,
	onManufacturingOptionsToggle,
	onManufacturingPartAdd,
	onManufacturingPartRemove,
}: ManufacturingSectionsPanelProps) {
	const [forcedVisiblePartKeys, setForcedVisiblePartKeys] = useState<
		Record<string, boolean>
	>({});
	const isGasPackingOnlyPackage = isGasPackingOnly(pkg.boxTypeLabel);

	const isPartVisible = (part: ManufacturingPartPreview, kind: PartKind) => {
		if (!isGasPackingOnlyPackage) return true;
		const hasImportedData =
			kind === "template"
				? hasTextValue(part.typeLabel)
				: hasTextValue(part.typeLabel) &&
					part.width !== null &&
					part.thickness !== null;
		return hasImportedData || !!forcedVisiblePartKeys[part.key];
	};

	const addPart = (key: string) => {
		onManufacturingPartAdd(key);
		setForcedVisiblePartKeys((prev) => ({ ...prev, [key]: true }));
	};

	const removePart = (key: string) => {
		onManufacturingPartRemove(key);
		setForcedVisiblePartKeys((prev) => {
			if (!(key in prev)) return prev;
			const next = { ...prev };
			delete next[key];
			return next;
		});
	};

	const renderManufacturingSection = (
		title: string,
		parts: ManufacturingPartConfig[],
	) => {
		const visibleParts = parts.filter((entry) =>
			isPartVisible(entry.part, entry.kind),
		);
		const hiddenParts = parts.filter(
			(entry) => !isPartVisible(entry.part, entry.kind),
		);

		return (
			<div className="space-y-3">
				<p className="text-xs font-semibold text-gray-800">{title}</p>
				{visibleParts.length === 0 ? (
					<div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
						<p className="text-[11px] text-gray-500 mb-2">No data detected for this section.</p>
						<div className="flex flex-wrap gap-2">
							{parts.map((entry) => (
								<button
									key={`add-${entry.part.key}`}
									type="button"
									onClick={() => addPart(entry.part.key)}
									className="px-2 py-1 text-[11px] rounded border border-gray-300 text-gray-600 hover:text-blue-700 hover:border-blue-300"
								>
									Add {entry.label.toLowerCase()}
								</button>
							))}
						</div>
					</div>
				) : (
					<>
						{visibleParts.map((entry) => (
							<ManufacturingPartCard
								key={entry.part.key}
								label={entry.label}
								part={entry.part}
								showFields={entry.showFields}
								removable={isGasPackingOnlyPackage}
								onRemove={() => removePart(entry.part.key)}
								onManufacturingTypeChange={onManufacturingTypeChange}
								onManufacturingFieldChange={onManufacturingFieldChange}
								onManufacturingOptionsToggle={onManufacturingOptionsToggle}
							/>
						))}
						{isGasPackingOnlyPackage && hiddenParts.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{hiddenParts.map((entry) => (
									<button
										key={`add-inline-${entry.part.key}`}
										type="button"
										onClick={() => addPart(entry.part.key)}
										className="px-2 py-1 text-[11px] rounded border border-gray-300 text-gray-600 hover:text-blue-700 hover:border-blue-300"
									>
										Add {entry.label.toLowerCase()}
									</button>
								))}
							</div>
						)}
					</>
				)}
			</div>
		);
	};

	const bigParts: ManufacturingPartConfig[] = [
		{
			label: "Template",
			part: pkg.manufacturing.big.template,
			showFields: ["quantity", "thickness"],
			kind: "template",
		},
		{
			label: "Horizontal bar",
			part: pkg.manufacturing.big.horizontal,
			showFields: ["quantity", "width", "thickness", "space"],
			kind: "bar",
		},
		{
			label: "Vertical bar",
			part: pkg.manufacturing.big.vertical,
			showFields: ["quantity", "width", "thickness", "space"],
			kind: "bar",
		},
	];

	const smallParts: ManufacturingPartConfig[] = [
		{
			label: "Template",
			part: pkg.manufacturing.small.template,
			showFields: ["quantity", "thickness"],
			kind: "template",
		},
		{
			label: "Horizontal bar",
			part: pkg.manufacturing.small.horizontal,
			showFields: ["quantity", "width", "thickness", "space"],
			kind: "bar",
		},
		{
			label: "Vertical bar",
			part: pkg.manufacturing.small.vertical,
			showFields: ["quantity", "width", "thickness", "space"],
			kind: "bar",
		},
	];

	const lidParts: ManufacturingPartConfig[] = [
		{
			label: "Template",
			part: pkg.manufacturing.lid.template,
			showFields: ["quantity", "thickness"],
			kind: "template",
		},
		{
			label: "Horizontal bar",
			part: pkg.manufacturing.lid.horizontal,
			showFields: ["quantity", "width", "thickness", "space"],
			kind: "bar",
		},
		{
			label: "Vertical bar",
			part: pkg.manufacturing.lid.vertical,
			showFields: ["quantity", "width", "thickness", "space"],
			kind: "bar",
		},
	];

	const baseParts: ManufacturingPartConfig[] = [
		{
			label: "Template",
			part: pkg.manufacturing.base.template,
			showFields: ["quantity", "thickness"],
			kind: "template",
		},
		{
			label: "Horizontal bar",
			part: pkg.manufacturing.base.horizontal,
			showFields: ["quantity", "width", "thickness", "space"],
			kind: "bar",
		},
		{
			label: "Vertical bar",
			part: pkg.manufacturing.base.vertical,
			showFields: ["quantity", "width", "thickness", "space"],
			kind: "bar",
		},
		{
			label: "Skids",
			part: pkg.manufacturing.base.skids,
			showFields: ["quantity", "width", "thickness", "space"],
			kind: "bar",
		},
	];

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{!isBaseOnlyPackage && renderManufacturingSection("Big sides", bigParts)}
			{!isBaseOnlyPackage && renderManufacturingSection("Small sides", smallParts)}
			{!isBaseOnlyPackage && renderManufacturingSection("Lid", lidParts)}
			{renderManufacturingSection("Base", baseParts)}
		</div>
	);
}
