import type { QueryClient } from "@tanstack/react-query";
import { db } from "../../../../lib/supabase";
import {
	buildClientItemLookup,
	matchPackageDesignations,
} from "./itemNumberMatching";
import type { MaterialVariantOption, ResolvedPackageRow } from "./types";
import { generateIpacReference, mapCategoryToTag } from "./utils";

interface SubmitParams {
	resolvedPackages: ResolvedPackageRow[];
	selectedClientId: string;
	clientNameForReference?: string | null;
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
	preferredItemLinksByPackage?: Record<
		number,
		{ itemId: string; itemNumber: string }
	>;
	generateRandomBoxIds?: boolean;
}

const wait = (ms: number) =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});

const isTransientNetworkError = (error: any) => {
	const message = String(error?.message || "").toLowerCase();
	const details = String(error?.details || "").toLowerCase();
	const hint = String(error?.hint || "").toLowerCase();
	const code = String(error?.code || "").toLowerCase();
	const status = Number(error?.status || error?.statusCode || 0);

	return (
		status === 429 ||
		status === 520 ||
		status === 522 ||
		status === 524 ||
		message.includes("failed to fetch") ||
		message.includes("networkerror") ||
		message.includes("err_failed") ||
		details.includes("failed to fetch") ||
		hint.includes("failed to fetch") ||
		code === "520"
	);
};

const withRetry = async <T>(
	operation: () => Promise<T>,
	maxAttempts = 3,
): Promise<T> => {
	let lastError: any;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			return await operation();
		} catch (error: any) {
			lastError = error;
			if (!isTransientNetworkError(error) || attempt === maxAttempts) {
				break;
			}

			await wait(300 * attempt);
		}
	}

	throw lastError;
};

const formatIpacClientCode = (clientName: string) => {
	const normalized = String(clientName || "")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "");

	if (normalized.length >= 2) return normalized.slice(0, 2);
	if (normalized.length === 1) return `${normalized}X`;
	return "XX";
};

const formatIpacDateCode = (date: Date) => {
	const yy = String(date.getFullYear()).slice(-2);
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	return `${yy}${mm}${dd}`;
};

const parseIpacSequence = (reference: unknown, prefix: string) => {
	const value = String(reference || "")
		.trim()
		.toUpperCase();
	const match = value.match(new RegExp(`^${prefix}-(\\d{4})$`));
	if (!match) return 0;
	const sequence = Number(match[1]);
	return Number.isFinite(sequence) && sequence > 0 ? sequence : 0;
};

