import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Mutations for order_package_materials rows. */
export function useMaterialMutations(orderId: string) {
	const queryClient = useQueryClient();

	const addPackageMaterialMutation = useMutation({
		mutationFn: async (material: {
			order_package_id: string;
			material_variant_id: string;
			material_type: string;
			is_final: boolean;
			quantity: number;
			unit_id?: string | null;
			length?: number | null;
			width?: number | null;
			height?: number | null;
			comment?: string | null;
			item_used?: boolean;
		}) => {
			const { data, error } = await supabase
				.from("order_package_materials")
				.insert(material)
				.select()
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["packageMaterials", orderId],
			});
		},
	});

	const updatePackageMaterialMutation = useMutation({
		mutationFn: async ({
			id,
			...updates
		}: {
			id: string;
			quantity?: number;
			length?: number | null;
			width?: number | null;
			height?: number | null;
			comment?: string | null;
			is_final?: boolean;
			item_used?: boolean;
		}) => {
			const { data, error } = await supabase
				.from("order_package_materials")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["packageMaterials", orderId],
			});
		},
	});

	const deletePackageMaterialMutation = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await supabase
				.from("order_package_materials")
				.delete()
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["packageMaterials", orderId],
			});
		},
	});

	return {
		addPackageMaterialMutation,
		updatePackageMaterialMutation,
		deletePackageMaterialMutation,
	};
}
