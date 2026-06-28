import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	deleteDetailRowsById,
	deleteOrderCascade,
} from "../../../features/orders/utils/deleteOrderCascade";
import { useAuth } from "../../../hooks/useAuth";
import { db } from "../../../lib/supabase";
import { ManifestDumpPanel } from "../../clients/ManifestDumpPanel";
import type { ManifestDumpPayload } from "../../clients/manifest/useManifestDump";
import { useToastContext } from "../../ui/ToastProvider";
import {
	OrderCreateConfirmDialog,
	type OrderCreateSummary,
} from "./OrderCreateConfirmDialog.tsx";
import { buildDetailTables } from "./orderCreate/buildDetailTables";
import {
	applyManufacturingFieldChange,
	applyManufacturingPartTypeLabelChange,
	applyPackageFieldChange,
	clearManufacturingPart,
} from "./orderCreate/editRawPackages";
import {
	buildClientItemLookup,
	matchPackageDesignations,
} from "./orderCreate/itemNumberMatching";
import { OrderCreateFormDialog } from "./orderCreate/OrderCreateFormDialog.tsx";
import { parseExcelFile } from "./orderCreate/parseExcelFile";
import { resolvePackages } from "./orderCreate/resolvePackages";
import { submitOrderCreate } from "./orderCreate/submitOrderCreate";
import {
	type AppliedExcelTemplateMode,
	type BoxTypeOption,
	type ClientOption,
	type ExcelTemplateMode,
	INITIAL_CLIENT,
	type MaterialVariantOption,
	type OrderCategoryOption,
	type OrderCreateDialogProps,
	type PackageEditableField,
	type PackingTypeOption,
	type RawPackageRow,
	type SeiCategoryOption,
	type SeiProtectionOption,
	WOOD_OUT_OF_RANGE_ID,
} from "./orderCreate/types";
import {
	detectExcelTemplateVersion,
	findExistingClientIdFromOrderName,
	stripExtension,
} from "./orderCreate/utils";
import { validateOrderCreateForm } from "./orderCreate/validateForm";

interface PackageItemMatchState {
	status: "matched" | "unmatched";
	searchedItemNumber: string;
	matchedItemNumber?: string;
	matchedItemId?: string;
}

