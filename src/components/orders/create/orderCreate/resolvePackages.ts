import type { PackagePreview } from "../OrderCreateConfirmDialog.tsx";
import type {
	BoxTypeOption,
	MaterialVariantOption,
	PackingTypeOption,
	RawPackageRow,
	ResolvedPackageRow,
} from "./types";
import { WOOD_OUT_OF_RANGE_ID } from "./types";
import {
	isGenericWood,
	isWoodVariantOption,
	nearlyEqual,
	normalizePackingTypeValue,
	normalizeVariantName,
} from "./utils";

interface ResolveParams {
	rawPackages: RawPackageRow[];
	boxTypes: BoxTypeOption[];
	packingTypes: PackingTypeOption[];
	woodVariants: MaterialVariantOption[];
	bodyVariants: MaterialVariantOption[];
	materialVariants: MaterialVariantOption[];
	packingTypeOverrides: Record<number, string>;
	packingTypeShowAll: Record<number, boolean>;
	manufacturingTypeOverrides: Record<string, string>;
	manufacturingShowAll: Record<string, boolean>;
}

export const resolvePackages = ({
	rawPackages,
	boxTypes,
	packingTypes,
	woodVariants,
	bodyVariants,
	materialVariants,
	packingTypeOverrides,
	packingTypeShowAll,
	manufacturingTypeOverrides,
	manufacturingShowAll,
}: ResolveParams) => {
	const normalizeBoxTypeValue = (value: string | null | undefined): string =>
		(value || "")
			.toLowerCase()
			.replace(/\bpacking\b/g, "pkg")
			.replace(/\bpackage\b/g, "pkg")
			.replace(/[^a-z0-9]/g, "");

	const isBaseOnlyPackage = (
		boxTypeLabel: string | null | undefined,
	): boolean => {
		const normalizedLabel = normalizeBoxTypeValue(boxTypeLabel);
		return normalizedLabel.includes("baseonly");
	};

	const boxTypeMap = new Map<string, BoxTypeOption>();
	const boxTypeNormalizedMap = new Map<string, BoxTypeOption>();
	boxTypes.forEach((box) => {
		if (!box.name) return;
		const rawName = box.name.trim();
		boxTypeMap.set(rawName.toLowerCase(), box);
		boxTypeNormalizedMap.set(normalizeBoxTypeValue(rawName), box);
	});

	const previews: PackagePreview[] = rawPackages.map((pkg) => {
		const rawBoxTypeLabel = pkg.boxTypeLabel?.trim() || "";
		const normalizedBoxTypeLabel = normalizeBoxTypeValue(rawBoxTypeLabel);
		const boxType = rawBoxTypeLabel
			? boxTypeMap.get(rawBoxTypeLabel.toLowerCase()) ||
				boxTypeNormalizedMap.get(normalizedBoxTypeLabel) ||
				boxTypes.find((option) => {
					if (!option.name) return false;
					const normalizedOption = normalizeBoxTypeValue(option.name);
					return (
						normalizedOption.includes(normalizedBoxTypeLabel) ||
						normalizedBoxTypeLabel.includes(normalizedOption)
					);
				}) ||
				null
			: null;

		const rawPackingNormalized = normalizePackingTypeValue(pkg.packingTypeRaw);
		const matchedPackingOptions = rawPackingNormalized
			? packingTypes.filter((packing) => {
					const normalized = normalizePackingTypeValue(packing.code);
					if (!normalized) return false;
					if (normalized === rawPackingNormalized) return true;
					if (/^\d+[A-Z]$/.test(rawPackingNormalized)) {
						return normalized.startsWith(rawPackingNormalized);
					}
					return false;
				})
			: [];

		const shouldShowAll = !!packingTypeShowAll[pkg.packageNumber];
		const packingOptions = shouldShowAll
			? packingTypes
			: matchedPackingOptions.length > 0
				? matchedPackingOptions
				: packingTypes;

		const overrideId = packingTypeOverrides[pkg.packageNumber];
		const selectedPacking = overrideId
			? packingTypes.find((option) => option.id === overrideId)
			: matchedPackingOptions.length === 1
				? matchedPackingOptions[0]
				: null;

		const buildTypePreview = (
			label: string | null,
			key: string,
			options: MaterialVariantOption[],
			extra?: {
				quantity?: number | null;
				thickness?: number | null;
				width?: number | null;
				space?: number | null;
			},
		) => {
			const showAll = !!manufacturingShowAll[key];
			const normalizedLabel = normalizeVariantName(label);
			const isWood = isGenericWood(label);
			const hasDims = extra?.width != null && extra?.thickness != null;
			const scopedOptions = isWood
				? options.filter(isWoodVariantOption)
				: options;
			const matchedByNameExact = scopedOptions.filter(
				(variant) =>
					normalizeVariantName(variant.variant_name) === normalizedLabel,
			);
			const matchedByNameFuzzy =
				matchedByNameExact.length === 0
					? scopedOptions.filter((variant) => {
							const normalizedVariant = normalizeVariantName(
								variant.variant_name,
							);
							return (
								normalizedVariant.includes(normalizedLabel) ||
								normalizedLabel.includes(normalizedVariant)
							);
						})
					: [];

			if (
				key.includes("accessory") &&
				label &&
				matchedByNameExact.length === 0 &&
				matchedByNameFuzzy.length === 0
			) {
				console.log(
					`[Match Fail] Label: "${label}" Normalized: "${normalizedLabel}"`,
				);
				console.log(
					`[Match Fail] Options Available: ${options.length}, Scoped: ${scopedOptions.length}`,
				);
				if (options.length > 0) {
					console.log(
						"[Match Fail] Sample DB Variants (Normalized):",
						options
							.slice(0, 5)
							.map((v) => normalizeVariantName(v.variant_name)),
					);
				}
			}

			const matchedByName =
				matchedByNameExact.length > 0 ? matchedByNameExact : matchedByNameFuzzy;
			const matchedByDims =
				isWood && hasDims
					? scopedOptions.filter(
							(variant) =>
								nearlyEqual(variant.width ?? null, extra?.width ?? null) &&
								nearlyEqual(
									variant.thickness ?? null,
									extra?.thickness ?? null,
								),
						)
					: [];
			const matchedByDimsSwap =
				isWood && hasDims
					? scopedOptions.filter(
							(variant) =>
								nearlyEqual(variant.width ?? null, extra?.thickness ?? null) &&
								nearlyEqual(variant.thickness ?? null, extra?.width ?? null),
						)
					: [];
			const matched = isWood
				? matchedByDims.length > 0
					? matchedByDims
					: matchedByDimsSwap
				: matchedByName;

			const baseOptions = showAll
				? scopedOptions
				: matched.length > 0
					? matched
					: scopedOptions;
			const selected = manufacturingTypeOverrides[key]
				? scopedOptions.find(
						(variant) => variant.id === manufacturingTypeOverrides[key],
					)
				: isWood
					? matched[0] ||
						scopedOptions.find(
							(variant) => variant.id === WOOD_OUT_OF_RANGE_ID,
						) ||
						null
					: matched.length === 1
						? matched[0]
						: null;

			return {
				key,
				typeLabel: label,
				typeId: selected?.id || null,
				typeResolved: !!selected,
				typeOptions: baseOptions.map((variant) => ({
					id: variant.id,
					label: variant.variant_name || "Unnamed",
				})),
				hasMatchedOptions: matched.length > 0,
				showAllOptions: showAll,
				quantity: extra?.quantity ?? null,
				thickness: extra?.thickness ?? null,
				width: extra?.width ?? null,
				space: extra?.space ?? null,
			};
		};

		const securing = pkg.securing.map((part, index) =>
			buildTypePreview(
				part.typeLabel,
				`pkg:${pkg.packageNumber}:securing:${index}`,
				woodVariants,
				{
					quantity: part.quantity,
					width: part.width,
					thickness: part.thickness,
				},
			),
		);
		const accessories = pkg.accessories.map((part, index) =>
			buildTypePreview(
				part.typeLabel,
				`pkg:${pkg.packageNumber}:accessory:${index}`,
				materialVariants,
				{
					quantity: part.amount,
				},
			),
		);

		return {
			packageNumber: pkg.packageNumber,
			rowIndex: pkg.rowIndex,
			designation: pkg.designation,
			quantity: pkg.quantity,
			boxTypeLabel: pkg.boxTypeLabel,
			boxTypeResolved: !!boxType,
			boxTypeId: boxType?.id || null,
			packingTypeRaw: pkg.packingTypeRaw,
			packingTypeCode: pkg.packingTypeCode,
			packingTypeLabel:
				selectedPacking?.name ||
				selectedPacking?.code ||
				pkg.packingTypeCode ||
				pkg.packingTypeRaw ||
				"—",
			packingTypeResolved: !!selectedPacking,
			packingTypeId: selectedPacking?.id || null,
			packingTypeOptions: packingOptions.map((option) => ({
				id: option.id,
				label: `${option.code || "—"}${option.name ? ` - ${option.name}` : ""}`,
			})),
			hasMatchedPackingOptions: matchedPackingOptions.length > 0,
			showAllPackingOptions: shouldShowAll,
			internal: {
				length: pkg.internal_length,
				width: pkg.internal_width,
				height: pkg.internal_height,
			},
			item: {
				length: pkg.item_length,
				width: pkg.item_width,
				height: pkg.item_height,
			},
			external: {
				length: pkg.external_length,
				width: pkg.external_width,
				height: pkg.external_height,
			},
			netWeight: pkg.net_weight,
			tare: pkg.tare,
			grossWeight: pkg.gross_weight,
			manufacturing: {
				big: {
					template: buildTypePreview(
						pkg.manufacturing.big.typeLabel,
						`pkg:${pkg.packageNumber}:big:template`,
						bodyVariants,
						{
							quantity: pkg.manufacturing.big.quantity,
							thickness: pkg.manufacturing.big.thickness,
						},
					),
					horizontal: buildTypePreview(
						pkg.manufacturing.big.horizontal.typeLabel,
						`pkg:${pkg.packageNumber}:big:horizontal`,
						woodVariants,
						pkg.manufacturing.big.horizontal,
					),
					vertical: buildTypePreview(
						pkg.manufacturing.big.vertical.typeLabel,
						`pkg:${pkg.packageNumber}:big:vertical`,
						woodVariants,
						pkg.manufacturing.big.vertical,
					),
				},
				small: {
					template: buildTypePreview(
						pkg.manufacturing.small.typeLabel,
						`pkg:${pkg.packageNumber}:small:template`,
						bodyVariants,
						{
							quantity: pkg.manufacturing.small.quantity,
							thickness: pkg.manufacturing.small.thickness,
						},
					),
					horizontal: buildTypePreview(
						pkg.manufacturing.small.horizontal.typeLabel,
						`pkg:${pkg.packageNumber}:small:horizontal`,
						woodVariants,
						pkg.manufacturing.small.horizontal,
					),
					vertical: buildTypePreview(
						pkg.manufacturing.small.vertical.typeLabel,
						`pkg:${pkg.packageNumber}:small:vertical`,
						woodVariants,
						pkg.manufacturing.small.vertical,
					),
				},
				lid: {
					template: buildTypePreview(
						pkg.manufacturing.lid.typeLabel,
						`pkg:${pkg.packageNumber}:lid:template`,
						bodyVariants,
						{
							quantity: pkg.manufacturing.lid.quantity,
							thickness: pkg.manufacturing.lid.thickness,
						},
					),
					horizontal: buildTypePreview(
						pkg.manufacturing.lid.horizontal.typeLabel,
						`pkg:${pkg.packageNumber}:lid:horizontal`,
						woodVariants,
						pkg.manufacturing.lid.horizontal,
					),
					vertical: buildTypePreview(
						pkg.manufacturing.lid.vertical.typeLabel,
						`pkg:${pkg.packageNumber}:lid:vertical`,
						woodVariants,
						pkg.manufacturing.lid.vertical,
					),
				},
				base: {
					template: buildTypePreview(
						pkg.manufacturing.base.typeLabel,
						`pkg:${pkg.packageNumber}:base:template`,
						bodyVariants,
						{
							quantity: pkg.manufacturing.base.quantity,
							thickness: pkg.manufacturing.base.thickness,
						},
					),
					horizontal: buildTypePreview(
						pkg.manufacturing.base.horizontal.typeLabel,
						`pkg:${pkg.packageNumber}:base:horizontal`,
						woodVariants,
						pkg.manufacturing.base.horizontal,
					),
					vertical: buildTypePreview(
						pkg.manufacturing.base.vertical.typeLabel,
						`pkg:${pkg.packageNumber}:base:vertical`,
						woodVariants,
						pkg.manufacturing.base.vertical,
					),
					skids: buildTypePreview(
						pkg.manufacturing.base.skids.typeLabel,
						`pkg:${pkg.packageNumber}:base:skids`,
						woodVariants,
						pkg.manufacturing.base.skids,
					),
				},
			},
			securing,
			accessories,
		};
	});

	const resolvedPackages: ResolvedPackageRow[] = previews.map((preview) => ({
		packageNumber: preview.packageNumber,
		designation: preview.designation,
		quantity: preview.quantity,
		item_length: preview.item.length,
		item_width: preview.item.width,
		item_height: preview.item.height,
		box_type_id: (preview as any).boxTypeId,
		packing_type_id: preview.packingTypeId,
		internal_length: preview.internal.length,
		internal_width: preview.internal.width,
		internal_height: preview.internal.height,
		external_length: preview.external.length,
		external_width: preview.external.width,
		external_height: preview.external.height,
		net_weight: preview.netWeight,
		tare: preview.tare,
		gross_weight: preview.grossWeight,
		manufacturing: preview.manufacturing,
		securing: preview.securing.map((part) => ({
			typeId: part.typeId,
			quantity: part.quantity,
			width: part.width,
			thickness: part.thickness,
			typeLabel: part.typeLabel,
		})),
		accessories: preview.accessories.map((part) => ({
			typeId: part.typeId,
			amount: part.quantity,
			typeLabel: part.typeLabel,
		})),
	}));

	const missingBoxTypeCount = previews.filter(
		(preview) => !preview.boxTypeResolved,
	).length;
	const missingPackingTypeCount = previews.filter(
		(preview) => !preview.packingTypeResolved,
	).length;
	const barParts = previews.flatMap((preview) => {
		if (isBaseOnlyPackage(preview.boxTypeLabel)) {
			return [
				preview.manufacturing.base.horizontal,
				preview.manufacturing.base.vertical,
				preview.manufacturing.base.skids,
			];
		}

		return [
			preview.manufacturing.big.horizontal,
			preview.manufacturing.big.vertical,
			preview.manufacturing.small.horizontal,
			preview.manufacturing.small.vertical,
			preview.manufacturing.lid.horizontal,
			preview.manufacturing.lid.vertical,
			preview.manufacturing.base.horizontal,
			preview.manufacturing.base.vertical,
			preview.manufacturing.base.skids,
		];
	});
	const templateParts = previews.flatMap((preview) => {
		if (isBaseOnlyPackage(preview.boxTypeLabel)) {
			return [preview.manufacturing.base.template];
		}

		return [
			preview.manufacturing.big.template,
			preview.manufacturing.small.template,
			preview.manufacturing.lid.template,
			preview.manufacturing.base.template,
		];
	});
	const missingManufacturingCount = barParts.filter(
		(part) => part.typeLabel && !part.typeResolved,
	).length;
	const missingTemplateCount = templateParts.filter(
		(part) => part.typeLabel && !part.typeResolved,
	).length;
	const hasUnresolvedMappings =
		previews.some(
			(preview) => !preview.boxTypeResolved || !preview.packingTypeResolved,
		) || missingManufacturingCount > 0;

	return {
		packagePreviews: previews,
		resolvedPackages,
		hasUnresolvedMappings,
		missingBoxTypeCount,
		missingPackingTypeCount,
		missingManufacturingCount,
		missingTemplateCount,
	};
};
