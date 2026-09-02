import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	Material,
	MaterialVariant,
	Supplier,
	TagItem,
	Unit,
	VariantTag,
} from "../../../components/inventory/types";
import { supabase } from "../../../lib/supabase";

interface UseInventoryDataOptions {
	/** Queries stay disabled until there is a signed-in user. */
	user: unknown;
	/** Called after a successful mutation so the page can close its editor. */
	onMutationSuccess: () => void;
}

/**
 * Every inventory read and write in one place.
 *
 * Moved verbatim out of the inventory route, which owned 2,700 lines of markup
 * and its entire data layer at once. Keeping the queries and mutations here
 * means the route is orchestration and the service calls are testable and
 * reusable on their own.
 */
export function useInventoryData({
	user,
	onMutationSuccess,
}: UseInventoryDataOptions) {
	const queryClient = useQueryClient();

	// Fetch materials with variants and supplier pricing
	const { data: materialsData, isLoading: materialsLoading } = useQuery({
		queryKey: ["materials-with-variants"],
		queryFn: async () => {
			// Fetch base materials
			const { data: mats, error: matsErr } = await supabase
				.from("materials")
				.select("id, name, description, unit_id, created_at")
				.order("name");
			if (matsErr) throw matsErr;

			// Fetch units
			const { data: unitsData, error: unitsErr } = await supabase
				.from("units_of_measure")
				.select("id, name, description");
			if (unitsErr) throw unitsErr;
			const unitMap = new Map((unitsData || []).map((u: Unit) => [u.id, u]));

			// Fetch all variants
			const matIds = (mats || []).map((m: Material) => m.id);
			let variants: any[] = [];
			let variantPricing: any[] = [];
			const variantTagsMap = new Map<string, VariantTag[]>();

			if (matIds.length > 0) {
				const { data: vars, error: varsErr } = await supabase
					.from("material_variants")
					.select(
						"id, material_id, variant_name, description, unit_id, attributes, length, width, thickness, weight_per_unit, created_at",
					)
					.in("material_id", matIds);
				if (varsErr) throw varsErr;
				variants = vars || [];

				// Fetch supplier pricing for all variants
				const variantIds = variants.map((v: MaterialVariant) => v.id);
				if (variantIds.length > 0) {
					const { data: pricing, error: pricingErr } = await supabase
						.from("supplier_pricing")
						.select(`
              id,
              material_variant_id,
              supplier_id,
              price,
              price_per_unit,
              supplier_quantity,
			  suppliers_reference,
              updated_at,
              suppliers (
                id,
                name,
								contact_person,
				email
              )
            `)
						.in("material_variant_id", variantIds)
						.order("price");
					if (!pricingErr) {
						variantPricing = pricing || [];
					}

					// Fetch variant tags
					const { data: variantTags, error: variantTagsErr } = await supabase
						.from("material_variant_tags")
						.select("material_variant_id, tag_id, tags(id, name)")
						.in("material_variant_id", variantIds);
					if (!variantTagsErr && variantTags) {
						variantTags.forEach((vt: any) => {
							const arr = variantTagsMap.get(vt.material_variant_id) || [];
							arr.push({ tag_id: vt.tag_id, tags: vt.tags });
							variantTagsMap.set(vt.material_variant_id, arr);
						});
					}
				}
			}

			// Assemble materials with variants and pricing
			const materialRows = (mats || []).map((m: any) => {
				const materialVariants = variants
					.filter((v: any) => v.material_id === m.id)
					.map((v: any) => ({
						...v,
						unit: v.unit_id ? unitMap.get(v.unit_id) : null,
						supplier_pricing: variantPricing.filter(
							(p: any) => p.material_variant_id === v.id,
						),
						material_variant_tags: variantTagsMap.get(v.id) || [],
					}));

				return {
					...m,
					unit: m.unit_id ? unitMap.get(m.unit_id) : null,
					material_variants: materialVariants,
				};
			});

			return materialRows as Material[];
		},
		enabled: !!user,
		staleTime: 30000,
	});

	// Fetch suppliers
	const { data: suppliers, isLoading: suppliersLoading } = useQuery({
		queryKey: ["suppliers"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("suppliers")
				.select("*")
				.order("name");
			if (error) throw error;
			return data as Supplier[];
		},
		enabled: !!user,
		staleTime: 30000,
	});

	const { data: tags = [] } = useQuery({
		queryKey: ["tags"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("tags")
				.select("id, name")
				.order("name");
			if (error) throw error;
			return data as TagItem[];
		},
		enabled: !!user,
		staleTime: 60000,
	});

	// Fetch units for dropdown - TODO: implement unit editing
	const { data: units = [] } = useQuery({
		queryKey: ["units"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("units_of_measure")
				.select("id, name, description")
				.order("name");
			if (error) throw error;
			return data as Unit[];
		},
		enabled: !!user,
		staleTime: 60000,
	});

	const updateMaterial = useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: Partial<Material>;
		}) => {
			const { error } = await supabase
				.from("materials")
				.update(updates)
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["materials-with-variants"] });
			onMutationSuccess();
		},
	});

	const updateVariant = useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: Partial<MaterialVariant>;
		}) => {
			const { error } = await supabase
				.from("material_variants")
				.update(updates)
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["materials-with-variants"] });
		},
	});

	// Update supplier mutation
	const updateSupplier = useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: Partial<Supplier>;
		}) => {
			const { error } = await supabase
				.from("suppliers")
				.update(updates)
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			onMutationSuccess();
		},
	});

	const deleteMaterial = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await supabase.from("materials").delete().eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["materials-with-variants"] });
			onMutationSuccess();
		},
	});

	const deleteVariant = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await supabase
				.from("material_variants")
				.delete()
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["materials-with-variants"] });
			onMutationSuccess();
		},
	});

	const deleteSupplier = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await supabase.from("suppliers").delete().eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			onMutationSuccess();
		},
	});

	return {
		materialsData,
		materialsLoading,
		suppliers,
		suppliersLoading,
		tags,
		units,
		updateMaterial,
		updateVariant,
		updateSupplier,
		deleteMaterial,
		deleteVariant,
		deleteSupplier,
	};
}