export function OrderCreateDialog({
	open,
	onOpenChange,
}: OrderCreateDialogProps) {
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { toast } = useToastContext();

	const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
	const [selectedClientId, setSelectedClientId] = useState("");
	const [newClient, setNewClient] = useState({ ...INITIAL_CLIENT });
	const [orderName, setOrderName] = useState("");
	const [excelFile, setExcelFile] = useState<File | null>(null);
	const [excelVersionMode, setExcelVersionMode] =
		useState<ExcelTemplateMode>("auto");
	const [detectedExcelVersion, setDetectedExcelVersion] = useState<
		number | null
	>(null);
	const [appliedTemplateMode, setAppliedTemplateMode] =
		useState<AppliedExcelTemplateMode>("legacy");
	const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
	const [worksheetNames, setWorksheetNames] = useState<string[]>([]);
	const [packageCount, setPackageCount] = useState(0);
	const [rawPackages, setRawPackages] = useState<RawPackageRow[]>([]);
	const [packingTypeOverrides, setPackingTypeOverrides] = useState<
		Record<number, string>
	>({});
	const [seiCategoryOverrides, setSeiCategoryOverrides] = useState<
		Record<number, number>
	>({});
	const [seiProtectionOverrides, setSeiProtectionOverrides] = useState<
		Record<number, number>
	>({});
	const [packingTypeShowAll, setPackingTypeShowAll] = useState<
		Record<number, boolean>
	>({});
	const [manufacturingTypeOverrides, setManufacturingTypeOverrides] = useState<
		Record<string, string>
	>({});
	const [manufacturingShowAll, setManufacturingShowAll] = useState<
		Record<string, boolean>
	>({});
	const [instanceOverrides, setInstanceOverrides] = useState<
		Record<number, Record<number, { destination: string | null }>>
	>({});
	const [isParsing, setIsParsing] = useState(false);
	const [fileError, setFileError] = useState<string | null>(null);
	const [validationErrors, setValidationErrors] = useState<
		Record<string, string>
	>({});
	const [showConfirm, setShowConfirm] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isCreatingOrder, setIsCreatingOrder] = useState(false);
	const [isFetchingItems, setIsFetchingItems] = useState(false);
	const [itemMatchStatusByPackage, setItemMatchStatusByPackage] = useState<
		Record<number, PackageItemMatchState>
	>({});
	const [globalDestination, setGlobalDestination] = useState("");
	const [generateRandomBoxIds, setGenerateRandomBoxIds] = useState(false);
	const [itemsDumpPayload, setItemsDumpPayload] =
		useState<ManifestDumpPayload | null>(null);
	const isCreatingOrderRef = useRef(false);

	const { data: clients = [], isLoading: clientsLoading } = useQuery({
		queryKey: ["clients"],
		queryFn: async () => {
			const { data, error } = await db.getClients();
			if (error) throw error;
			return (data || []) as ClientOption[];
		},
		enabled: open,
		staleTime: 60000,
	});

	const { data: packingTypes = [] } = useQuery({
		queryKey: ["packingTypes"],
		queryFn: async () => {
			const { data, error } = await db.getPackingTypes();
			if (error) throw error;
			return (data || []) as PackingTypeOption[];
		},
		enabled: open,
		staleTime: 60000,
	});

	const { data: seiCategories = [] } = useQuery({
		queryKey: ["seiCategories"],
		queryFn: async () => {
			const { data, error } = await db.getSeiCategories();
			if (error) throw error;
			return (data || []) as SeiCategoryOption[];
		},
		enabled: open,
		staleTime: 60000,
	});

	const { data: seiProtections = [] } = useQuery({
		queryKey: ["seiProtections"],
		queryFn: async () => {
			const { data, error } = await db.getSeiProtections();
			if (error) throw error;
			return (data || []) as SeiProtectionOption[];
		},
		enabled: open,
		staleTime: 60000,
	});

	const { data: boxTypes = [] } = useQuery({
		queryKey: ["boxTypes"],
		queryFn: async () => {
			const { data, error } = await db.getBoxTypes();
			if (error) throw error;
			return (data || []) as BoxTypeOption[];
		},
		enabled: open,
		staleTime: 60000,
	});

	const { data: woodVariants = [] } = useQuery({
		queryKey: ["woodVariants"],
		queryFn: async () => {
			const { data, error } = await db.getMaterialVariantsByTag("Wood");
			if (error) throw error;
			const variants = (data || []) as MaterialVariantOption[];
			if (!variants.some((variant) => variant.id === WOOD_OUT_OF_RANGE_ID)) {
				const { data: fallback, error: fallbackError } =
					await db.getMaterialVariantById(WOOD_OUT_OF_RANGE_ID);
				if (!fallbackError && fallback) {
					variants.push(fallback as MaterialVariantOption);
				}
			}
			return variants;
		},
		enabled: open,
		staleTime: 60000,
	});

	const { data: bodyVariants = [] } = useQuery({
		queryKey: ["bodyVariants"],
		queryFn: async () => {
			const { data, error } = await db.getMaterialVariantsByTag("Body");
			if (error) throw error;
			return (data || []) as MaterialVariantOption[];
		},
		enabled: open,
		staleTime: 60000,
	});

	const { data: materialVariants = [] } = useQuery({
		queryKey: ["materialVariants"],
		queryFn: async () => {
			const { data, error } = await db.getMaterialVariants();
			if (error) throw error;
			return (data || []) as MaterialVariantOption[];
		},
		enabled: open,
		staleTime: 60000,
	});

	const { data: clientCategories = [], isLoading: categoriesLoading } =
		useQuery({
			queryKey: ["clientOrderCategories", selectedClientId],
			queryFn: async () => {
				const { data, error } =
					await db.getClientOrderCategories(selectedClientId);
				if (error) throw error;
				const rows = (data || []) as any[];
				return rows.map((row) => {
					const tagMap = Array.isArray(row.category_tag_map)
						? row.category_tag_map
						: row.category_tag_map
							? [row.category_tag_map]
							: [];
					const tags = tagMap
						.map((entry: any) => {
							const tag = Array.isArray(entry?.tag) ? entry.tag[0] : entry?.tag;
							return tag?.name ? String(tag.name) : "";
						})
						.filter(Boolean);

					return {
						id: String(row.id),
						label: String(row.label || "Unnamed category"),
						tags,
					} satisfies OrderCategoryOption;
				});
			},
			enabled: open && clientMode === "existing" && !!selectedClientId,
			staleTime: 30000,
		});

	const createClientMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await db.createClient({
				name: newClient.name.trim(),
				contact_person: newClient.contact_person?.trim() || null,
				email: newClient.email?.trim() || null,
				phone: newClient.phone?.trim() || null,
				address: newClient.address?.trim() || null,
			});
			if (error) throw error;
			return data as ClientOption;
		},
	});

	const createOrderMutation = useMutation({
		mutationFn: async (payload: { clientId: string }) => {
			const { data, error } = await db.createOrder({
				order_name: orderName.trim(),
				client_id: payload.clientId,
				created_by: user?.id || null,
			});
			if (error) throw error;
			return data as { id: string };
		},
	});

	useEffect(() => {
		if (!open) {
			setClientMode("existing");
			setSelectedClientId("");
			setNewClient({ ...INITIAL_CLIENT });
			setOrderName("");
			setExcelFile(null);
			setExcelVersionMode("auto");
			setDetectedExcelVersion(null);
			setAppliedTemplateMode("legacy");
			setSelectedCategoryIds([]);
			setWorksheetNames([]);
			setPackageCount(0);
			setRawPackages([]);
			setPackingTypeOverrides({});
			setSeiCategoryOverrides({});
			setSeiProtectionOverrides({});
			setPackingTypeShowAll({});
			setManufacturingTypeOverrides({});
			setManufacturingShowAll({});
			setFileError(null);
			setValidationErrors({});
			setShowConfirm(false);
			setSubmitError(null);
			setIsCreatingOrder(false);
			setIsFetchingItems(false);
			setItemMatchStatusByPackage({});
			setGlobalDestination("");
			setInstanceOverrides({});
			setItemsDumpPayload(null);
			isCreatingOrderRef.current = false;
		}
	}, [open]);

	const isCreateInProgress = isCreatingOrder;

	const resolveEffectiveExistingClientId = useCallback(
		(explicitSelectedClientId?: string) => {
			if (clientMode !== "existing") return "";
			const explicit = explicitSelectedClientId || selectedClientId;
			if (explicit) return explicit;
			return findExistingClientIdFromOrderName(orderName, clients) || "";
		},
		[clientMode, selectedClientId, orderName, clients],
	);

	useEffect(() => {
		if (globalDestination) {
			setRawPackages((prev) =>
				prev.map((pkg) => ({
					...pkg,
					destination: pkg.destination || globalDestination,
				})),
			);
		}
	}, [globalDestination]);

	// Drop any uploaded items dump when we leave a valid existing-client selection,
	// so a stale dump can never be imported under the wrong (or empty) client.
	useEffect(() => {
		if (!(clientMode === "existing" && selectedClientId)) {
			setItemsDumpPayload(null);
		}
	}, [clientMode, selectedClientId]);

	useEffect(() => {
		if (clientMode !== "existing") {
			setSelectedCategoryIds([]);
			return;
		}

		if (!selectedClientId) {
			setSelectedCategoryIds([]);
		}
	}, [clientMode, selectedClientId]);

	useEffect(() => {
		setSelectedCategoryIds((prev) => {
			if (prev.length === 0) return prev;
			const validIds = new Set(clientCategories.map((category) => category.id));
			const next = prev.filter((id) => validIds.has(id));
			return next.length === prev.length ? prev : next;
		});
	}, [clientCategories]);

	useEffect(() => {
		if (packageCount === rawPackages.length) return;
		setPackageCount(rawPackages.length);
	}, [packageCount, rawPackages.length]);

	const selectedClient = useMemo(
		() => clients.find((client) => client.id === selectedClientId) || null,
		[clients, selectedClientId],
	);

	const summary: OrderCreateSummary = useMemo(
		() => ({
			orderName: orderName || "Untitled order",
			clientName:
				clientMode === "new"
					? newClient.name || "New client"
					: selectedClient?.name || "Select a client",
			fileName: excelFile?.name,
			packageCount,
			selectedCategoryLabels: selectedCategoryIds
				.map(
					(id) =>
						clientCategories.find((category) => category.id === id)?.label,
				)
				.filter((label): label is string => !!label),
			clientMode,
			newClientDetails: clientMode === "new" ? newClient : undefined,
			worksheetNames,
		}),
		[
			clientCategories,
			clientMode,
			excelFile,
			newClient,
			orderName,
			packageCount,
			selectedCategoryIds,
			selectedClient,
			worksheetNames,
		],
	);

	const detailTables = useMemo(
		() =>
			buildDetailTables({
				clientMode,
				newClient,
				orderName,
				summary,
				packageCount,
			}),
		[clientMode, newClient, orderName, summary, packageCount],
	);

	const materialVariantMap = useMemo(
		() => new Map(materialVariants.map((variant) => [variant.id, variant])),
		[materialVariants],
	);

	const getVariantUnitId = useCallback(
		(variantId: string | null | undefined): string | null => {
			if (!variantId) return null;
			const variant = materialVariantMap.get(variantId);
			const unitValue = Array.isArray(variant?.unit)
				? variant.unit[0]
				: variant?.unit;
			return unitValue?.id || null;
		},
		[materialVariantMap],
	);
	const selectedTags = useMemo(
		() =>
			selectedCategoryIds.flatMap(
				(id) => clientCategories.find((cat) => cat.id === id)?.tags || [],
			),
		[selectedCategoryIds, clientCategories],
	);

	const {
		packagePreviews,
		resolvedPackages,
		hasUnresolvedMappings,
		missingTemplateCount,
	} = useMemo(
		() =>
			resolvePackages({
				templateMode: appliedTemplateMode,
				rawPackages,
				boxTypes,
				packingTypes,
				seiCategories,
				seiProtections,
				woodVariants,
				bodyVariants,
				materialVariants,
				packingTypeOverrides,
				seiCategoryOverrides,
				seiProtectionOverrides,
				packingTypeShowAll,
				manufacturingTypeOverrides,
				manufacturingShowAll,
				instanceOverrides,
				globalDestination,
				orderCategoryTags: selectedTags,
				generateRandomBoxIds,
			}),
		[
			appliedTemplateMode,
			rawPackages,
			boxTypes,
			packingTypes,
			seiCategories,
			seiProtections,
			woodVariants,
			bodyVariants,
			materialVariants,
			packingTypeOverrides,
			seiCategoryOverrides,
			seiProtectionOverrides,
			packingTypeShowAll,
			manufacturingTypeOverrides,
			manufacturingShowAll,
			instanceOverrides,
			globalDestination,
			selectedTags,
			generateRandomBoxIds,
		],
	);

	const { packageIssueMessages, partIssueMessages, materialValidationReason } =
		useMemo(() => {
			const issuesByPackage = new Map<number, Set<string>>();
			const issuesByPart = new Map<string, Set<string>>();
			const blockingMaterialIssuePackages = new Set<number>();

			const addPackageIssue = (packageNumber: number, message: string) => {
				if (!issuesByPackage.has(packageNumber)) {
					issuesByPackage.set(packageNumber, new Set());
				}
				issuesByPackage.get(packageNumber)?.add(message);
			};

			const addPartIssue = (
				packageNumber: number,
				partKey: string,
				message: string,
				isBlockingMaterialIssue = false,
			) => {
				addPackageIssue(packageNumber, message);
				if (!issuesByPart.has(partKey)) {
					issuesByPart.set(partKey, new Set());
				}
				issuesByPart.get(partKey)?.add(message);
				if (isBlockingMaterialIssue) {
					blockingMaterialIssuePackages.add(packageNumber);
				}
			};

			const addNonNegativePartIssue = (
				packageNumber: number,
				partKey: string,
				label: string,
				value: number | null | undefined,
				isBlockingMaterialIssue: boolean,
			) => {
				if (value === null || value === undefined) return;
				if (!Number.isFinite(value) || value >= 0) return;
				addPartIssue(
					packageNumber,
					partKey,
					`${label} cannot be negative (${value}).`,
					isBlockingMaterialIssue,
				);
			};

			const normalizeBoxTypeLabel = (value: string | null | undefined) =>
				(value || "")
					.toLowerCase()
					.replace(/\bpacking\b/g, "pkg")
					.replace(/\bpackage\b/g, "pkg")
					.replace(/[^a-z0-9]/g, "");

			const isBaseOnlyPackage = (value: string | null | undefined) =>
				normalizeBoxTypeLabel(value).includes("baseonly");

			for (const preview of packagePreviews) {
				const packageNumber = preview.packageNumber;
				const quantity = Number(preview.quantity);
				if (
					!Number.isFinite(quantity) ||
					!Number.isInteger(quantity) ||
					quantity <= 0
				) {
					addPackageIssue(
						packageNumber,
						"Box quantity must be a positive whole number.",
					);
				}

				if (!preview.boxTypeResolved) {
					addPackageIssue(packageNumber, "Box type is not mapped.");
				}

				if (!preview.packingTypeResolved) {
					addPackageIssue(
						packageNumber,
						appliedTemplateMode === "v54plus"
							? "SEI category/protection is not fully selected."
							: "Packing type is not mapped.",
					);
				}

				const manufacturingBars = isBaseOnlyPackage(preview.boxTypeLabel)
					? [
							preview.manufacturing.base.horizontal,
							preview.manufacturing.base.vertical,
							preview.manufacturing.base.skids,
						]
					: [
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

				const unresolvedManufacturingCount = manufacturingBars.filter(
					(part) => part.typeLabel && !part.typeResolved,
				).length;
				if (unresolvedManufacturingCount > 0) {
					addPackageIssue(
						packageNumber,
						`Resolve ${unresolvedManufacturingCount} manufacturing material selection${unresolvedManufacturingCount > 1 ? "s" : ""}.`,
					);
				}

				for (const [index, part] of preview.securing.entries()) {
					const hasData =
						part.quantity !== null ||
						part.width !== null ||
						part.thickness !== null;
					if (!hasData || !part.typeId) continue;

					const label = `Securing ${index + 1}`;
					if (part.quantity === null || part.quantity === undefined) {
						addPartIssue(
							packageNumber,
							part.key,
							`${label} quantity is required when a material is selected.`,
							true,
						);
					}

					addNonNegativePartIssue(
						packageNumber,
						part.key,
						`${label} quantity`,
						part.quantity,
						true,
					);
					addNonNegativePartIssue(
						packageNumber,
						part.key,
						`${label} width`,
						part.width,
						false,
					);
					addNonNegativePartIssue(
						packageNumber,
						part.key,
						`${label} thickness`,
						part.thickness,
						false,
					);

					if (!getVariantUnitId(part.typeId)) {
						addPartIssue(
							packageNumber,
							part.key,
							`${label} material has no unit mapping in inventory.`,
							true,
						);
					}
				}

				for (const [index, part] of preview.accessories.entries()) {
					const hasData = part.typeLabel || part.quantity !== null;
					if (!hasData || !part.typeId) continue;

					const label = `Accessory ${index + 1}`;
					if (part.quantity === null || part.quantity === undefined) {
						addPartIssue(
							packageNumber,
							part.key,
							`${label} quantity is required when a material is selected.`,
							true,
						);
					}

					addNonNegativePartIssue(
						packageNumber,
						part.key,
						`${label} quantity`,
						part.quantity,
						true,
					);

					if (!getVariantUnitId(part.typeId)) {
						addPartIssue(
							packageNumber,
							part.key,
							`${label} material has no unit mapping in inventory.`,
							true,
						);
					}
				}
			}

			const packageIssueMessages: Record<number, string[]> = {};
			for (const [packageNumber, messages] of issuesByPackage.entries()) {
				packageIssueMessages[packageNumber] = Array.from(messages);
			}

			const partIssueMessages: Record<string, string[]> = {};
			for (const [partKey, messages] of issuesByPart.entries()) {
				partIssueMessages[partKey] = Array.from(messages);
			}

			const sortedBlockingPackages = Array.from(
				blockingMaterialIssuePackages,
			).sort((a, b) => a - b);
			const shownBlockingPackages = sortedBlockingPackages.slice(0, 5);
			const remainingBlocking =
				sortedBlockingPackages.length - shownBlockingPackages.length;
			const materialValidationReason =
				sortedBlockingPackages.length > 0
					? `Fix material validation issues in ${shownBlockingPackages
							.map((pkgNumber) => `Box ${pkgNumber}`)
							.join(
								", ",
							)}${remainingBlocking > 0 ? ` and ${remainingBlocking} more` : ""}.`
					: undefined;

			return {
				packageIssueMessages,
				partIssueMessages,
				materialValidationReason,
			};
		}, [appliedTemplateMode, getVariantUnitId, packagePreviews]);

	const itemMatchIssueMessages = useMemo(() => {
		const messages: Record<number, string[]> = {};

		Object.entries(itemMatchStatusByPackage).forEach(
			([packageNumberRaw, state]) => {
				const packageNumber = Number(packageNumberRaw);
				if (!Number.isFinite(packageNumber)) return;
				if (state.status !== "unmatched") return;

				messages[packageNumber] = [
					`Item number "${state.searchedItemNumber}" was not found in client items DB. Keep it as a package item, edit the item number and fetch again, or clear it.`,
				];
			},
		);

		return messages;
	}, [itemMatchStatusByPackage]);

	const mergedPackageIssueMessages = useMemo(() => {
		const merged: Record<number, string[]> = {};
		const allPackageNumbers = new Set<number>();

		Object.keys(packageIssueMessages).forEach((packageNumberRaw) => {
			const packageNumber = Number(packageNumberRaw);
			if (Number.isFinite(packageNumber)) allPackageNumbers.add(packageNumber);
		});

		Object.keys(itemMatchIssueMessages).forEach((packageNumberRaw) => {
			const packageNumber = Number(packageNumberRaw);
			if (Number.isFinite(packageNumber)) allPackageNumbers.add(packageNumber);
		});

		allPackageNumbers.forEach((packageNumber) => {
			const combined = [
				...(packageIssueMessages[packageNumber] || []),
				...(itemMatchIssueMessages[packageNumber] || []),
			];
			if (combined.length > 0) {
				merged[packageNumber] = Array.from(new Set(combined));
			}
		});

		return merged;
	}, [itemMatchIssueMessages, packageIssueMessages]);

	const unresolvedMappingReason = useMemo(() => {
		if (!hasUnresolvedMappings) return undefined;

		const normalizeBoxTypeLabel = (value: string | null | undefined) =>
			(value || "")
				.toLowerCase()
				.replace(/\bpacking\b/g, "pkg")
				.replace(/\bpackage\b/g, "pkg")
				.replace(/[^a-z0-9]/g, "");
		const isBaseOnlyPackage = (value: string | null | undefined) =>
			normalizeBoxTypeLabel(value).includes("baseonly");

		const unresolvedByPackage = packagePreviews
			.map((preview) => {
				const missingFields: string[] = [];

				if (!preview.boxTypeResolved) {
					const label = preview.boxTypeLabel?.trim() || "(empty)";
					missingFields.push(`box type "${label}"`);
				}

				if (!preview.packingTypeResolved) {
					missingFields.push(
						appliedTemplateMode === "v54plus"
							? "SEI category/protection"
							: "packing type",
					);
				}

				const barParts = isBaseOnlyPackage(preview.boxTypeLabel)
					? [
							preview.manufacturing.base.horizontal,
							preview.manufacturing.base.vertical,
							preview.manufacturing.base.skids,
						]
					: [
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

				const unresolvedManufacturingCount = barParts.filter(
					(part) => part.typeLabel && !part.typeResolved,
				).length;
				if (unresolvedManufacturingCount > 0) {
					missingFields.push(
						`${unresolvedManufacturingCount} manufacturing material${unresolvedManufacturingCount > 1 ? "s" : ""}`,
					);
				}

				if (missingFields.length === 0) return null;
				return `Box ${preview.packageNumber}: ${missingFields.join(", ")}`;
			})
			.filter((item): item is string => !!item);

		if (unresolvedByPackage.length === 0) {
			return "Resolve missing mappings before creating the order.";
		}

		const maxShown = 3;
		const shownItems = unresolvedByPackage.slice(0, maxShown);
		const remainingCount = unresolvedByPackage.length - shownItems.length;
		const details = shownItems.join(" | ");
		return remainingCount > 0
			? `Resolve before create: ${details} | +${remainingCount} more.`
			: `Resolve before create: ${details}.`;
	}, [appliedTemplateMode, hasUnresolvedMappings, packagePreviews]);

	const invalidQuantityPackages = useMemo(
		() =>
			packagePreviews
				.filter((preview) => {
					const quantity = Number(preview.quantity);
					return (
						!Number.isFinite(quantity) ||
						!Number.isInteger(quantity) ||
						quantity <= 0
					);
				})
				.map((preview) => preview.packageNumber),
		[packagePreviews],
	);

	const quantityValidationReason = useMemo(() => {
		if (invalidQuantityPackages.length === 0) return undefined;
		const shown = invalidQuantityPackages.slice(0, 4);
		const remaining = invalidQuantityPackages.length - shown.length;
		const listedPackages = shown
			.map((pkgNumber) => `Box ${pkgNumber}`)
			.join(", ");
		const suffix = remaining > 0 ? ` and ${remaining} more` : "";
		return `Invalid quantity in ${listedPackages}${suffix}. Quantity must be a positive whole number. Update the quantity or remove that package.`;
	}, [invalidQuantityPackages]);

	const missingPackagesReason = useMemo(() => {
		if (packagePreviews.length > 0) return undefined;
		return "No package rows remain. Add/update Excel rows before creating the order.";
	}, [packagePreviews.length]);

	const negativeValueCount = useMemo(() => {
		let count = 0;
		const register = (value: number | null | undefined) => {
			if (value === null || value === undefined) return;
			if (!Number.isFinite(value)) return;
			if (value < 0) count += 1;
		};

		for (const pkg of rawPackages) {
			register(pkg.quantity);
			register(pkg.item_length);
			register(pkg.item_width);
			register(pkg.item_height);
			register(pkg.internal_length);
			register(pkg.internal_width);
			register(pkg.internal_height);
			register(pkg.external_length);
			register(pkg.external_width);
			register(pkg.external_height);
			register(pkg.net_weight);
			register(pkg.tare);

			const manufacturingSides = [
				pkg.manufacturing.big,
				pkg.manufacturing.small,
				pkg.manufacturing.lid,
				pkg.manufacturing.base,
			];

			for (const side of manufacturingSides) {
				register(side.quantity);
				register(side.thickness);
				register(side.horizontal.quantity);
				register(side.horizontal.width);
				register(side.horizontal.thickness);
				register(side.horizontal.space);
				register(side.vertical.quantity);
				register(side.vertical.width);
				register(side.vertical.thickness);
				register(side.vertical.space);
			}

			register(pkg.manufacturing.base.skids.quantity);
			register(pkg.manufacturing.base.skids.width);
			register(pkg.manufacturing.base.skids.thickness);
			register(pkg.manufacturing.base.skids.space);

			for (const part of pkg.securing) {
				register(part.quantity);
				register(part.width);
				register(part.thickness);
			}

			for (const accessory of pkg.accessories) {
				register(accessory.amount);
			}
		}

		return count;
	}, [rawPackages]);

	const fetchItemsDisabledReason = useMemo(() => {
		if (clientMode !== "existing") {
			return "Fetch Items requires an existing client.";
		}
		if (!resolveEffectiveExistingClientId()) {
			return "Select a client before fetching items.";
		}
		if (resolvedPackages.length === 0) {
			return "No package rows available to fetch.";
		}
		return undefined;
	}, [clientMode, resolveEffectiveExistingClientId, resolvedPackages.length]);

	const confirmDisabledReason =
		missingPackagesReason ||
		unresolvedMappingReason ||
		quantityValidationReason ||
		materialValidationReason;
	const isConfirmDisabled = Boolean(confirmDisabledReason);

	const handlePackageFieldChange = (
		packageNumber: number,
		field: PackageEditableField,
		value: string | number | null,
	) => {
		setRawPackages((prev) =>
			applyPackageFieldChange(prev, packageNumber, field, value),
		);

		if (field === "designation") {
			setItemMatchStatusByPackage((prev) => {
				if (!(packageNumber in prev)) return prev;
				const next = { ...prev };
				delete next[packageNumber];
				return next;
			});
		}
	};

	const handleManufacturingFieldChange = (
		key: string,
		field: "quantity" | "width" | "thickness" | "space",
		value: number | null,
	) =>
		setRawPackages((prev) =>
			applyManufacturingFieldChange(prev, key, field, value),
		);

	const handleManufacturingPartAdd = (key: string) => {
		setRawPackages((prev) =>
			applyManufacturingPartTypeLabelChange(prev, key, ""),
		);
		setManufacturingTypeOverrides((prev) => {
			if (!(key in prev)) return prev;
			const next = { ...prev };
			delete next[key];
			return next;
		});
	};

	const handleManufacturingPartRemove = (key: string) => {
		setRawPackages((prev) => clearManufacturingPart(prev, key));
		setManufacturingTypeOverrides((prev) => {
			if (!(key in prev)) return prev;
			const next = { ...prev };
			delete next[key];
			return next;
		});
	};

	const handlePackageRemove = (packageNumber: number) => {
		setRawPackages((prev) =>
			prev.filter((pkg) => pkg.packageNumber !== packageNumber),
		);

		setItemMatchStatusByPackage((prev) => {
			if (!(packageNumber in prev)) return prev;
			const next = { ...prev };
			delete next[packageNumber];
			return next;
		});

		setPackingTypeOverrides((prev) => {
			if (!(packageNumber in prev)) return prev;
			const next = { ...prev };
			delete next[packageNumber];
			return next;
		});

		setSeiCategoryOverrides((prev) => {
			if (!(packageNumber in prev)) return prev;
			const next = { ...prev };
			delete next[packageNumber];
			return next;
		});

		setSeiProtectionOverrides((prev) => {
			if (!(packageNumber in prev)) return prev;
			const next = { ...prev };
			delete next[packageNumber];
			return next;
		});

		setPackingTypeShowAll((prev) => {
			if (!(packageNumber in prev)) return prev;
			const next = { ...prev };
			delete next[packageNumber];
			return next;
		});

		const packageKeyPrefix = `pkg:${packageNumber}:`;
		setManufacturingTypeOverrides((prev) => {
			const keysToDelete = Object.keys(prev).filter((key) =>
				key.startsWith(packageKeyPrefix),
			);
			if (keysToDelete.length === 0) return prev;
			const next = { ...prev };
			for (const key of keysToDelete) delete next[key];
			return next;
		});

		setManufacturingShowAll((prev) => {
			const keysToDelete = Object.keys(prev).filter((key) =>
				key.startsWith(packageKeyPrefix),
			);
			if (keysToDelete.length === 0) return prev;
			const next = { ...prev };
			for (const key of keysToDelete) delete next[key];
			return next;
		});
	};

	const handleParseExcelFile = async (
		file: File,
		mode: ExcelTemplateMode,
		candidateOrderName: string,
	): Promise<number> => {
		setIsParsing(true);
		setFileError(null);
		setItemMatchStatusByPackage({});
		try {
			const parsed = await parseExcelFile(file, {
				versionMode: mode,
				orderNameForDetection: candidateOrderName,
			});
			setFileError(parsed.fileError);
			setDetectedExcelVersion(parsed.detectedVersion);
			setAppliedTemplateMode(parsed.appliedTemplateMode);
			setWorksheetNames(parsed.worksheetNames);
			setRawPackages(parsed.rawPackages);
			setPackageCount(parsed.packageCount);
			return parsed.packageCount;
		} catch {
			setFileError("Unable to read this Excel file. Please check the format.");
			setDetectedExcelVersion(null);
			setAppliedTemplateMode("legacy");
			setWorksheetNames([]);
			setPackageCount(0);
			setRawPackages([]);
			return 0;
		} finally {
			setIsParsing(false);
		}
	};

	const handleFileSelected = async (file: File) => {
		const nextOrderName = stripExtension(file.name);
		const detectedVersion = detectExcelTemplateVersion(nextOrderName);
		const inferredClientId =
			clientMode === "existing" && !selectedClientId
				? findExistingClientIdFromOrderName(nextOrderName, clients)
				: "";
		setExcelFile(file);
		setOrderName(nextOrderName);
		if (inferredClientId) {
			setSelectedClientId(inferredClientId);
			setValidationErrors((prev) => ({ ...prev, client: "" }));
		}
		setDetectedExcelVersion(detectedVersion);
		setAppliedTemplateMode(
			excelVersionMode === "v54plus" ? "v54plus" : "legacy",
		);
		setWorksheetNames([]);
		setRawPackages([]);
		setPackageCount(0);
		setItemMatchStatusByPackage({});
		setPackingTypeOverrides({});
		setSeiCategoryOverrides({});
		setSeiProtectionOverrides({});
		setPackingTypeShowAll({});
		setManufacturingTypeOverrides({});
		setManufacturingShowAll({});
		setFileError(null);
		setValidationErrors((prev) => ({ ...prev, file: "" }));
	};

	const handleFetchItems = async () => {
		if (isFetchingItems || isCreateInProgress) return;

		if (clientMode !== "existing") {
			const message = "Fetch Items requires an existing client selection.";
			toast({
				title: "Fetch Items unavailable",
				description: message,
				variant: "warning",
			});
			return;
		}

		const effectiveClientId = resolveEffectiveExistingClientId();
		if (!effectiveClientId) {
			const message = "Select a client before fetching items.";
			toast({
				title: "Fetch Items unavailable",
				description: message,
				variant: "warning",
			});
			return;
		}

		if (resolvedPackages.length === 0) {
			toast({
				title: "No packages to fetch",
				description: "Import and review package rows first.",
				variant: "warning",
			});
			return;
		}

		if (effectiveClientId !== selectedClientId) {
			setSelectedClientId(effectiveClientId);
			setValidationErrors((prev) => ({ ...prev, client: "" }));
		}

		setIsFetchingItems(true);
		setSubmitError(null);
		console.log("[OrderCreate] Fetch Items - start", {
			clientId: effectiveClientId,
			packageCount: resolvedPackages.length,
		});

		try {
			// Match against the dropped TAQA items file when present. Its items are NOT in
			// items_db yet (that upsert happens on Create), so matching the live DB would
			// wrongly report every m2m item as "Not found". matchedItemId is left empty for
			// dump matches — the real items_db id is resolved on Create after the upsert.
			const usingDump = !!(
				itemsDumpPayload && itemsDumpPayload.rows.length > 0
			);
			let lookup: ReturnType<typeof buildClientItemLookup>;
			if (usingDump) {
				lookup = buildClientItemLookup(
					(itemsDumpPayload?.rows || []).map((dumpRow) => ({
						// Non-empty sentinel id (real DB id is assigned on Create); only used
						// here to register the lookup entry, never persisted.
						id: dumpRow.item_num || dumpRow.reference || "dump-item",
						item_num: dumpRow.item_num,
						reference: dumpRow.reference,
					})) as any[],
				);
			} else {
				const { data, error } =
					await db.getClientItemsDbForOrderCreate(effectiveClientId);
				if (error) throw error;
				lookup = buildClientItemLookup((data || []) as any[]);
			}

			const { matches, unmatched } = matchPackageDesignations(
				resolvedPackages.map((pkg) => ({
					packageNumber: pkg.packageNumber,
					designation: pkg.designation,
				})),
				lookup,
			);

			const statusByPackage: Record<number, PackageItemMatchState> = {};
			for (const match of matches) {
				statusByPackage[match.packageNumber] = {
					status: "matched",
					searchedItemNumber: match.searchedItemNumber,
					matchedItemNumber: match.matchedItemNumber,
					matchedItemId: usingDump ? "" : match.matchedItemId,
				};
			}
			for (const miss of unmatched) {
				statusByPackage[miss.packageNumber] = {
					status: "unmatched",
					searchedItemNumber: miss.searchedItemNumber,
				};
			}

			setItemMatchStatusByPackage(statusByPackage);

			if (matches.length > 0) {
				const matchedDesignationByPackage = new Map<number, string>();
				for (const match of matches) {
					matchedDesignationByPackage.set(
						match.packageNumber,
						match.matchedItemNumber,
					);
				}

				setRawPackages((prev) =>
					prev.map((pkg) => {
						const nextDesignation = matchedDesignationByPackage.get(
							pkg.packageNumber,
						);
						if (!nextDesignation || nextDesignation === pkg.designation) {
							return pkg;
						}
						return {
							...pkg,
							designation: nextDesignation,
						};
					}),
				);
			}

			console.log("[OrderCreate] Fetch Items - completed", {
				matched: matches.length,
				unmatched: unmatched.length,
			});

			if (unmatched.length > 0) {
				toast({
					title: "Fetch completed with unmatched items",
					description: `Matched ${matches.length} package item${matches.length === 1 ? "" : "s"}. ${unmatched.length} remained unmatched and will stay as normal package items unless you change them.`,
					variant: "warning",
				});
			} else {
				toast({
					title: "Items fetched",
					description: `Matched ${matches.length} package item${matches.length === 1 ? "" : "s"}.`,
					variant: "success",
				});
			}
		} catch (error: any) {
			const message = error?.message || "Failed to fetch items from client DB";
			setSubmitError(message);
			toast({
				title: "Fetch Items failed",
				description: message,
				variant: "error",
			});
		} finally {
			setIsFetchingItems(false);
		}
	};

	const handleMakeAllPositive = () => {
		let updatedValues = 0;

		const toPositive = (value: number | null | undefined) => {
			if (value === null || value === undefined) return value ?? null;
			if (!Number.isFinite(value) || value >= 0) return value;
			updatedValues += 1;
			return Math.abs(value);
		};

		setRawPackages((prev) =>
			prev.map((pkg) => {
				const next = structuredClone(pkg);
				next.quantity = toPositive(next.quantity);
				next.item_length = toPositive(next.item_length);
				next.item_width = toPositive(next.item_width);
				next.item_height = toPositive(next.item_height);
				next.internal_length = toPositive(next.internal_length);
				next.internal_width = toPositive(next.internal_width);
				next.internal_height = toPositive(next.internal_height);
				next.external_length = toPositive(next.external_length);
				next.external_width = toPositive(next.external_width);
				next.external_height = toPositive(next.external_height);
				next.net_weight = toPositive(next.net_weight);
				next.tare = toPositive(next.tare);

				const sides = [
					next.manufacturing.big,
					next.manufacturing.small,
					next.manufacturing.lid,
					next.manufacturing.base,
				];
				for (const side of sides) {
					side.quantity = toPositive(side.quantity);
					side.thickness = toPositive(side.thickness);
					side.horizontal.quantity = toPositive(side.horizontal.quantity);
					side.horizontal.width = toPositive(side.horizontal.width);
					side.horizontal.thickness = toPositive(side.horizontal.thickness);
					side.horizontal.space = toPositive(side.horizontal.space);
					side.vertical.quantity = toPositive(side.vertical.quantity);
					side.vertical.width = toPositive(side.vertical.width);
					side.vertical.thickness = toPositive(side.vertical.thickness);
					side.vertical.space = toPositive(side.vertical.space);
				}

				next.manufacturing.base.skids.quantity = toPositive(
					next.manufacturing.base.skids.quantity,
				);
				next.manufacturing.base.skids.width = toPositive(
					next.manufacturing.base.skids.width,
				);
				next.manufacturing.base.skids.thickness = toPositive(
					next.manufacturing.base.skids.thickness,
				);
				next.manufacturing.base.skids.space = toPositive(
					next.manufacturing.base.skids.space,
				);

				next.securing = next.securing.map((part) => ({
					...part,
					quantity: toPositive(part.quantity),
					width: toPositive(part.width),
					thickness: toPositive(part.thickness),
				}));

				next.accessories = next.accessories.map((part) => ({
					...part,
					amount: toPositive(part.amount),
				}));

				next.gross_weight =
					next.net_weight !== null && next.tare !== null
						? next.net_weight + next.tare
						: null;

				return next;
			}),
		);

		if (updatedValues > 0) {
			toast({
				title: "Values normalized",
				description: `Converted ${updatedValues} negative value${updatedValues === 1 ? "" : "s"} to positive.`,
				variant: "success",
			});
		} else {
			toast({
				title: "No negative values",
				description: "Nothing to update.",
				variant: "info",
			});
		}
	};

	const handleConfirmCreate = async () => {
		if (isCreatingOrderRef.current) return;

		const effectiveClientId = resolveEffectiveExistingClientId();
		if (clientMode === "existing" && !effectiveClientId) {
			const message = "Select a client before creating the order.";
			setSubmitError(message);
			setShowConfirm(true);
			toast({
				title: "Create order failed",
				description: message,
				variant: "error",
			});
			return;
		}

		if (
			clientMode === "existing" &&
			effectiveClientId &&
			effectiveClientId !== selectedClientId
		) {
			setSelectedClientId(effectiveClientId);
			setValidationErrors((prev) => ({ ...prev, client: "" }));
		}

		isCreatingOrderRef.current = true;
		setIsCreatingOrder(true);
		setSubmitError(null);
		setShowConfirm(false);
		console.log("[OrderCreate] UI - starting create order");
		toast({
			title: "Creating order",
			description: "This can take a moment for large Excel files.",
			variant: "info",
		});
		// Captured via onOrderCreated so a failure after the order row exists can
		// cascade-delete the half-built order rather than leave it hollow.
		let createdOrderId: string | null = null;
		// Detail rows with no order back-pointer (package_info/beam/securing_template):
		// tracked here so cleanup can remove any that were inserted but not yet linked.
		const detailRowIds = {
			packageInfoIds: [] as string[],
			beamIds: [] as string[],
			templateIds: [] as string[],
		};
		try {
			const effectiveClientName =
				clientMode === "new"
					? newClient.name
					: clients.find((client) => client.id === effectiveClientId)?.name ||
						"";

			const preferredItemLinksByPackage = Object.entries(
				itemMatchStatusByPackage,
			)
				.filter(
					([, value]) => value.status === "matched" && !!value.matchedItemId,
				)
				.reduce(
					(acc, [packageNumberRaw, value]) => {
						const packageNumber = Number(packageNumberRaw);
						if (!Number.isFinite(packageNumber) || !value.matchedItemId) {
							return acc;
						}
						acc[packageNumber] = {
							itemId: value.matchedItemId,
							itemNumber:
								value.matchedItemNumber || value.searchedItemNumber || "",
						};
						return acc;
					},
					{} as Record<number, { itemId: string; itemNumber: string }>,
				);

			console.log("[OrderCreate] UI - calling submitOrderCreate", {
				packageCount: resolvedPackages.length,
				preferredLinkedPackages: Object.keys(preferredItemLinksByPackage)
					.length,
			});

			await submitOrderCreate({
				resolvedPackages,
				selectedClientId:
					clientMode === "existing" ? effectiveClientId : selectedClientId,
				clientNameForReference: effectiveClientName,
				selectedCategoryIds,
				clientMode,
				createClient: () => createClientMutation.mutateAsync(),
				createOrder: (payload) => createOrderMutation.mutateAsync(payload),
				createOrderCategoryMappings: ({ orderId, categoryIds }) =>
					db.createOrderCategoryMappings({
						order_id: orderId,
						category_ids: categoryIds,
					}),
				materialVariantMap,
				queryClient,
				preferredItemLinksByPackage,
				itemsDumpPayload,
				generateRandomBoxIds,
				onOrderCreated: (orderId) => {
					createdOrderId = orderId;
				},
				detailRowIds,
			});
			console.log("[OrderCreate] UI - submitOrderCreate completed");
			onOpenChange(false);
			toast({
				title: "Order created",
				description: `${orderName.trim() || "Order"} was created successfully.`,
				variant: "success",
			});
		} catch (error: any) {
			console.error("[OrderCreate] UI - create order failed", error);
			// Roll back the partial order so a mid-build failure never leaves a hollow
			// order behind. Best-effort — a cleanup failure must not mask the real error.
			let cleanedUp = false;
			if (createdOrderId) {
				try {
					console.log(
						"[OrderCreate] UI - cleaning up partial order",
						createdOrderId,
					);
					await deleteOrderCascade(createdOrderId);
					// Remove any detail rows that were inserted but not yet linked (the
					// cascade can only reach linked ones). No-op for already-deleted ids.
					await deleteDetailRowsById(detailRowIds);
					void queryClient.invalidateQueries({ queryKey: ["orders"] });
					cleanedUp = true;
				} catch (cleanupError) {
					console.error(
						"[OrderCreate] UI - partial-order cleanup failed",
						cleanupError,
					);
				}
			}
			const rawMessage = error?.message || "Failed to create order";
			const isTransientNetworkFailure =
				/failed to fetch|networkerror|err_failed|cors|520|522|524/i.test(
					rawMessage,
				);
			const baseMessage = isTransientNetworkFailure
				? "Temporary API/network failure while creating securing data. Please retry once."
				: rawMessage;
			const message = cleanedUp
				? `${baseMessage} The half-built order was rolled back — safe to retry.`
				: baseMessage;
			setShowConfirm(true);
			setSubmitError(message);
			toast({
				title: "Create order failed",
				description: message,
				variant: "error",
			});
		} finally {
			console.log("[OrderCreate] UI - create order flow finished");
			isCreatingOrderRef.current = false;
			setIsCreatingOrder(false);
		}
	};

	return (
		<>
			<OrderCreateFormDialog
				open={open}
				onOpenChange={onOpenChange}
				clientMode={clientMode}
				setClientMode={setClientMode}
				selectedClientId={selectedClientId}
				setSelectedClientId={setSelectedClientId}
				newClient={newClient}
				setNewClient={setNewClient}
				orderName={orderName}
				setOrderName={setOrderName}
				clients={clients}
				clientsLoading={clientsLoading}
				clientCategories={clientCategories}
				categoriesLoading={categoriesLoading}
				selectedCategoryIds={selectedCategoryIds}
				setSelectedCategoryIds={setSelectedCategoryIds}
				validationErrors={validationErrors}
				setValidationErrors={setValidationErrors}
				excelFile={excelFile}
				worksheetNames={worksheetNames}
				packageCount={packageCount}
				excelVersionMode={excelVersionMode}
				detectedExcelVersion={detectedExcelVersion}
				appliedTemplateMode={appliedTemplateMode}
				isParsing={isParsing}
				fileError={fileError}
				hasUnresolvedMappings={hasUnresolvedMappings}
				globalDestination={globalDestination}
				setGlobalDestination={setGlobalDestination}
				generateRandomBoxIds={generateRandomBoxIds}
				setGenerateRandomBoxIds={setGenerateRandomBoxIds}
				itemsDumpSlot={
					clientMode === "existing" && selectedClientId ? (
						<ManifestDumpPanel
							key={selectedClientId}
							clientId={selectedClientId}
							onPayloadChange={setItemsDumpPayload}
						/>
					) : null
				}
				onFileSelected={handleFileSelected}
				onExcelVersionModeChange={async (mode) => {
					setExcelVersionMode(mode);
					if (!excelFile) return;
					await handleParseExcelFile(excelFile, mode, orderName);
				}}
				onClearFile={() => {
					setExcelFile(null);
					setDetectedExcelVersion(null);
					setAppliedTemplateMode("legacy");
					setWorksheetNames([]);
					setPackageCount(0);
					setRawPackages([]);
					setItemMatchStatusByPackage({});
					setPackingTypeOverrides({});
					setSeiCategoryOverrides({});
					setSeiProtectionOverrides({});
					setPackingTypeShowAll({});
					setInstanceOverrides({});
					setFileError(null);
				}}
				setFileError={setFileError}
				onReview={async (options) => {
					setSubmitError(null);
					const effectiveSelectedClientId =
						clientMode === "existing"
							? resolveEffectiveExistingClientId(options?.selectedClientId)
							: selectedClientId;
					if (
						effectiveSelectedClientId &&
						effectiveSelectedClientId !== selectedClientId
					) {
						setSelectedClientId(effectiveSelectedClientId);
						setValidationErrors((prev) => ({ ...prev, client: "" }));
					}
					let nextPackageCount = packageCount;
					if (excelFile) {
						nextPackageCount = await handleParseExcelFile(
							excelFile,
							excelVersionMode,
							orderName,
						);
					}
					const errors = validateOrderCreateForm({
						orderName,
						clientMode,
						selectedClientId: effectiveSelectedClientId,
						newClientName: newClient.name,
						excelFile,
						packageCount: nextPackageCount,
					});
					setValidationErrors(errors);
					if (Object.keys(errors).length > 0) return;
					setShowConfirm(true);
				}}
				isSubmitting={isCreateInProgress}
			/>

			<OrderCreateConfirmDialog
				open={showConfirm}
				onOpenChange={(nextOpen) => {
					if (isCreateInProgress && !nextOpen) return;
					setShowConfirm(nextOpen);
				}}
				templateMode={appliedTemplateMode}
				summary={summary}
				detailTables={detailTables}
				packagePreviews={packagePreviews}
				packageIssueMessages={mergedPackageIssueMessages}
				partIssueMessages={partIssueMessages}
				itemMatchStatusByPackage={itemMatchStatusByPackage}
				onPackageFieldChange={handlePackageFieldChange}
				onPackageRemove={handlePackageRemove}
				onPackingTypeChange={(packageNumber, packingTypeId) =>
					setPackingTypeOverrides((prev) => ({
						...prev,
						[packageNumber]: packingTypeId,
					}))
				}
				onSeiCategoryChange={(packageNumber, seiCategoryId) =>
					setSeiCategoryOverrides((prev) => {
						if (seiCategoryId === null || Number.isNaN(seiCategoryId)) {
							if (!(packageNumber in prev)) return prev;
							const next = { ...prev };
							delete next[packageNumber];
							return next;
						}
						return {
							...prev,
							[packageNumber]: seiCategoryId,
						};
					})
				}
				onSeiProtectionChange={(packageNumber, seiProtectionId) =>
					setSeiProtectionOverrides((prev) => {
						if (seiProtectionId === null || Number.isNaN(seiProtectionId)) {
							if (!(packageNumber in prev)) return prev;
							const next = { ...prev };
							delete next[packageNumber];
							return next;
						}
						return {
							...prev,
							[packageNumber]: seiProtectionId,
						};
					})
				}
				onPackingTypeOptionsToggle={(packageNumber) =>
					setPackingTypeShowAll((prev) => ({
						...prev,
						[packageNumber]: !prev[packageNumber],
					}))
				}
				onManufacturingTypeChange={(key, typeId) =>
					setManufacturingTypeOverrides((prev) => {
						if (!typeId) {
							if (!(key in prev)) return prev;
							const next = { ...prev };
							delete next[key];
							return next;
						}
						return { ...prev, [key]: typeId };
					})
				}
				onManufacturingFieldChange={handleManufacturingFieldChange}
				onManufacturingOptionsToggle={(key) =>
					setManufacturingShowAll((prev) => ({ ...prev, [key]: !prev[key] }))
				}
				onManufacturingPartAdd={handleManufacturingPartAdd}
				onManufacturingPartRemove={handleManufacturingPartRemove}
				onInstanceOverrideChange={(
					packageNumber,
					instanceNumber,
					destination,
				) =>
					setInstanceOverrides((prev) => {
						const pkgOverrides = prev[packageNumber] || {};
						return {
							...prev,
							[packageNumber]: {
								...pkgOverrides,
								[instanceNumber]: { destination },
							},
						};
					})
				}
				onFetchItems={handleFetchItems}
				isFetchingItems={isFetchingItems}
				fetchItemsDisabled={Boolean(fetchItemsDisabledReason)}
				fetchItemsDisabledReason={fetchItemsDisabledReason}
				onMakeAllPositive={handleMakeAllPositive}
				negativeValueCount={negativeValueCount}
				confirmDisabled={isConfirmDisabled}
				confirmDisabledReason={confirmDisabledReason}
				templateWarningCount={missingTemplateCount}
				onConfirm={handleConfirmCreate}
				isSubmitting={isCreateInProgress}
				submitError={submitError}
			/>
		</>
	);
}
