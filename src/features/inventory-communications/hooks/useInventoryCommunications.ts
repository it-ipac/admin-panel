import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useToast } from "../../../hooks/useToast";
import {
	buildEmailTemplate,
	EMAIL_REASON_LABELS,
} from "../services/emailTemplates";
import {
	fetchSupplierEmailMessages,
	sendSupplierEmails,
} from "../services/inventoryCommunicationsService";
import { inventoryCommunicationsQueryKeys } from "../services/queryKeys";
import type {
	GroupedSupplierEmailDraft,
	SupplierEmailReason,
	VariantCommunicationItem,
} from "../types";

interface UseInventoryCommunicationsParams {
	variants: VariantCommunicationItem[];
	requesterUserId: string;
}

interface DraftOverride {
	subject: string;
	body: string;
}

export function useInventoryCommunications({
	variants,
	requesterUserId,
}: UseInventoryCommunicationsParams) {
	const queryClient = useQueryClient();
	const toast = useToast();

	const [search, setSearch] = useState("");
	const [reason, setReason] = useState<SupplierEmailReason>("price_update");
	const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(
		new Set(),
	);
	const [selectedSupplierByVariantId, setSelectedSupplierByVariantId] = useState<
		Record<string, string>
	>({});
	const [replyToBySupplierId, setReplyToBySupplierId] = useState<
		Record<string, string>
	>({});
	const [draftOverridesBySupplierId, setDraftOverridesBySupplierId] = useState<
		Record<string, DraftOverride>
	>({});

	const historyQuery = useQuery({
		queryKey: inventoryCommunicationsQueryKeys.history(),
		queryFn: fetchSupplierEmailMessages,
		staleTime: 30000,
	});

	const filteredVariants = useMemo(() => {
		const normalizedSearch = search.toLowerCase().trim();
		if (!normalizedSearch) {
			return variants;
		}

		return variants.filter((variant) => {
			return (
				variant.materialName.toLowerCase().includes(normalizedSearch) ||
				variant.variantName.toLowerCase().includes(normalizedSearch) ||
				(variant.description ?? "").toLowerCase().includes(normalizedSearch) ||
				variant.suppliers.some((supplier) =>
					supplier.supplierName.toLowerCase().includes(normalizedSearch),
				)
			);
		});
	}, [search, variants]);

	const selectedSupplierGroups = useMemo(() => {
		const selectedVariants = variants.filter((variant) =>
			selectedVariantIds.has(variant.variantId),
		);

		const bySupplier = new Map<
			string,
			{
				supplierId: string;
				supplierName: string;
				supplierEmail: string;
				variants: VariantCommunicationItem[];
			}
		>();

		for (const variant of selectedVariants) {
			const selectedSupplierId = selectedSupplierByVariantId[variant.variantId];
			const supplier = variant.suppliers.find(
				(option) => option.supplierId === selectedSupplierId,
			);

			if (!supplier?.supplierEmail) {
				continue;
			}

			const existing = bySupplier.get(supplier.supplierId);
			if (existing) {
				existing.variants.push(variant);
				continue;
			}

			bySupplier.set(supplier.supplierId, {
				supplierId: supplier.supplierId,
				supplierName: supplier.supplierName,
				supplierEmail: supplier.supplierEmail,
				variants: [variant],
			});
		}

		return Array.from(bySupplier.values());
	}, [selectedSupplierByVariantId, selectedVariantIds, variants]);

	const groupedDrafts = useMemo((): GroupedSupplierEmailDraft[] => {
		return selectedSupplierGroups.map((group) => {
			const generated = buildEmailTemplate({
				supplierName: group.supplierName,
				reason,
				variants: group.variants,
			});

			const override = draftOverridesBySupplierId[group.supplierId];

			return {
				supplierId: group.supplierId,
				supplierName: group.supplierName,
				supplierEmail: group.supplierEmail,
				reason,
				subject: override?.subject ?? generated.subject,
				body: override?.body ?? generated.body,
				variantIds: group.variants.map((variant) => variant.variantId),
				variantSummaries: group.variants.map(
					(variant) => `${variant.materialName} - ${variant.variantName}`,
				),
				inReplyToResendEmailId:
					replyToBySupplierId[group.supplierId] || undefined,
			};
		});
	}, [
		draftOverridesBySupplierId,
		reason,
		replyToBySupplierId,
		selectedSupplierGroups,
	]);

	const sendMutation = useMutation({
		mutationFn: async () => {
			if (groupedDrafts.length === 0) {
				throw new Error("Select at least one variant with a supplier email.");
			}

			return await sendSupplierEmails({
				data: {
					requesterUserId,
					drafts: groupedDrafts,
				},
			});
		},
		onSuccess: async (result) => {
			await queryClient.invalidateQueries({
				queryKey: inventoryCommunicationsQueryKeys.history(),
			});

			if (result.failureCount > 0) {
				toast.warning({
					title: `Sent ${result.successCount}, failed ${result.failureCount}`,
					description: result.errors.slice(0, 2).join(" | "),
				});
				return;
			}

			toast.success({
				title: `Sent ${result.successCount} grouped email(s)`,
				description: `Reason: ${EMAIL_REASON_LABELS[reason]}`,
			});
		},
		onError: (error) => {
			toast.error({
				title: "Failed to send grouped emails",
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	const toggleVariant = (variantId: string, defaultSupplierId?: string) => {
		setSelectedVariantIds((prev) => {
			const next = new Set(prev);
			if (next.has(variantId)) {
				next.delete(variantId);
				return next;
			}

			next.add(variantId);
			if (defaultSupplierId) {
				setSelectedSupplierByVariantId((curr) => ({
					...curr,
					[variantId]: curr[variantId] ?? defaultSupplierId,
				}));
			}
			return next;
		});
	};

	const setVariantSupplier = (variantId: string, supplierId: string) => {
		setSelectedSupplierByVariantId((prev) => ({
			...prev,
			[variantId]: supplierId,
		}));
	};

	const updateDraft = (
		supplierId: string,
		field: keyof DraftOverride,
		value: string,
	) => {
		setDraftOverridesBySupplierId((prev) => {
			const current = prev[supplierId] ?? { subject: "", body: "" };
			return {
				...prev,
				[supplierId]: {
					...current,
					[field]: value,
				},
			};
		});
	};

	return {
		search,
		setSearch,
		reason,
		setReason,
		filteredVariants,
		selectedVariantIds,
		selectedSupplierByVariantId,
		replyToBySupplierId,
		setReplyToBySupplierId,
		groupedDrafts,
		history: historyQuery.data ?? [],
		isHistoryLoading: historyQuery.isLoading,
		isSending: sendMutation.isPending,
		sendGroupedEmails: () => sendMutation.mutate(),
		toggleVariant,
		setVariantSupplier,
		updateDraft,
	};
}
