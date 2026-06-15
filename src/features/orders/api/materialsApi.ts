import { supabase } from "@/lib/supabase";
import type { PackageMaterial, PackageService } from "../types";
import { queryRowsInChunks } from "../utils/chunked";
import { fetchOrderPackageIds } from "./common";

/** Fetches package materials (standard + securing beams) for all packages in an order. */
export async function fetchPackageMaterials(
	orderId: string,
): Promise<PackageMaterial[]> {
	const packageIds = await fetchOrderPackageIds(orderId);
	if (packageIds.length === 0) return [];

	// Fetch standard materials
	const materialsPromise = queryRowsInChunks<any>(packageIds, (chunk) =>
		supabase
			.from("order_package_materials")
			.select(`
          id,
          order_package_id,
          material_variant_id,
          material_type,
          is_final,
          quantity,
          unit_id,
          length,
          width,
          height,
          comment,
          item_used,
          quantity_used,
          material_variant:material_variants!order_package_materials_material_variant_id_fkey (
            variant_name,
            material:materials!material_variants_material_id_fkey (
              name
            )
          ),
          unit:units_of_measure!order_package_materials_unit_id_fkey (
            name
          )
        `)
			.in("order_package_id", chunk),
	);

	// Fetch securing materials (beams)
	const securingPromise = queryRowsInChunks<any>(packageIds, (chunk) =>
		supabase
			.from("order_package_securing")
			.select(`
          id,
          order_package_id,
          securing_side,
          is_final,
          securing_template:securing_template!order_package_securing_securing_template_id_fkey (
            id,
            quantity,
            thickness,
            type:material_variants!securing_template_type_id_fkey (
               id, variant_name, material:materials!material_variants_material_id_fkey(name)
            ),
            horizontal_bar:beam!securing_template_horizontal_bar_fkey (
               id, quantity, width, thickness, space, type:material_variants!beam_type_fkey(id, variant_name, material:materials!material_variants_material_id_fkey(name))
            ),
            vertical_bar:beam!securing_template_vertical_bar_fkey (
               id, quantity, width, thickness, space, type:material_variants!beam_type_fkey(id, variant_name, material:materials!material_variants_material_id_fkey(name))
            ),
            skids:beam!securing_template_skids_fkey (
               id, quantity, width, thickness, space, type:material_variants!beam_type_fkey(id, variant_name, material:materials!material_variants_material_id_fkey(name))
            )
          )
        `)
			.in("order_package_id", chunk),
	);

	const [materialRows, securingRows] = await Promise.all([
		materialsPromise,
		securingPromise,
	]);

	// Flatten the nested relations for standard materials
	const standardMaterials = materialRows.map((item: any) => ({
		...item,
		variant_name: Array.isArray(item.material_variant)
			? item.material_variant[0]?.variant_name
			: item.material_variant?.variant_name,
		material_name: Array.isArray(item.material_variant)
			? Array.isArray(item.material_variant[0]?.material)
				? item.material_variant[0]?.material[0]?.name
				: item.material_variant[0]?.material?.name
			: Array.isArray(item.material_variant?.material)
				? item.material_variant?.material[0]?.name
				: item.material_variant?.material?.name,
		unit_name: Array.isArray(item.unit) ? item.unit[0]?.name : item.unit?.name,
	}));

	// Process securing materials
	const securingMaterials = securingRows.flatMap((securing: any) => {
		const template = securing.securing_template;
		if (!template) return [];

		const materials: any[] = [];

		// Helper to process a beam
		const processBeam = (beam: any, role: string) => {
			if (!beam) return;

			const variantName = Array.isArray(beam.type)
				? beam.type[0]?.variant_name
				: beam.type?.variant_name;

			const materialName = Array.isArray(beam.type)
				? Array.isArray(beam.type[0]?.material)
					? beam.type[0]?.material[0]?.name
					: beam.type[0]?.material?.name
				: Array.isArray(beam.type?.material)
					? beam.type?.material[0]?.name
					: beam.type?.material?.name;

			materials.push({
				id: beam.id,
				order_package_id: securing.order_package_id,
				material_variant_id: Array.isArray(beam.type)
					? beam.type[0]?.id
					: beam.type?.id,
				material_type: "Securing",
				is_final: securing.is_final,
				quantity: beam.quantity || 0,
				unit_id: null,
				length: null, // Beam schema doesn't have length
				width: beam.width,
				height: beam.thickness,
				comment: `Securing: ${role}`,
				item_used: true,
				quantity_used: beam.quantity,
				variant_name: variantName,
				material_name: materialName,
				unit_name: null,
				from_template: true,
			});
		};

		processBeam(template.horizontal_bar, "Horizontal Bar");
		processBeam(template.vertical_bar, "Vertical Bar");
		processBeam(template.skids, "Skids");

		return materials;
	});

	return [...standardMaterials, ...securingMaterials] as PackageMaterial[];
}

/** Fetches package services for all packages in an order. */
export async function fetchPackageServices(
	orderId: string,
): Promise<PackageService[]> {
	const packageIds = await fetchOrderPackageIds(orderId);
	if (packageIds.length === 0) return [];

	const data = await queryRowsInChunks<any>(packageIds, (chunk) =>
		supabase
			.from("order_package_services")
			.select(`
          id,
          order_package_id,
          service_id,
          is_final,
          result,
          service:services!order_package_services_service_id_fkey (
            service
          )
        `)
			.in("order_package_id", chunk),
	);

	return data.map((item: any) => ({
		...item,
		service_name: Array.isArray(item.service)
			? item.service[0]?.service
			: item.service?.service,
	})) as PackageService[];
}

/** Fetches approved material variants for dropdowns. */
export async function fetchAvailableMaterials(): Promise<
	{ id: string; variant_name: string; material_name: string | undefined }[]
> {
	const { data, error } = await supabase
		.from("material_variants")
		.select(`
          id,
          variant_name,
          material:materials!material_variants_material_id_fkey (
            id,
            name
          )
        `)
		.eq("approval_status", "approved")
		.order("variant_name");

	if (error) throw error;
	return data.map((v: any) => ({
		id: v.id,
		variant_name: v.variant_name,
		material_name: Array.isArray(v.material)
			? v.material[0]?.name
			: v.material?.name,
	}));
}

/** Fetches units of measure for dropdowns. */
export async function fetchAvailableUnits(): Promise<
	{ id: string; name: string }[]
> {
	const { data, error } = await supabase
		.from("units_of_measure")
		.select("id, name")
		.order("name");

	if (error) throw error;
	return data;
}