export const submitOrderCreate = async ({
	resolvedPackages,
	selectedClientId,
	clientNameForReference,
	selectedCategoryIds,
	clientMode,
	createClient,
	createOrder,
	createOrderCategoryMappings,
	materialVariantMap,
	queryClient,
	preferredItemLinksByPackage,
	generateRandomBoxIds,
}: SubmitParams) => {
	const logStep = (step: string, payload?: unknown) => {
		if (payload !== undefined) {
			console.log(`[OrderCreate] ${step}`, payload);
			return;
		}
		console.log(`[OrderCreate] ${step}`);
	};

	logStep("Step 1/14 - Start submitOrderCreate", {
		packageCount: resolvedPackages.length,
		clientMode,
		selectedClientId,
	});

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

	logStep("Step 2/14 - Validation checks passed");

	let clientId = selectedClientId;
	if (clientMode === "new") {
		logStep("Step 3/14 - Creating new client");
		const createdClient = await createClient();
		clientId = createdClient.id;
		logStep("Step 3/14 - Created new client", { clientId });
	}

	let resolvedClientName = String(clientNameForReference || "").trim();
	if (!resolvedClientName) {
		const { data: clientRow, error: clientNameError } =
			await db.getClientNameById(clientId);
		if (clientNameError) throw clientNameError;
		resolvedClientName = String((clientRow as any)?.name || "").trim();
	}

	const ipacPrefix = `${formatIpacClientCode(resolvedClientName)}${formatIpacDateCode(new Date())}`;
	const { data: latestIpacRefRows, error: latestIpacRefError } =
		await db.getLatestIpacReferenceForPrefix(ipacPrefix);
	if (latestIpacRefError) throw latestIpacRefError;

	const latestIpacReference = Array.isArray(latestIpacRefRows)
		? (latestIpacRefRows[0] as any)?.ipac_reference
		: null;
	const nextIpacSequence =
		parseIpacSequence(latestIpacReference, ipacPrefix) + 1;

	logStep("IPAC reference seed resolved", {
		clientId,
		clientName: resolvedClientName || null,
		ipacPrefix,
		nextSequence: nextIpacSequence,
	});

	logStep("Step 4/14 - Fetching client items DB rows", { clientId });

	const { data: clientItemsDbRows, error: clientItemsDbError } =
		await db.getClientItemsDbForOrderCreate(clientId);
	if (clientItemsDbError) throw clientItemsDbError;

	const itemLookup = buildClientItemLookup((clientItemsDbRows || []) as any[]);
	const preferredMatches = new Map<
		number,
		{ itemId: string; itemNumber: string }
	>();
	Object.entries(preferredItemLinksByPackage || {}).forEach(
		([packageNumber, value]) => {
			const numericPackage = Number(packageNumber);
			if (!Number.isFinite(numericPackage)) return;
			if (!value?.itemId) return;
			preferredMatches.set(numericPackage, {
				itemId: value.itemId,
				itemNumber: value.itemNumber || String(value.itemId),
			});
		},
	);

	const { matches: matchedItems, unmatched: unmatchedItemNumberPackages } =
		matchPackageDesignations(
			resolvedPackages.map((pkg) => ({
				packageNumber: pkg.packageNumber,
				designation: pkg.designation,
			})),
			itemLookup,
			preferredMatches,
		);

	const maintenanceItemIdByPackageNumber = new Map<number, string>();
	for (const match of matchedItems) {
		maintenanceItemIdByPackageNumber.set(
			match.packageNumber,
			match.matchedItemId,
		);
	}

	logStep("Step 5/14 - Item matching completed", {
		availableClientItems: itemLookup.size,
		matchedPackages: matchedItems.length,
		unmatchedPackages: unmatchedItemNumberPackages.length,
		unmatchedPreview: unmatchedItemNumberPackages.slice(0, 8).map((entry) => ({
			packageNumber: entry.packageNumber,
			itemNumber: entry.searchedItemNumber,
		})),
	});

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
				.join(
					", ",
				)}. Please provide a positive whole number for each package row.`,
		);
	}

	logStep("Step 6/14 - Package quantity normalization completed", {
		validatedPackages: normalizedInstanceCountByPackage.size,
	});

	logStep("Step 7/14 - Creating order record");
	const order = await createOrder({ clientId });
	logStep("Step 7/14 - Created order record", { orderId: order.id });
	const normalizedCategoryIds = Array.from(
		new Set((selectedCategoryIds || []).filter(Boolean)),
	);
	if (normalizedCategoryIds.length > 0) {
		logStep("Step 8/14 - Creating category mappings", {
			categoryCount: normalizedCategoryIds.length,
		});
		const { error: categoryMappingError } = await createOrderCategoryMappings({
			orderId: order.id,
			categoryIds: normalizedCategoryIds,
		});
		if (categoryMappingError) throw categoryMappingError;
	}

	logStep("Step 9/14 - Creating order_packages rows", {
		packageCount: resolvedPackages.length,
	});
	const { data: createdPackages, error: packagesError } =
		await db.createOrderPackages({
			order_id: order.id,
			package_numbers: resolvedPackages.map((pkg) => pkg.packageNumber),
			status: "design",
		});
	if (packagesError) throw packagesError;
	logStep("Step 9/14 - Created order_packages rows", {
		createdPackageCount: createdPackages?.length || 0,
	});

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

	const fallbackPackageItems = resolvedPackages
		.filter((pkg) => !maintenanceItemIdByPackageNumber.has(pkg.packageNumber))
		.map((pkg) => {
			const orderPackage = packageByNumber.get(pkg.packageNumber);
			if (!orderPackage) return null;
			return {
				order_package_id: orderPackage.id,
				quantity: normalizedInstanceCountByPackage.get(pkg.packageNumber) || 1,
				designation: pkg.designation?.trim() || null,
				length: pkg.item_length,
				width: pkg.item_width,
				height: pkg.item_height,
			};
		})
		.filter(
			(row): row is NonNullable<typeof row> => !!row && !!row.designation,
		);

	if (fallbackPackageItems.length > 0) {
		logStep("Step 10/14 - Creating fallback package_items rows", {
			rowCount: fallbackPackageItems.length,
		});
		const packageItemChunkSize = 400;
		for (
			let i = 0;
			i < fallbackPackageItems.length;
			i += packageItemChunkSize
		) {
			const chunk = fallbackPackageItems.slice(i, i + packageItemChunkSize);
			const { error } = await db.createPackageItems(chunk);
			if (error) throw error;
		}
	}

	logStep("Step 11/14 - Creating order package overview rows", {
		rowCount: resolvedPackages.length,
	});
	const overviewRows = resolvedPackages
		.map((pkg) => {
			const normalizedQty = normalizedInstanceCountByPackage.get(
				pkg.packageNumber,
			);
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
	logStep("Step 11/14 - Created order package overview rows", {
		createdOverviewCount: createdOverviews?.length || 0,
	});

	const overviewIdByPackageNumber = new Map<number, string>();
	(createdOverviews || []).forEach((overview: any) => {
		overviewIdByPackageNumber.set(
			Number(overview.pkg_number),
			String(overview.id),
		);
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
		ipac_reference: string;
		status: "design";
		packed_at: null;
		destination: string | null;
	}> = [];

	const sequenceByTag = new Map<string, number>();

	for (const pkg of resolvedPackages) {
		const orderPackage = packageByNumber.get(pkg.packageNumber);
		const overviewId = overviewIdByPackageNumber.get(pkg.packageNumber);
		const instanceCount = normalizedInstanceCountByPackage.get(
			pkg.packageNumber,
		);
		if (!orderPackage || !overviewId || !instanceCount) {
			throw new Error(
				`Could not resolve package mapping for package #${pkg.packageNumber}.`,
			);
		}

		for (
			let instanceNumber = 1;
			instanceNumber <= instanceCount;
			instanceNumber += 1
		) {
			const override = pkg.instanceOverrides?.[instanceNumber];
			const instanceDestination = override?.destination || pkg.destination;

			const isCustom = pkg.boxTypeLabel !== "Standard Box";
			const tag = mapCategoryToTag(pkg.categoryLabel);
			let boxNumber = 1;
			if (!isCustom) {
				boxNumber = (sequenceByTag.get(tag) || 0) + 1;
				sequenceByTag.set(tag, boxNumber);
			}

			const generatedIpacReference = generateIpacReference({
				destination: instanceDestination,
				tag: pkg.categoryLabel || "TAG",
				isCustom,
				boxNumber,
				itemNumber: pkg.designation,
				quantity: pkg.quantity,
				generateRandomId: generateRandomBoxIds,
				randomSuffix: Math.random().toString(36).substring(2, 10).toUpperCase(),
			});

			instanceRows.push({
				order_pkg_overview_id: overviewId,
				order_package_id: orderPackage.id,
				instance_number: instanceNumber,
				ipac_reference: generatedIpacReference,
				status: "design",
				packed_at: null,
				destination: instanceDestination,
			});
		}
	}

	logStep("Step 12/14 - Creating package instance rows", {
		instanceCount: instanceRows.length,
	});
	const instanceChunkSize = 500;
	const createdInstanceRows: Array<{
		id: string;
		order_package_id: string;
	}> = [];
	for (let i = 0; i < instanceRows.length; i += instanceChunkSize) {
		const chunk = instanceRows.slice(i, i + instanceChunkSize);
		const { data: createdChunk, error: instancesError } =
			await db.createOrderPackageInstances(chunk);
		if (instancesError) throw instancesError;
		(createdChunk || []).forEach((row: any) => {
			if (!row?.id || !row?.order_package_id) return;
			createdInstanceRows.push({
				id: String(row.id),
				order_package_id: String(row.order_package_id),
			});
		});
	}
	logStep("Step 12/14 - Created package instance rows", {
		createdInstanceCount: createdInstanceRows.length,
	});

	const packageNumberByPackageId = new Map<string, number>();
	for (const [packageNumber, pkg] of packageByNumber.entries()) {
		packageNumberByPackageId.set(pkg.id, packageNumber);
	}

	const packedItemRows = createdInstanceRows
		.map((instanceRow) => {
			const packageNumber = packageNumberByPackageId.get(
				instanceRow.order_package_id,
			);
			if (!packageNumber) return null;

			const maintenanceDbId =
				maintenanceItemIdByPackageNumber.get(packageNumber);
			if (!maintenanceDbId) return null;

			return {
				maintenance_db_id: maintenanceDbId,
				pkg_instance_id: instanceRow.id,
				quantity: 1,
			};
		})
		.filter((row): row is NonNullable<typeof row> => !!row);

	logStep("Step 13/14 - Creating linked pkd_item rows", {
		rowCount: packedItemRows.length,
	});
	const packedItemChunkSize = 500;
	for (let i = 0; i < packedItemRows.length; i += packedItemChunkSize) {
		const chunk = packedItemRows.slice(i, i + packedItemChunkSize);
		const { error: packedItemsError } =
			await db.createPackedItemsForInstances(chunk);
		if (packedItemsError) throw packedItemsError;
	}

	for (const pkg of resolvedPackages) {
		logStep("Step 14/14 - Creating package detail rows", {
			packageNumber: pkg.packageNumber,
		});
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
			const { data, error } = await withRetry(() =>
				db.createBeam({
					quantity: part.quantity,
					type: part.typeId,
					width: part.width,
					thickness: part.thickness,
					space: part.space,
				}),
			);
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
			const { data: template, error: templateError } = await withRetry(() =>
				db.createSecuringTemplate({
					quantity: side.template.quantity,
					type_id: side.template.typeId,
					thickness: side.template.thickness,
					horizontal_bar: horizontalId,
					vertical_bar: verticalId,
					skids: skidsId,
				}),
			);
			if (templateError) throw templateError;
			const { error: securingError } = await withRetry(() =>
				db.createOrderPackageSecuring({
					order_package_id: orderPackage.id,
					securing_template_id: template?.id || null,
					securing_side: sideKey,
					is_final: false,
				}),
			);
			if (securingError) throw securingError;
			const { data: finalTemplate, error: finalTemplateError } =
				await withRetry(() => db.createSecuringTemplate({}));
			if (finalTemplateError) throw finalTemplateError;
			const { error: finalSecuringError } = await withRetry(() =>
				db.createOrderPackageSecuring({
					order_package_id: orderPackage.id,
					securing_template_id: finalTemplate?.id || null,
					securing_side: sideKey,
					is_final: true,
				}),
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

	logStep("Step 14/14 - Package detail rows complete");

	void Promise.allSettled([
		queryClient.invalidateQueries({ queryKey: ["orders"] }),
		queryClient.invalidateQueries({ queryKey: ["clients"] }),
	]);

	logStep("Order creation finished successfully", {
		orderId: order.id,
		matchedPackages: maintenanceItemIdByPackageNumber.size,
		fallbackPackageItems: fallbackPackageItems.length,
	});
};
