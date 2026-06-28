import type { QueryClient } from "@tanstack/react-query";
import { db, supabase } from "../../../../lib/supabase";
import {
	loadCatalogFromManifest,
	type ManifestCatalogResult,
	writeAllocationsForOrder,
} from "../../../clients/manifest/manifestImport.service";
import type { ManifestDumpPayload } from "../../../clients/manifest/useManifestDump";
import {
	buildClientItemLookup,
	matchPackageDesignations,
} from "./itemNumberMatching";
import type { MaterialVariantOption, ResolvedPackageRow } from "./types";
import {
	buildInstanceCategoryLabel,
	generateIpacReference,
	mapCategoryToTag,
} from "./utils";

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
	/** Optional TAQA items dump to load into items_db + write allocations for (Way 1). */
	itemsDumpPayload?: ManifestDumpPayload | null;
	generateRandomBoxIds?: boolean;
	/**
	 * Called once the `orders` row exists (Step 7). Lets the caller record the id so it
	 * can cascade-delete the partial order if a later step throws.
	 */
	onOrderCreated?: (orderId: string) => void;
	/**
	 * Collects ids of detail rows that have no order back-pointer (package_info, beam,
	 * securing_template), pushed as they are inserted. On failure the caller deletes
	 * these after the order cascade, so a mid-build throw cannot orphan them.
	 */
	detailRowIds?: {
		packageInfoIds: string[];
		beamIds: string[];
		templateIds: string[];
	};
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
	itemsDumpPayload,
	generateRandomBoxIds,
	onOrderCreated,
	detailRowIds,
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

	// Way 1: load the TAQA items dump into items_db FIRST, so the designation
	// matching below binds boxes to the freshly-imported items. Allocations are
	// written once the order exists (after Step 7).
	let manifestCatalog: ManifestCatalogResult | null = null;
	if (
		itemsDumpPayload &&
		itemsDumpPayload.rows.length > 0 &&
		selectedClientId
	) {
		logStep("Step 1b/14 - Loading items dump into catalog");
		manifestCatalog = await loadCatalogFromManifest({
			clientId: selectedClientId,
			rows: itemsDumpPayload.rows,
			categoriesToCreate: itemsDumpPayload.categoriesToCreate,
			categoryIdByRaw: itemsDumpPayload.categoryIdByRaw,
			keyByRaw: itemsDumpPayload.keyByRaw,
		});
		logStep("Step 1b/14 - Items dump loaded", {
			itemsUpserted: manifestCatalog.itemsUpserted,
			categoriesCreated: manifestCatalog.categoriesCreated,
		});
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
	// Report the id immediately so the caller can clean up this order if any later
	// step fails (creation is not a single DB transaction).
	onOrderCreated?.(order.id);
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
		category_id: string | null;
	}> = [];

	// Resolve per-box category (BMV/BMW + box type) to a real pkg_category id.
	const { data: clientCategories } = await supabase
		.from("pkg_category")
		.select("id, label")
		.eq("client_id", selectedClientId);
	const categoryLabelToId = new Map<string, string>();
	for (const category of (clientCategories || []) as Array<{
		id: string;
		label: string | null;
	}>) {
		if (category.label) categoryLabelToId.set(category.label, category.id);
	}

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

			// Prefer the per-box IPAC reference (BMY); resolve the box's category.
			const finalIpacReference = pkg.ipacReference || generatedIpacReference;
			const categoryLabel = buildInstanceCategoryLabel(
				pkg.tagL1,
				pkg.tagL2,
				!isCustom,
			);
			const categoryId = categoryLabel
				? (categoryLabelToId.get(categoryLabel) ?? null)
				: null;

			instanceRows.push({
				order_pkg_overview_id: overviewId,
				order_package_id: orderPackage.id,
				instance_number: instanceNumber,
				ipac_reference: finalIpacReference,
				status: "design",
				packed_at: null,
				destination: instanceDestination,
				category_id: categoryId,
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
				// Shadow plan: bound but NOT packed. The packer confirms it in the app,
				// which flips is_confirmed and makes it count toward packed_qty.
				is_confirmed: false,
			};
		})
		.filter((row): row is NonNullable<typeof row> => !!row);

	logStep("Step 13/14 - Creating linked pkd_item shadow rows", {
		rowCount: packedItemRows.length,
	});
	const packedItemChunkSize = 500;
	for (let i = 0; i < packedItemRows.length; i += packedItemChunkSize) {
		const chunk = packedItemRows.slice(i, i + packedItemChunkSize);
		const { error: packedItemsError } =
			await db.createPackedItemsForInstances(chunk);
		if (packedItemsError) throw packedItemsError;
	}

	// Step 14 — package detail rows, built in BULK (a handful of multi-row inserts)
	// instead of ~30 sequential calls per box. A 300-box order becomes seconds, not
	// minutes, shrinking the window for a mid-build disconnect. Insert order respects the
	// FK chain: beams → securing_template (refs beams) → order_package_securing (refs
	// template). If anything throws, the caller cascade-deletes the partial order.
	logStep("Step 14/14 - Creating package detail rows (bulk)", {
		packageCount: resolvedPackages.length,
	});

	const SECURING_SIDES = [
		{ key: "big_sides" as const, pick: (m: any) => m.big, includeSkids: false },
		{
			key: "small_sides" as const,
			pick: (m: any) => m.small,
			includeSkids: false,
		},
		{ key: "lid" as const, pick: (m: any) => m.lid, includeSkids: false },
		{ key: "base" as const, pick: (m: any) => m.base, includeSkids: true },
	];

	const partHasData = (part: any) =>
		part.typeLabel ||
		part.quantity !== null ||
		part.width !== null ||
		part.thickness !== null ||
		part.space !== null;

	// Insert rows in chunks (PostgREST preserves input order) and return ids aligned
	// 1:1 with the input array. withRetry covers transient network blips per chunk.
	const DETAIL_CHUNK = 500;
	// NOTE: these inserts are deliberately NOT wrapped in withRetry. They have no
	// idempotency key, so retrying a "transient" failure that actually committed
	// server-side (a lost success response) would double-apply rows — silently doubling
	// materials, or orphaning beams/templates. Instead any failure propagates to the
	// caller's cleanup (which cascade-deletes the partial order + the tracked detail
	// rows). The order_package info link-update below IS idempotent, so it keeps retry.
	const bulkInsertReturning = async <T>(
		rows: T[],
		insert: (
			chunk: T[],
		) => Promise<{ data: Array<{ id: string }> | null; error: unknown }>,
		label: string,
		sink?: string[],
	): Promise<string[]> => {
		const ids: string[] = [];
		for (let i = 0; i < rows.length; i += DETAIL_CHUNK) {
			const chunk = rows.slice(i, i + DETAIL_CHUNK);
			const { data, error } = await insert(chunk);
			if (error) throw error;
			const returned = data || [];
			if (returned.length !== chunk.length) {
				throw new Error(
					`${label}: server returned ${returned.length} of ${chunk.length} inserted rows`,
				);
			}
			for (const row of returned) {
				ids.push(row.id);
				// Track committed ids as we go so cleanup can remove them even if a
				// later chunk/phase throws (these tables have no order back-pointer).
				sink?.push(row.id);
			}
		}
		return ids;
	};
	const bulkInsertVoid = async <T>(
		rows: T[],
		insert: (chunk: T[]) => Promise<{ error: unknown }>,
	): Promise<void> => {
		for (let i = 0; i < rows.length; i += DETAIL_CHUNK) {
			const { error } = await insert(rows.slice(i, i + DETAIL_CHUNK));
			if (error) throw error;
		}
	};

	// Only packages that resolved to a real order_package row get detail (defensive;
	// createOrderPackages was called for every resolved package).
	const detailPackages: Array<{
		pkg: ResolvedPackageRow;
		orderPackage: { id: string; package_number: number };
	}> = [];
	for (const pkg of resolvedPackages) {
		const orderPackage = packageByNumber.get(pkg.packageNumber);
		if (!orderPackage) continue;
		detailPackages.push({ pkg, orderPackage });
	}

	// Phase A — package_info: one "original" + one empty "final" per box, then link.
	const originalInfoIds = await bulkInsertReturning(
		detailPackages.map(({ pkg }) => ({
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
		})),
		(chunk) => db.createPackageInfos(chunk),
		"package_info (original)",
		detailRowIds?.packageInfoIds,
	);
	const finalInfoIds = await bulkInsertReturning(
		detailPackages.map(() => ({})),
		(chunk) => db.createPackageInfos(chunk),
		"package_info (final)",
		detailRowIds?.packageInfoIds,
	);

	// Link each order_package to its two info rows — run the updates concurrently in
	// small batches (fast without flooding the connection).
	const LINK_BATCH = 25;
	for (let i = 0; i < detailPackages.length; i += LINK_BATCH) {
		const batch = detailPackages.slice(i, i + LINK_BATCH);
		const results = await Promise.all(
			batch.map(({ orderPackage }, j) =>
				withRetry(() =>
					db.updateOrderPackageInfo({
						order_package_id: orderPackage.id,
						original_pkg_info: originalInfoIds[i + j] || null,
						final_pkg_info: finalInfoIds[i + j] || null,
					}),
				),
			),
		);
		for (const result of results) if (result.error) throw result.error;
	}

	// Phase B — beams (only for sides/slots that carry data). Track each beam's
	// (packageIndex, side, slot) so templates can reference the right id.
	type BeamSlot = "horizontal" | "vertical" | "skids";
	const beamSpecs: Array<{
		pkgIndex: number;
		side: string;
		slot: BeamSlot;
		payload: {
			quantity: number | null;
			type: string | null;
			width: number | null;
			thickness: number | null;
			space: number | null;
		};
	}> = [];
	detailPackages.forEach(({ pkg }, pkgIndex) => {
		for (const { key, pick, includeSkids } of SECURING_SIDES) {
			const side = pick(pkg.manufacturing);
			const slots: Array<[BeamSlot, any]> = [
				["horizontal", side.horizontal],
				["vertical", side.vertical],
			];
			if (includeSkids) slots.push(["skids", side.skids]);
			for (const [slot, part] of slots) {
				if (!partHasData(part)) continue;
				if (!part.typeId)
					throw new Error("Missing manufacturing material selection");
				beamSpecs.push({
					pkgIndex,
					side: key,
					slot,
					payload: {
						quantity: part.quantity,
						type: part.typeId,
						width: part.width,
						thickness: part.thickness,
						space: part.space,
					},
				});
			}
		}
	});
	const beamIds = await bulkInsertReturning(
		beamSpecs.map((spec) => spec.payload),
		(chunk) => db.createBeams(chunk),
		"beam",
		detailRowIds?.beamIds,
	);
	const beamIdByKey = new Map<string, string>();
	beamSpecs.forEach((spec, i) => {
		beamIdByKey.set(`${spec.pkgIndex}:${spec.side}:${spec.slot}`, beamIds[i]);
	});

	// Phase C — securing_template: one "original" (referencing the beams) + one empty
	// "final" per (package, side), matching the legacy per-side behaviour.
	const templateSpecs: Array<{
		key: string;
		payload: {
			quantity?: number | null;
			type_id?: string | null;
			thickness?: number | null;
			horizontal_bar?: string | null;
			vertical_bar?: string | null;
			skids?: string | null;
		};
	}> = [];
	detailPackages.forEach(({ pkg }, pkgIndex) => {
		for (const { key, pick } of SECURING_SIDES) {
			const side = pick(pkg.manufacturing);
			templateSpecs.push({
				key: `${pkgIndex}:${key}:orig`,
				payload: {
					quantity: side.template.quantity,
					type_id: side.template.typeId,
					thickness: side.template.thickness,
					horizontal_bar:
						beamIdByKey.get(`${pkgIndex}:${key}:horizontal`) ?? null,
					vertical_bar: beamIdByKey.get(`${pkgIndex}:${key}:vertical`) ?? null,
					skids: beamIdByKey.get(`${pkgIndex}:${key}:skids`) ?? null,
				},
			});
			templateSpecs.push({ key: `${pkgIndex}:${key}:final`, payload: {} });
		}
	});
	const templateIds = await bulkInsertReturning(
		templateSpecs.map((spec) => spec.payload),
		(chunk) => db.createSecuringTemplates(chunk),
		"securing_template",
		detailRowIds?.templateIds,
	);
	const templateIdByKey = new Map<string, string>();
	templateSpecs.forEach((spec, i) =>
		templateIdByKey.set(spec.key, templateIds[i]),
	);

	// Phase D — order_package_securing rows (original + final per side).
	const securingRows: Array<{
		order_package_id: string;
		securing_template_id: string | null;
		securing_side: "big_sides" | "small_sides" | "lid" | "base";
		is_final: boolean;
	}> = [];
	detailPackages.forEach(({ orderPackage }, pkgIndex) => {
		for (const { key } of SECURING_SIDES) {
			securingRows.push({
				order_package_id: orderPackage.id,
				securing_template_id:
					templateIdByKey.get(`${pkgIndex}:${key}:orig`) ?? null,
				securing_side: key,
				is_final: false,
			});
			securingRows.push({
				order_package_id: orderPackage.id,
				securing_template_id:
					templateIdByKey.get(`${pkgIndex}:${key}:final`) ?? null,
				securing_side: key,
				is_final: true,
			});
		}
	});
	await bulkInsertVoid(securingRows, (chunk) =>
		db.createOrderPackageSecurings(chunk),
	);

	// Phase E — securing + accessory materials across all boxes, one bulk insert.
	const materialRows: Array<{
		order_package_id: string;
		material_variant_id: string;
		material_type: string;
		is_final: boolean;
		quantity: number;
		unit_id: string | null;
		length: number | null;
		width: number | null;
		height: number | null;
		comment: string | null;
	}> = [];
	for (const { pkg, orderPackage } of detailPackages) {
		for (const part of pkg.securing) {
			const hasData =
				part.quantity !== null ||
				part.width !== null ||
				part.thickness !== null;
			if (
				!hasData ||
				!part.typeId ||
				part.quantity === null ||
				part.quantity === undefined
			)
				continue;
			materialRows.push({
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
			});
		}
		for (const part of pkg.accessories) {
			const hasData = part.typeLabel || part.amount !== null;
			if (
				!hasData ||
				!part.typeId ||
				part.amount === null ||
				part.amount === undefined
			)
				continue;
			materialRows.push({
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
			});
		}
	}
	await bulkInsertVoid(materialRows, async (chunk) => {
		const { error } = await db.createOrderPackageMaterials(chunk);
		return { error };
	});

	logStep("Step 14/14 - Package detail rows complete", {
		packages: detailPackages.length,
		beams: beamSpecs.length,
		templates: templateSpecs.length,
		securingRows: securingRows.length,
		materialRows: materialRows.length,
	});

	// Reconcile the order's item allocations LAST — after every other write — so a failure
	// mid-submit followed by a retry (which creates a fresh order) can never double-apply the
	// expected_qty delta. The reconcile RPC is itself atomic and idempotent per order.
	if (manifestCatalog && itemsDumpPayload) {
		logStep("Step 14b/14 - Reconciling item allocations for order");
		const allocationsWritten = await writeAllocationsForOrder(
			order.id,
			itemsDumpPayload.rows,
			manifestCatalog.idByItemNum,
			manifestCatalog.idByCode,
		);
		logStep("Step 14b/14 - Allocations reconciled", { allocationsWritten });
	}

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
