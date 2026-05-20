import { useCallback, useEffect, useMemo, useState } from "react";
import { ManufacturingPartCard } from "./ManufacturingPartCard";
import { ManufacturingSectionsPanel } from "./ManufacturingSectionsPanel";
import { formatNumber, NumberInput } from "./NumberInput";
import type {
	OrderCreateConfirmDialogProps,
	PackageItemMatchStatus,
	PackagePreview,
} from "./types";

interface PackagePreviewSectionProps {
	packagePreviews: PackagePreview[];
	packageIssueMessages: Record<number, string[]>;
	partIssueMessages: Record<string, string[]>;
	itemMatchStatusByPackage: Record<number, PackageItemMatchStatus>;
	activePackage: number;
	setActivePackage: (index: number) => void;
	templateMode?: "legacy" | "v54plus";
	onPackageFieldChange: OrderCreateConfirmDialogProps["onPackageFieldChange"];
	onPackageRemove: OrderCreateConfirmDialogProps["onPackageRemove"];
	onPackingTypeChange: OrderCreateConfirmDialogProps["onPackingTypeChange"];
	onSeiCategoryChange: OrderCreateConfirmDialogProps["onSeiCategoryChange"];
	onSeiProtectionChange: OrderCreateConfirmDialogProps["onSeiProtectionChange"];
	onPackingTypeOptionsToggle: OrderCreateConfirmDialogProps["onPackingTypeOptionsToggle"];
	onManufacturingTypeChange: OrderCreateConfirmDialogProps["onManufacturingTypeChange"];
	onManufacturingFieldChange: OrderCreateConfirmDialogProps["onManufacturingFieldChange"];
	onManufacturingOptionsToggle: OrderCreateConfirmDialogProps["onManufacturingOptionsToggle"];
	onManufacturingPartAdd: OrderCreateConfirmDialogProps["onManufacturingPartAdd"];
	onManufacturingPartRemove: OrderCreateConfirmDialogProps["onManufacturingPartRemove"];
	onInstanceOverrideChange: OrderCreateConfirmDialogProps["onInstanceOverrideChange"];
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

type IssueField = "quantity" | "width" | "thickness" | "space";

interface PackageIssueAction {
	key: string;
	packageNumber: number;
	message: string;
	targetId?: string;
}

const sanitizeForDomId = (value: string) =>
	value.replace(/[^a-zA-Z0-9_-]/g, "_");

const getPackageInputId = (packageNumber: number, field: string) =>
	`order-create-package-${packageNumber}-${field}`;

const getPartInputId = (partKey: string, field: IssueField) =>
	`order-create-part-${sanitizeForDomId(partKey)}-${field}`;

const getPartTypeSelectId = (partKey: string) =>
	`order-create-part-${sanitizeForDomId(partKey)}-type`;

export function PackagePreviewSection({
	packagePreviews,
	packageIssueMessages,
	partIssueMessages,
	itemMatchStatusByPackage,
	activePackage,
	setActivePackage,
	templateMode,
	onPackageFieldChange,
	onPackageRemove,
	onPackingTypeChange,
	onSeiCategoryChange,
	onSeiProtectionChange,
	onPackingTypeOptionsToggle,
	onManufacturingTypeChange,
	onManufacturingFieldChange,
	onManufacturingOptionsToggle,
	onManufacturingPartAdd,
	onManufacturingPartRemove,
	onInstanceOverrideChange,
}: PackagePreviewSectionProps) {
	const pkg = packagePreviews[activePackage];
	const [showInstanceOverrides, setShowInstanceOverrides] = useState(false);

	useEffect(() => {
		if (pkg?.packageNumber) {
			setShowInstanceOverrides(false);
		}
	}, [pkg?.packageNumber]);

	const [issueNavigationQueue, setIssueNavigationQueue] = useState<
		string[] | null
	>(null);

	const orderedIssueActions = useMemo(() => {
		const negativePattern =
			/^(Securing|Accessory)\s+(\d+)\s+(quantity|width|thickness)\s+cannot be negative\s+\((-?\d*\.?\d+)\)\.?$/i;
		const quantityRequiredPattern =
			/^(Securing|Accessory)\s+(\d+)\s+quantity is required when a material is selected\.$/i;
		const missingUnitPattern =
			/^(Securing|Accessory)\s+(\d+)\s+material has no unit mapping in inventory\.$/i;

		const actions: PackageIssueAction[] = [];

		for (const preview of packagePreviews) {
			const messages = packageIssueMessages[preview.packageNumber] || [];
			for (const rawMessage of messages) {
				const message = rawMessage.trim();
				const action: PackageIssueAction = {
					key: `${preview.packageNumber}::${message}`,
					packageNumber: preview.packageNumber,
					message,
				};

				if (message === "Box quantity must be a positive whole number.") {
					action.targetId = getPackageInputId(
						preview.packageNumber,
						"quantity",
					);
					actions.push(action);
					continue;
				}

				if (message === "Box type is not mapped.") {
					action.targetId = getPackageInputId(preview.packageNumber, "boxType");
					actions.push(action);
					continue;
				}

				if (message === "Packing type is not mapped.") {
					action.targetId = getPackageInputId(
						preview.packageNumber,
						"packingType",
					);
					actions.push(action);
					continue;
				}

				if (message === "SEI category/protection is not fully selected.") {
					action.targetId = getPackageInputId(
						preview.packageNumber,
						"seiCategory",
					);
					actions.push(action);
					continue;
				}

				if (message.startsWith("Resolve ")) {
					action.targetId = getPackageInputId(
						preview.packageNumber,
						"manufacturing",
					);
					actions.push(action);
					continue;
				}

				if (
					message.startsWith("Item number ") &&
					message.includes("was not found in client items DB")
				) {
					action.targetId = getPackageInputId(
						preview.packageNumber,
						"designation",
					);
					actions.push(action);
					continue;
				}

				const quantityRequiredMatch = message.match(quantityRequiredPattern);
				if (quantityRequiredMatch) {
					const partType = quantityRequiredMatch[1] as "Securing" | "Accessory";
					const partNumber = Number(quantityRequiredMatch[2]);
					const partIndex = partNumber - 1;
					const part =
						partType === "Securing"
							? preview.securing[partIndex]
							: preview.accessories[partIndex];
					if (part) {
						action.targetId = getPartInputId(part.key, "quantity");
					}
					actions.push(action);
					continue;
				}

				const missingUnitMatch = message.match(missingUnitPattern);
				if (missingUnitMatch) {
					const partType = missingUnitMatch[1] as "Securing" | "Accessory";
					const partNumber = Number(missingUnitMatch[2]);
					const partIndex = partNumber - 1;
					const part =
						partType === "Securing"
							? preview.securing[partIndex]
							: preview.accessories[partIndex];
					if (part) {
						action.targetId = getPartTypeSelectId(part.key);
					}
					actions.push(action);
					continue;
				}

				const negativeMatch = message.match(negativePattern);
				if (negativeMatch) {
					const partType = negativeMatch[1] as "Securing" | "Accessory";
					const partNumber = Number(negativeMatch[2]);
					const issueField = negativeMatch[3] as
						| "quantity"
						| "width"
						| "thickness";
					const partIndex = partNumber - 1;
					const part =
						partType === "Securing"
							? preview.securing[partIndex]
							: preview.accessories[partIndex];
					if (part) {
						action.targetId = getPartInputId(part.key, issueField);
					}
					actions.push(action);
					continue;
				}

				actions.push(action);
			}
		}

		return actions;
	}, [packageIssueMessages, packagePreviews]);

	const orderedIssueKeys = useMemo(
		() => orderedIssueActions.map((issue) => issue.key),
		[orderedIssueActions],
	);

	const issueActionByKey = useMemo(
		() => new Map(orderedIssueActions.map((issue) => [issue.key, issue])),
		[orderedIssueActions],
	);

	const currentPackageIssueActions = useMemo(
		() =>
			orderedIssueActions.filter(
				(issue) => issue.packageNumber === pkg?.packageNumber,
			),
		[orderedIssueActions, pkg?.packageNumber],
	);

	const jumpToIssue = useCallback(
		(issue: PackageIssueAction) => {
			const packageIndex = packagePreviews.findIndex(
				(item) => item.packageNumber === issue.packageNumber,
			);
			if (packageIndex < 0) return;

			const shouldSwitchPackage = packageIndex !== activePackage;
			if (shouldSwitchPackage) {
				setActivePackage(packageIndex);
			}

			if (!issue.targetId || typeof document === "undefined") return;

			const focusTarget = (attempt = 0) => {
				const target = document.getElementById(issue.targetId as string);
				if (!target) {
					if (attempt < 4) {
						window.setTimeout(() => focusTarget(attempt + 1), 80);
					}
					return;
				}

				target.scrollIntoView({ behavior: "smooth", block: "center" });
				if (target instanceof HTMLElement) {
					target.focus();
				}
			};

			window.setTimeout(() => focusTarget(0), shouldSwitchPackage ? 120 : 0);
		},
		[activePackage, packagePreviews, setActivePackage],
	);

	const startIssueNavigationFrom = useCallback(
		(issueKey: string) => {
			const startIndex = orderedIssueKeys.indexOf(issueKey);
			if (startIndex < 0) return;

			const nextQueue = orderedIssueKeys.slice(startIndex);
			setIssueNavigationQueue(nextQueue);

			const firstIssue = issueActionByKey.get(nextQueue[0]);
			if (firstIssue) {
				jumpToIssue(firstIssue);
			}
		},
		[issueActionByKey, jumpToIssue, orderedIssueKeys],
	);

	useEffect(() => {
		if (!issueNavigationQueue || issueNavigationQueue.length === 0) return;

		const remainingQueue = issueNavigationQueue.filter((key) =>
			issueActionByKey.has(key),
		);

		if (remainingQueue.length === 0) {
			setIssueNavigationQueue(null);
			return;
		}

		const queueChanged =
			remainingQueue.length !== issueNavigationQueue.length ||
			remainingQueue.some((key, index) => key !== issueNavigationQueue[index]);

		if (queueChanged) {
			setIssueNavigationQueue(remainingQueue);
		}

		if (remainingQueue[0] !== issueNavigationQueue[0]) {
			const nextIssue = issueActionByKey.get(remainingQueue[0]);
			if (nextIssue) {
				jumpToIssue(nextIssue);
			}
		}
	}, [issueActionByKey, issueNavigationQueue, jumpToIssue]);

	if (!packagePreviews.length) return null;
	if (!pkg) return null;
	const itemMatchState = itemMatchStatusByPackage[pkg.packageNumber];
	const isUnmatchedItem = itemMatchState?.status === "unmatched";
	const isMatchedItem = itemMatchState?.status === "matched";
	const numericQuantity = Number(pkg.quantity);
	const isQuantityValid =
		Number.isFinite(numericQuantity) &&
		Number.isInteger(numericQuantity) &&
		numericQuantity > 0;
	const normalizedBoxTypeLabel = normalizeLabel(pkg.boxTypeLabel);
	const isBaseOnlyPackage = normalizedBoxTypeLabel.includes("baseonly");
	const isV54Template = templateMode === "v54plus";

	const boxTypeColumn = shiftColumn("C", templateMode);
	const packingTypeColumn = shiftColumn("AB", templateMode);
	const seiCategoryColumn =
		templateMode === "v54plus" ? "C" : shiftColumn("C", templateMode);
	const seiProtectionColumn =
		templateMode === "v54plus" ? "D" : shiftColumn("D", templateMode);
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
				<button
					type="button"
					onClick={() => onPackageRemove(pkg.packageNumber)}
					className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
				>
					Remove Box {pkg.packageNumber}
				</button>
			</div>
			<div className="flex flex-wrap gap-2 mb-4">
				{packagePreviews.map((item, index) => {
					const issueCount = (packageIssueMessages[item.packageNumber] || [])
						.length;
					const hasIssues = issueCount > 0;
					const isActive = activePackage === index;
					const tabClass = hasIssues
						? isActive
							? "border-red-600 bg-red-50 text-red-700"
							: "border-red-200 bg-red-50/50 text-red-700"
						: isActive
							? "border-blue-600 bg-blue-50 text-blue-700"
							: "border-gray-200 text-gray-600";

					return (
						<button
							key={`pkg-tab-${item.packageNumber}`}
							type="button"
							onClick={() => setActivePackage(index)}
							className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border transition-colors ${tabClass}`}
						>
							Box {item.packageNumber}
							{hasIssues && (
								<span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
									{issueCount}
								</span>
							)}
						</button>
					);
				})}
			</div>

			{currentPackageIssueActions.length > 0 && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
					<p className="font-semibold">Box {pkg.packageNumber} issues</p>
					<div className="mt-2 space-y-2">
						{currentPackageIssueActions.map((issue) => (
							<div
								key={issue.key}
								className="flex flex-col gap-2 rounded-md border border-red-200 bg-white p-2 md:flex-row md:items-center md:justify-between"
							>
								<p className="text-[12px] text-red-800">{issue.message}</p>
								<div className="flex items-center gap-1">
									{issue.targetId && (
										<button
											type="button"
											onClick={() => startIssueNavigationFrom(issue.key)}
											className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
										>
											Go to issue
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="space-y-3 text-xs text-gray-700">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<p className="text-xs text-gray-500">Quantity (col A)</p>
						<NumberInput
							inputId={getPackageInputId(pkg.packageNumber, "quantity")}
							value={pkg.quantity}
							onChange={(value) =>
								onPackageFieldChange(pkg.packageNumber, "quantity", value)
							}
						/>
						{!isQuantityValid && (
							<p className="mt-1 text-xs text-red-600">
								Quantity must be a positive whole number. Update it or remove
								this package.
							</p>
						)}
					</div>
					<div>
						<p className="text-xs text-gray-500">Destination</p>
						<input
							type="text"
							value={pkg.destination || ""}
							onChange={(event) =>
								onPackageFieldChange(
									pkg.packageNumber,
									"destination",
									event.target.value,
								)
							}
							placeholder="e.g. MZC"
							className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<p className="text-xs text-gray-500">
							Box type (col {boxTypeColumn})
						</p>
						<input
							id={getPackageInputId(pkg.packageNumber, "boxType")}
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
							<p className="mt-1 text-xs text-amber-600">
								Not found in box types.
							</p>
						)}
					</div>
					{isV54Template ? (
						<>
							<div>
								<p className="text-xs text-gray-500">
									SEI category (col {seiCategoryColumn})
								</p>
								<select
									id={getPackageInputId(pkg.packageNumber, "seiCategory")}
									value={pkg.seiCategoryId ?? ""}
									onChange={(event) => {
										const raw = event.target.value;
										onSeiCategoryChange(
											pkg.packageNumber,
											raw ? Number(raw) : null,
										);
									}}
									className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="">Select SEI category...</option>
									{pkg.seiCategoryOptions.map((option) => (
										<option key={option.id} value={option.id}>
											{option.label}
										</option>
									))}
								</select>
								<p className="mt-1 text-[11px] text-gray-500">
									From table: sei_categories
								</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">
									SEI protection (col {seiProtectionColumn})
								</p>
								<select
									id={getPackageInputId(pkg.packageNumber, "seiProtection")}
									value={pkg.seiProtectionId ?? ""}
									onChange={(event) => {
										const raw = event.target.value;
										onSeiProtectionChange(
											pkg.packageNumber,
											raw ? Number(raw) : null,
										);
									}}
									className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="">Select SEI protection...</option>
									{pkg.seiProtectionOptions.map((option) => (
										<option key={option.id} value={option.id}>
											{option.label}
										</option>
									))}
								</select>
								<p className="mt-1 text-[11px] text-gray-500">
									From table: sei_protection
								</p>
								{!pkg.packingTypeResolved && (
									<p className="mt-1 text-xs text-amber-600">
										Select both SEI category and SEI protection.
									</p>
								)}
								{pkg.hasMatchedPackingOptions && (
									<button
										type="button"
										onClick={() =>
											onPackingTypeOptionsToggle(pkg.packageNumber)
										}
										className="mt-1 text-[11px] text-blue-600 hover:text-blue-700"
									>
										{pkg.showAllPackingOptions
											? "Show matched options"
											: "Show all options"}
									</button>
								)}
							</div>
						</>
					) : (
						<>
							<div>
								<p className="text-xs text-gray-500">
									Packing type (col {packingTypeColumn})
								</p>
								<select
									id={getPackageInputId(pkg.packageNumber, "packingType")}
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
										onClick={() =>
											onPackingTypeOptionsToggle(pkg.packageNumber)
										}
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
						</>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<p className="text-xs text-gray-500">Item designation (col B)</p>
						<input
							id={getPackageInputId(pkg.packageNumber, "designation")}
							type="text"
							value={pkg.designation || ""}
							onChange={(event) =>
								onPackageFieldChange(
									pkg.packageNumber,
									"designation",
									event.target.value,
								)
							}
							className={`mt-1 w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 ${
								isUnmatchedItem
									? "border-red-300 bg-red-50 focus:ring-red-500"
									: isMatchedItem
										? "border-green-300 bg-green-50 focus:ring-green-500"
										: "border-gray-300 focus:ring-blue-500"
							}`}
						/>
						{isMatchedItem && (
							<p className="mt-1 text-xs text-green-700">
								Linked to client item: {itemMatchState?.matchedItemNumber}
							</p>
						)}
						{isUnmatchedItem && (
							<p className="mt-1 text-xs text-red-700">
								Not found in client items DB. Keep as normal package item, edit
								and fetch again, or clear this field.
							</p>
						)}
					</div>
					<div>
						<p className="text-xs text-gray-500">Static ID (Reference)</p>
						<input
							type="text"
							readOnly
							value={pkg.ipacReference || ""}
							className="mt-1 w-full px-2 py-1.5 border border-gray-200 bg-gray-50 rounded-lg text-xs text-gray-600 focus:outline-none"
						/>
						<p className="mt-1 text-[10px] text-gray-400">
							Generated based on destination, tag, and box number/item number.
						</p>
					</div>
				</div>

				{numericQuantity > 1 && isQuantityValid && (
					<div className="pt-3 border-t border-gray-100">
						<div className="flex items-center justify-between mb-2">
							<p className="text-xs font-semibold text-gray-700">
								Per-Box Destination Overrides ({numericQuantity} boxes)
							</p>
							<button
								type="button"
								onClick={() => setShowInstanceOverrides(!showInstanceOverrides)}
								className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
							>
								{showInstanceOverrides
									? "Hide details"
									: "Configure individual boxes"}
							</button>
						</div>

						{showInstanceOverrides && (
							<div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
								<p className="text-[11px] text-gray-500 mb-2 italic">
									Use these fields if some boxes in this set go to a different
									destination than "{pkg.destination || "the default"}".
								</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
									{Array.from({ length: numericQuantity }).map((_, i) => {
										const instanceNum = i + 1;
										const override = pkg.instanceOverrides?.[instanceNum];
										return (
											<div
												key={`instance-override-${pkg.packageNumber}-${instanceNum}`}
												className="flex flex-col gap-1"
											>
												<label
													htmlFor={`instance-dest-${pkg.packageNumber}-${instanceNum}`}
													className="text-[10px] font-medium text-gray-600"
												>
													Box #{instanceNum} Destination
												</label>
												<input
													id={`instance-dest-${pkg.packageNumber}-${instanceNum}`}
													type="text"
													value={override?.destination || ""}
													onChange={(e) =>
														onInstanceOverrideChange(
															pkg.packageNumber,
															instanceNum,
															e.target.value || null,
														)
													}
													placeholder={pkg.destination || "Destination"}
													className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
												/>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<p className="text-xs text-gray-500">
							Item dimensions ({itemDimColumns})
						</p>
						{renderDimensionInputs(pkg, "item", onPackageFieldChange)}
					</div>
					<div>
						<p className="text-xs text-gray-500">
							Internal dimensions ({internalDimColumns})
						</p>
						{renderDimensionInputs(pkg, "internal", onPackageFieldChange)}
					</div>
					<div>
						<p className="text-xs text-gray-500">
							External dimensions ({externalDimColumns})
						</p>
						{renderDimensionInputs(pkg, "external", onPackageFieldChange)}
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<p className="text-xs text-gray-500">
							Net weight ({netWeightColumn})
						</p>
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

				<div
					id={getPackageInputId(pkg.packageNumber, "manufacturing")}
					className="pt-3 border-t border-gray-100"
				>
					<p className="text-xs font-semibold text-gray-700 mb-2">
						Manufacturing (securing)
					</p>
					<ManufacturingSectionsPanel
						pkg={pkg}
						isBaseOnlyPackage={isBaseOnlyPackage}
						partIssueMessages={partIssueMessages}
						onManufacturingTypeChange={onManufacturingTypeChange}
						onManufacturingFieldChange={onManufacturingFieldChange}
						onManufacturingOptionsToggle={onManufacturingOptionsToggle}
						onManufacturingPartAdd={onManufacturingPartAdd}
						onManufacturingPartRemove={onManufacturingPartRemove}
					/>
				</div>

				<div className="pt-3 border-t border-gray-100">
					<p className="text-xs font-semibold text-gray-700 mb-2">
						Securing materials
					</p>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{pkg.securing?.length ? (
							pkg.securing.map((part, index) => (
								<div key={part.key} className="space-y-2">
									<ManufacturingPartCard
										label={`Securing ${index + 1}`}
										part={part}
										issues={partIssueMessages[part.key] || []}
										selectId={getPartTypeSelectId(part.key)}
										fieldInputIds={{
											quantity: getPartInputId(part.key, "quantity"),
											width: getPartInputId(part.key, "width"),
											thickness: getPartInputId(part.key, "thickness"),
										}}
										showFields={["quantity", "width", "thickness"]}
										onManufacturingTypeChange={onManufacturingTypeChange}
										onManufacturingFieldChange={onManufacturingFieldChange}
										onManufacturingOptionsToggle={onManufacturingOptionsToggle}
									/>
								</div>
							))
						) : (
							<p className="text-xs text-gray-500">
								No securing materials detected.
							</p>
						)}
					</div>
				</div>

				<div className="pt-3 border-t border-gray-100">
					<p className="text-xs font-semibold text-gray-700 mb-2">
						Accessories
					</p>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{pkg.accessories?.length ? (
							pkg.accessories.map((part, index) => (
								<div key={part.key} className="space-y-2">
									<ManufacturingPartCard
										label={`Accessory ${index + 1}`}
										part={part}
										issues={partIssueMessages[part.key] || []}
										selectId={getPartTypeSelectId(part.key)}
										fieldInputIds={{
											quantity: getPartInputId(part.key, "quantity"),
										}}
										showFields={["quantity"]}
										onManufacturingTypeChange={onManufacturingTypeChange}
										onManufacturingFieldChange={onManufacturingFieldChange}
										onManufacturingOptionsToggle={onManufacturingOptionsToggle}
									/>
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
