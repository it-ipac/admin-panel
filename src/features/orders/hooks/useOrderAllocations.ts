import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase";

export interface AllocationRow {
	id: string;
	items_db_id: string;
	destination_id: string;
	expected_qty: number;
	packed_qty: number;
	is_standard_box: boolean;
	items_db: {
		id: string;
		item_num: string | null;
		description: string | null;
		reference: string | null;
		category_id: string | null;
	} | null;
	destinations: { id: string; code: string | null; name: string | null } | null;
}

export interface DestinationOption {
	id: string;
	code: string | null;
	name: string | null;
}
export interface CategoryOption {
	id: string;
	label: string | null;
}
export interface CatalogItemOption {
	id: string;
	item_num: string | null;
	description: string | null;
	reference: string | null;
	category_id: string | null;
}

export interface AddAllocationVars {
	mode: "existing" | "new";
	itemsDbId?: string;
	newItem?: { itemNum: string; description: string; categoryId: string | null };
	destinationId: string;
	expected: number;
	isStandardBox: boolean;
}

const flattenOne = <T>(value: T | T[] | null | undefined): T | null =>
	Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

/** Query + mutations for an order's item allocations (milk-model editor). */
export function useOrderAllocations(
	orderId: string,
	clientId: string | null | undefined,
) {
	const queryClient = useQueryClient();
	const allocationsKey = ["order-allocations", orderId];
	const catalogKey = ["client-catalog-items", clientId];

	const allocations = useQuery({
		queryKey: allocationsKey,
		queryFn: async (): Promise<AllocationRow[]> => {
			const { data, error } = await db.getOrderItemAllocations(orderId);
			if (error) throw error;
			return (data || []).map((row: Record<string, unknown>) => ({
				...(row as unknown as AllocationRow),
				items_db: flattenOne(
					row.items_db as
						| AllocationRow["items_db"]
						| AllocationRow["items_db"][],
				),
				destinations: flattenOne(
					row.destinations as
						| AllocationRow["destinations"]
						| AllocationRow["destinations"][],
				),
			}));
		},
		enabled: !!orderId,
	});

	const destinations = useQuery({
		queryKey: ["active-destinations"],
		queryFn: async (): Promise<DestinationOption[]> => {
			const { data, error } = await db.getActiveDestinations();
			if (error) throw error;
			return (data || []) as DestinationOption[];
		},
	});

	const categories = useQuery({
		queryKey: ["client-order-categories", clientId],
		queryFn: async (): Promise<CategoryOption[]> => {
			if (!clientId) return [];
			const { data, error } = await db.getClientOrderCategories(clientId);
			if (error) throw error;
			return (data || []) as CategoryOption[];
		},
		enabled: !!clientId,
	});

	const catalog = useQuery({
		queryKey: catalogKey,
		queryFn: async (): Promise<CatalogItemOption[]> => {
			if (!clientId) return [];
			const { data, error } = await db.getClientCatalogItems(clientId);
			if (error) throw error;
			return (data || []) as CatalogItemOption[];
		},
		enabled: !!clientId,
	});

	const setExpected = useMutation({
		mutationFn: async (vars: { allocationId: string; expected: number }) => {
			const { error } = await db.setAllocationExpected(
				vars.allocationId,
				vars.expected,
			);
			if (error) throw error;
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: allocationsKey }),
	});

	const addAllocation = useMutation({
		mutationFn: async (vars: AddAllocationVars) => {
			let itemsDbId = vars.itemsDbId;
			if (vars.mode === "new") {
				if (!clientId) throw new Error("This order has no client.");
				const itemNum = vars.newItem?.itemNum?.trim();
				if (!itemNum) throw new Error("Item number is required.");
				const { data, error } = await db.createCatalogItem({
					clientId,
					itemNum,
					description: vars.newItem?.description?.trim() || "",
					categoryId: vars.newItem?.categoryId || null,
				});
				if (error) throw error;
				itemsDbId = (data as { id?: string } | null)?.id;
			}
			if (!itemsDbId) throw new Error("Select an item.");
			const { error } = await db.addOrderItemAllocation({
				orderId,
				itemsDbId,
				destinationId: vars.destinationId,
				expected: vars.expected,
				isStandardBox: vars.isStandardBox,
			});
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: allocationsKey });
			queryClient.invalidateQueries({ queryKey: catalogKey });
		},
	});

	return {
		allocations,
		destinations,
		categories,
		catalog,
		setExpected,
		addAllocation,
	};
}
