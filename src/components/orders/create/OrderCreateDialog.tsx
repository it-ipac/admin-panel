import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { db } from "../../../lib/supabase";
import {
	OrderCreateConfirmDialog,
	type OrderCreateSummary,
} from "./OrderCreateConfirmDialog.tsx";
import { OrderCreateFormDialog } from "./orderCreate/OrderCreateFormDialog.tsx";
import { buildDetailTables } from "./orderCreate/buildDetailTables";
import {
	applyManufacturingFieldChange,
	applyManufacturingPartTypeLabelChange,
	applyPackageFieldChange,
	clearManufacturingPart,
} from "./orderCreate/editRawPackages";
import { parseExcelFile } from "./orderCreate/parseExcelFile";
import { resolvePackages } from "./orderCreate/resolvePackages";
import { submitOrderCreate } from "./orderCreate/submitOrderCreate";
import {
	INITIAL_CLIENT,
	WOOD_OUT_OF_RANGE_ID,
	type AppliedExcelTemplateMode,
	type BoxTypeOption,
	type ClientOption,
	type ExcelTemplateMode,
	type MaterialVariantOption,
	type OrderCreateDialogProps,
	type PackageEditableField,
	type PackingTypeOption,
	type RawPackageRow,
} from "./orderCreate/types";
import {
	detectExcelTemplateVersion,
	stripExtension,
} from "./orderCreate/utils";
import { validateOrderCreateForm } from "./orderCreate/validateForm";

export function OrderCreateDialog({
	open,
	onOpenChange,
}: OrderCreateDialogProps) {
	const queryClient = useQueryClient();
	const { user } = useAuth();

	const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
	const [selectedClientId, setSelectedClientId] = useState("");
	const [newClient, setNewClient] = useState({ ...INITIAL_CLIENT });
	const [orderName, setOrderName] = useState("");
	const [excelFile, setExcelFile] = useState<File | null>(null);
	const [excelVersionMode, setExcelVersionMode] =
		useState<ExcelTemplateMode>("auto");
	const [detectedExcelVersion, setDetectedExcelVersion] = useState<number | null>(
		null,
	);
	const [appliedTemplateMode, setAppliedTemplateMode] =
		useState<AppliedExcelTemplateMode>("legacy");
	const [worksheetNames, setWorksheetNames] = useState<string[]>([]);
	const [packageCount, setPackageCount] = useState(0);
	const [rawPackages, setRawPackages] = useState<RawPackageRow[]>([]);
	const [packingTypeOverrides, setPackingTypeOverrides] = useState<Record<number, string>>({});
	const [packingTypeShowAll, setPackingTypeShowAll] = useState<Record<number, boolean>>({});
	const [manufacturingTypeOverrides, setManufacturingTypeOverrides] = useState<Record<string, string>>({});
	const [manufacturingShowAll, setManufacturingShowAll] = useState<Record<string, boolean>>({});
	const [isParsing, setIsParsing] = useState(false);
	const [fileError, setFileError] = useState<string | null>(null);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
	const [showConfirm, setShowConfirm] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

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
			setWorksheetNames([]);
			setPackageCount(0);
			setRawPackages([]);
			setPackingTypeOverrides({});
			setPackingTypeShowAll({});
			setManufacturingTypeOverrides({});
			setManufacturingShowAll({});
			setFileError(null);
			setValidationErrors({});
			setShowConfirm(false);
			setSubmitError(null);
		}
	}, [open]);

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
			clientMode,
			newClientDetails: clientMode === "new" ? newClient : undefined,
			worksheetNames,
		}),
		[clientMode, excelFile, newClient, orderName, packageCount, selectedClient, worksheetNames],
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

	const {
		packagePreviews,
		resolvedPackages,
		hasUnresolvedMappings,
		missingTemplateCount,
	} = useMemo(
		() =>
			resolvePackages({
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
			}),
		[
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
		],
	);

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
					missingFields.push(`box type \"${label}\"`);
				}

				if (!preview.packingTypeResolved) {
					missingFields.push("packing type");
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
	}, [hasUnresolvedMappings, packagePreviews]);

	const handlePackageFieldChange = (
		packageNumber: number,
		field: PackageEditableField,
		value: string | number | null,
	) => setRawPackages((prev) => applyPackageFieldChange(prev, packageNumber, field, value));

	const handleManufacturingFieldChange = (
		key: string,
		field: "quantity" | "width" | "thickness" | "space",
		value: number | null,
	) => setRawPackages((prev) => applyManufacturingFieldChange(prev, key, field, value));

	const handleManufacturingPartAdd = (key: string) => {
		setRawPackages((prev) => applyManufacturingPartTypeLabelChange(prev, key, ""));
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

	const handleParseExcelFile = async (
		file: File,
		mode: ExcelTemplateMode,
		candidateOrderName: string,
	): Promise<number> => {
		setIsParsing(true);
		setFileError(null);
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
		setExcelFile(file);
		setOrderName(nextOrderName);
		setDetectedExcelVersion(detectedVersion);
		setAppliedTemplateMode(
			excelVersionMode === "v54plus" ? "v54plus" : "legacy",
		);
		setWorksheetNames([]);
		setRawPackages([]);
		setPackageCount(0);
		setPackingTypeOverrides({});
		setPackingTypeShowAll({});
		setManufacturingTypeOverrides({});
		setManufacturingShowAll({});
		setFileError(null);
		setValidationErrors((prev) => ({ ...prev, file: "" }));
	};

	const handleConfirmCreate = async () => {
		setSubmitError(null);
		try {
			await submitOrderCreate({
				resolvedPackages,
				selectedClientId,
				clientMode,
				createClient: () => createClientMutation.mutateAsync(),
				createOrder: (payload) => createOrderMutation.mutateAsync(payload),
				materialVariantMap,
				queryClient,
				onSuccess: () => {
					setShowConfirm(false);
					onOpenChange(false);
				},
			});
		} catch (error: any) {
			setSubmitError(error?.message || "Failed to create order");
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
					setPackingTypeOverrides({});
					setPackingTypeShowAll({});
					setFileError(null);
				}}
				setFileError={setFileError}
				onReview={async (options) => {
					setSubmitError(null);
					const effectiveSelectedClientId =
						options?.selectedClientId || selectedClientId;
					if (
						options?.selectedClientId &&
						options.selectedClientId !== selectedClientId
					) {
						setSelectedClientId(options.selectedClientId);
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
				isSubmitting={
					createClientMutation.isPending || createOrderMutation.isPending
				}
			/>

			<OrderCreateConfirmDialog
				open={showConfirm}
				onOpenChange={setShowConfirm}
				templateMode={appliedTemplateMode}
				summary={summary}
				detailTables={detailTables}
				packagePreviews={packagePreviews}
				onPackageFieldChange={handlePackageFieldChange}
				onPackingTypeChange={(packageNumber, packingTypeId) =>
					setPackingTypeOverrides((prev) => ({ ...prev, [packageNumber]: packingTypeId }))
				}
				onPackingTypeOptionsToggle={(packageNumber) =>
					setPackingTypeShowAll((prev) => ({ ...prev, [packageNumber]: !prev[packageNumber] }))
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
				confirmDisabled={hasUnresolvedMappings}
				confirmDisabledReason={unresolvedMappingReason}
				templateWarningCount={missingTemplateCount}
				onConfirm={handleConfirmCreate}
				isSubmitting={createClientMutation.isPending || createOrderMutation.isPending}
				submitError={submitError}
			/>
		</>
	);
}
