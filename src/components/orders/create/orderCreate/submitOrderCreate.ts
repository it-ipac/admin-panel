import type { QueryClient } from "@tanstack/react-query";
import { db } from "../../../../lib/supabase";
import type { MaterialVariantOption, ResolvedPackageRow } from "./types";

interface SubmitParams {
	resolvedPackages: ResolvedPackageRow[];
	selectedClientId: string;
	selectedCategoryIds: string[];
	clientMode: "existing" | "new";
	createClient: () => Promise<{ id: string }>;
	createOrder: (payload: { clientId: string }) => Promise<{ id: string }>;
	createOrderCategoryMappings: (payload: {
		orderId: string;
		categoryIds: string[];
	}) => Promise<{ error: any }>;
	materialVariantMap: Map<string, MaterialVariantOption>;
	queryClient: QueryClient;
}

export const submitOrderCreate = async ({
	resolvedPackages,
	selectedClientId,
	selectedCategoryIds,
	clientMode,
	createClient,
	createOrder,
	createOrderCategoryMappings,
	materialVariantMap,
	queryClient,
}: SubmitParams) => {
	const missingQuantityPackages = resolvedPackages
		.map((pkg) => {
			const missingSecuring = pkg.securing?.filter(
				(part) =>
					part?.typeId &&
					(part.quantity === null || part.quantity === undefined),
			);
			const missingAccessories = pkg.accessories?.filter(
				(part) =>
					part?.typeId && (part.amount === null || part.amount === undefined),
			);
			return {
				packageNumber: pkg.packageNumber,
				missingSecuringCount: missingSecuring?.length || 0,
				missingAccessoriesCount: missingAccessories?.length || 0,
			};
		})
		.filter(
			(pkg) => pkg.missingSecuringCount > 0 || pkg.missingAccessoriesCount > 0,
		);

	if (missingQuantityPackages.length > 0) {
		const packageList = missingQuantityPackages
			.map((pkg) => `#${pkg.packageNumber}`)
			.join(", ");
		throw new Error(
			`Missing quantities for selected materials in package(s): ${packageList}. Please fill in quantities before creating the order.`,
		);
	}

	const negativeMaterialQuantityPackages = resolvedPackages
		.map((pkg) => {
			const negativeSecuringCount = pkg.securing?.filter(
				(part) =>
					part?.typeId &&
					part.quantity !== null &&
					part.quantity !== undefined &&
					part.quantity < 0,
			).length;
			const negativeAccessoriesCount = pkg.accessories?.filter(
				(part) =>
					part?.typeId &&
					part.amount !== null &&
					part.amount !== undefined &&
					part.amount < 0,
			).length;
			return {
				packageNumber: pkg.packageNumber,
				negativeCount:
					(negativeSecuringCount || 0) + (negativeAccessoriesCount || 0),
			};
		})
		.filter((pkg) => pkg.negativeCount > 0);

	if (negativeMaterialQuantityPackages.length > 0) {
		const packageList = negativeMaterialQuantityPackages
			.map((pkg) => `#${pkg.packageNumber}`)
			.join(", ");
		throw new Error(
			`Negative material quantities found in package(s): ${packageList}. Quantity must be 0 or greater.`,
		);
	}

	const getVariantUnitId = (
		variantId: string | null | undefined,
	): string | null => {
		if (!variantId) return null;
		const variant = materialVariantMap.get(variantId);
		const unitValue = Array.isArray(variant?.unit)
			? variant.unit[0]
			: variant?.unit;
		return unitValue?.id || null;
	};

	const missingUnitPackages = resolvedPackages
		.map((pkg) => {
			const missingSecuringUnits = pkg.securing.filter((part) => {
				const hasData =
					part.quantity !== null ||
					part.width !== null ||
					part.thickness !== null;
				return (
					hasData &&
					!!part.typeId &&
					part.quantity !== null &&
					part.quantity !== undefined &&
					!getVariantUnitId(part.typeId)
				);
			});

			const missingAccessoryUnits = pkg.accessories.filter((part) => {
				const hasData = part.typeLabel || part.amount !== null;
				return (
					hasData &&
					!!part.typeId &&
					part.amount !== null &&
					part.amount !== undefined &&
					!getVariantUnitId(part.typeId)
				);
			});

			return {
				packageNumber: pkg.packageNumber,
				missingUnitsCount:
					missingSecuringUnits.length + missingAccessoryUnits.length,
			};
		})
		.filter((pkg) => pkg.missingUnitsCount > 0);

	if (missingUnitPackages.length > 0) {
		const packageList = missingUnitPackages
			.map((pkg) => `#${pkg.packageNumber}`)
			.join(", ");
		throw new Error(
			`Missing unit mapping for selected material(s) in package(s): ${packageList}. Please assign a unit to those variants in inventory before creating the order.`,
		);
	}

	let clientId = selectedClientId;
	if (clientMode === "new") {
		const createdClient = await createClient();
		clientId = createdClient.id;
	}

	const normalizedInstanceCountByPackage = new Map<number, number>();
	const invalidQuantityPackages: number[] = [];
	for (const pkg of resolvedPackages) {
		const rawQty = Number(pkg.quantity);
		if (!Number.isFinite(rawQty) || rawQty <= 0 || !Number.isInteger(rawQty)) {
			invalidQuantityPackages.push(pkg.packageNumber);
			continue;
		}
		normalizedInstanceCountByPackage.set(pkg.packageNumber, rawQty);
	}

	if (invalidQuantityPackages.length > 0) {
		throw new Error(
			`Invalid box quantity in column A for package(s): ${invalidQuantityPackages
				.map((pkgNumber) => `#${pkgNumber}`)
				.join(", ")}. Please provide a positive whole number for each package row.`,
		);
	}

	const order = await createOrder({ clientId });
	const normalizedCategoryIds = Array.from(
		new Set((selectedCategoryIds || []).filter(Boolean)),
	);
	if (normalizedCategoryIds.length > 0) {
		const { error: categoryMappingError } = await createOrderCategoryMappings({
			orderId: order.id,
			categoryIds: normalizedCategoryIds,
		});
		if (categoryMappingError) throw categoryMappingError;
	}

	const { data: createdPackages, error: packagesError } =
		await db.createOrderPackages({
			order_id: order.id,
			package_numbers: resolvedPackages.map((pkg) => pkg.packageNumber),
			status: "design",
		});
	if (packagesError) throw packagesError;

	const packageByNumber = new Map<
		number,
		{ id: string; package_number: number }
	>();
	(createdPackages || []).forEach((pkg: any) => {
		packageByNumber.set(pkg.package_number, {
			id: pkg.id,
			package_number: pkg.package_number,
		});
	});

	const overviewRows = resolvedPackages
		.map((pkg) => {
			const normalizedQty = normalizedInstanceCountByPackage.get(pkg.packageNumber);
			if (!normalizedQty) return null;
			return {
				order_id: order.id,
				pkg_number: pkg.packageNumber,
				status: "design" as const,
				quantity: normalizedQty,
				quantity_packed: 0,
				description: pkg.designation?.trim() || null,
			};
		})
		.filter((row): row is NonNullable<typeof row> => !!row);

	const { data: createdOverviews, error: overviewsError } =
		await db.createOrderPackageOverviews(overviewRows);
	if (overviewsError) throw overviewsError;

	const overviewIdByPackageNumber = new Map<number, string>();
	(createdOverviews || []).forEach((overview: any) => {
		overviewIdByPackageNumber.set(Number(overview.pkg_number), String(overview.id));
	});

	const missingOverviewPackages = resolvedPackages
		.map((pkg) => pkg.packageNumber)
		.filter((packageNumber) => !overviewIdByPackageNumber.has(packageNumber));
	if (missingOverviewPackages.length > 0) {
		throw new Error(
			`Failed to create package overview row(s) for package(s): ${missingOverviewPackages
				.map((pkgNumber) => `#${pkgNumber}`)
				.join(", ")}.`,
		);
	}

	const instanceRows: Array<{
		order_pkg_overview_id: string;
		order_package_id: string;
		instance_number: number;
		status: "design";
		packed_at: null;
	}> = [];

	for (const pkg of resolvedPackages) {
		const orderPackage = packageByNumber.get(pkg.packageNumber);
		const overviewId = overviewIdByPackageNumber.get(pkg.packageNumber);
		const instanceCount = normalizedInstanceCountByPackage.get(pkg.packageNumber);
		if (!orderPackage || !overviewId || !instanceCount) {
			throw new Error(
				`Could not resolve package mapping for package #${pkg.packageNumber}.`,
			);
		}

		for (let instanceNumber = 1; instanceNumber <= instanceCount; instanceNumber += 1) {
			instanceRows.push({
				order_pkg_overview_id: overviewId,
				order_package_id: orderPackage.id,
				instance_number: instanceNumber,
				status: "design",
				packed_at: null,
			});
		}
	}

	const instanceChunkSize = 500;
	for (let i = 0; i < instanceRows.length; i += instanceChunkSize) {
		const chunk = instanceRows.slice(i, i + instanceChunkSize);
		const { error: instancesError } = await db.createOrderPackageInstances(chunk);
		if (instancesError) throw instancesError;
	}

	for (const pkg of resolvedPackages) {
		const orderPackage = packageByNumber.get(pkg.packageNumber);
		if (!orderPackage) continue;

		const { data: originalInfo, error: originalError } =
			await db.createPackageInfo({
				internal_length: pkg.internal_length,
				internal_width: pkg.internal_width,
				internal_height: pkg.internal_height,
				external_length: pkg.external_length,
				external_width: pkg.external_width,
				external_height: pkg.external_height,
				quantity: normalizedInstanceCountByPackage.get(pkg.packageNumber) || 1,
				packing_type_id: pkg.packing_type_id,
				sei_category: pkg.sei_category,
				sei_protection: pkg.sei_protection,
				box_type_id: pkg.box_type_id,
				tare: pkg.tare,
				net_weight: pkg.net_weight,
				gross_weight: pkg.gross_weight,
			});
		if (originalError) throw originalError;

		const { data: finalInfo, error: finalError } = await db.createPackageInfo(
			{},
		);
		if (finalError) throw finalError;

		const { error: updateError } = await db.updateOrderPackageInfo({
			order_package_id: orderPackage.id,
			original_pkg_info: originalInfo?.id || null,
			final_pkg_info: finalInfo?.id || null,
		});
		if (updateError) throw updateError;

		const designation = pkg.designation?.trim();
		if (designation) {
			const { error: itemsError } = await db.createPackageItems([
				{
					order_package_id: orderPackage.id,
					quantity: 1,
					designation,
					length: pkg.item_length,
					width: pkg.item_width,
					height: pkg.item_height,
				},
			]);
			if (itemsError) throw itemsError;
		}

		const createBeamIfNeeded = async (part: any) => {
			const hasData =
				part.typeLabel ||
				part.quantity !== null ||
				part.width !== null ||
				part.thickness !== null ||
				part.space !== null;
			if (!hasData) return null;
			if (!part.typeId)
				throw new Error("Missing manufacturing material selection");
			const { data, error } = await db.createBeam({
				quantity: part.quantity,
				type: part.typeId,
				width: part.width,
				thickness: part.thickness,
				space: part.space,
			});
			if (error) throw error;
			return data?.id || null;
		};

		const createSide = async (
			sideKey: "big_sides" | "small_sides" | "lid" | "base",
			side: any,
			includeSkids: boolean,
		) => {
			const horizontalId = await createBeamIfNeeded(side.horizontal);
			const verticalId = await createBeamIfNeeded(side.vertical);
			const skidsId = includeSkids
				? await createBeamIfNeeded(side.skids)
				: null;
			const { data: template, error: templateError } =
				await db.createSecuringTemplate({
					quantity: side.template.quantity,
					type_id: side.template.typeId,
					thickness: side.template.thickness,
					horizontal_bar: horizontalId,
					vertical_bar: verticalId,
					skids: skidsId,
				});
			if (templateError) throw templateError;
			const { error: securingError } = await db.createOrderPackageSecuring({
				order_package_id: orderPackage.id,
				securing_template_id: template?.id || null,
				securing_side: sideKey,
				is_final: false,
			});
			if (securingError) throw securingError;
			const { data: finalTemplate, error: finalTemplateError } =
				await db.createSecuringTemplate({});
			if (finalTemplateError) throw finalTemplateError;
			const { error: finalSecuringError } = await db.createOrderPackageSecuring(
				{
					order_package_id: orderPackage.id,
					securing_template_id: finalTemplate?.id || null,
					securing_side: sideKey,
					is_final: true,
				},
			);
			if (finalSecuringError) throw finalSecuringError;
		};

		await createSide("big_sides", pkg.manufacturing.big, false);
		await createSide("small_sides", pkg.manufacturing.small, false);
		await createSide("lid", pkg.manufacturing.lid, false);
		await createSide("base", pkg.manufacturing.base, true);

		const securingPayload = pkg.securing
			.filter((part) => {
				const hasData =
					part.quantity !== null ||
					part.width !== null ||
					part.thickness !== null;
				return (
					hasData &&
					!!part.typeId &&
					part.quantity !== null &&
					part.quantity !== undefined
				);
			})
			.map((part) => ({
				order_package_id: orderPackage.id,
				material_variant_id: part.typeId as string,
				material_type: "Securing",
				is_final: false,
				quantity: part.quantity ?? 0,
				unit_id: getVariantUnitId(part.typeId),
				length: null,
				width: part.width ?? null,
				height: part.thickness ?? null,
				comment: null,
			}));
		if (securingPayload.length > 0) {
			const { error } = await db.createOrderPackageMaterials(securingPayload);
			if (error) throw error;
		}

		const accessoryPayload = pkg.accessories
			.filter((part) => {
				const hasData = part.typeLabel || part.amount !== null;
				return (
					hasData &&
					!!part.typeId &&
					part.amount !== null &&
					part.amount !== undefined
				);
			})
			.map((part) => {
				return {
					order_package_id: orderPackage.id,
					material_variant_id: part.typeId as string,
					material_type: "Accessories",
					is_final: false,
					quantity: part.amount ?? 0,
					unit_id: getVariantUnitId(part.typeId),
					length: null,
					width: null,
					height: null,
					comment: null,
				};
			});
		if (accessoryPayload.length > 0) {
			const { error } = await db.createOrderPackageMaterials(accessoryPayload);
			if (error) throw error;
		}
	}

	void Promise.allSettled([
		queryClient.invalidateQueries({ queryKey: ["orders"] }),
		queryClient.invalidateQueries({ queryKey: ["clients"] }),
	]);
};
