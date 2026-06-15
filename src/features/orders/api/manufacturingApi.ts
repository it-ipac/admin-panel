import { supabase } from "@/lib/supabase";
import { queryRowsInChunks } from "../utils/chunked";
import { fetchOrderPackageIds } from "./common";

/** A flattened order_package_securing row with template + beam details.
 *  Shape mirrors ManufacturingSecuringData expected by ManufacturingTab. */
export interface ManufacturingTemplate {
	id: string;
	order_package_id: string;
	securing_side: "big_sides" | "small_sides" | "lid" | "base";
	is_final: boolean;
	template: {
		id: string;
		quantity: number | null;
		thickness: number | null;
		type_name: string | null;
		material_name: string | null;
	};
	horizontal_bar: ManufacturingBeam | null;
	vertical_bar: ManufacturingBeam | null;
	skids: ManufacturingBeam | null;
}

export interface ManufacturingBeam {
	id: string;
	quantity: number | null;
	width: number | null;
	thickness: number | null;
	space: number | null;
	type_name: string | null;
	material_name: string | null;
}

/** Fetches manufacturing templates (order_package_securing with securing_template and beams). */
export async function fetchPackageManufacturing(
	orderId: string,
): Promise<ManufacturingTemplate[]> {
	const packageIds = await fetchOrderPackageIds(orderId);
	if (packageIds.length === 0) return [];

	const securingRows = await queryRowsInChunks<any>(packageIds, (chunk) =>
		supabase
			.from("order_package_securing")
			.select(`
          id,
          order_package_id,
          securing_side,
          is_final,
          securing_template (
            id,
            quantity,
            thickness,
            type_id,
            horizontal_bar,
            vertical_bar,
            skids,
            type:material_variants!securing_template_type_id_fkey (
              id,
              variant_name,
              material:materials (
                name
              )
            )
          )
        `)
			.in("order_package_id", chunk),
	);

	// Fetch beam details for all referenced beams
	const beamIds = new Set<string>();
	securingRows?.forEach((securing: any) => {
		if (securing.securing_template?.horizontal_bar)
			beamIds.add(securing.securing_template.horizontal_bar);
		if (securing.securing_template?.vertical_bar)
			beamIds.add(securing.securing_template.vertical_bar);
		if (securing.securing_template?.skids)
			beamIds.add(securing.securing_template.skids);
	});

	let beamsData: any[] = [];
	const beamIdList = Array.from(beamIds);
	if (beamIdList.length > 0) {
		beamsData = await queryRowsInChunks<any>(beamIdList, (chunk) =>
			supabase
				.from("beam")
				.select(`
            id,
            quantity,
            width,
            thickness,
            space,
            type:material_variants!beam_type_fkey (
              id,
              variant_name,
              material:materials (
                name
              )
            )
          `)
				.in("id", chunk),
		);
	}

	// Build lookup map for beams
	const beamMap = new Map(beamsData.map((b) => [b.id, b]));

	// Transform the data to include beam details
	return securingRows.map((securing: any) => {
		const template = securing.securing_template;
		const type = Array.isArray(template?.type)
			? template.type[0]
			: template?.type;
		const typeMaterial = Array.isArray(type?.material)
			? type.material[0]
			: type?.material;

		const getBeamData = (beamId: string | null) => {
			if (!beamId) return null;
			const beam = beamMap.get(beamId);
			if (!beam) return null;
			const beamType = Array.isArray(beam.type) ? beam.type[0] : beam.type;
			const beamMaterial = Array.isArray(beamType?.material)
				? beamType.material[0]
				: beamType?.material;
			return {
				id: beam.id,
				quantity: beam.quantity,
				width: beam.width,
				thickness: beam.thickness,
				space: beam.space,
				type_name: beamType?.variant_name || null,
				material_name: beamMaterial?.name || null,
			};
		};

		return {
			id: securing.id,
			order_package_id: securing.order_package_id,
			securing_side: securing.securing_side,
			is_final: securing.is_final,
			template: {
				id: template?.id,
				quantity: template?.quantity,
				thickness: template?.thickness,
				type_name: type?.variant_name || null,
				material_name: typeMaterial?.name || null,
			},
			horizontal_bar: getBeamData(template?.horizontal_bar),
			vertical_bar: getBeamData(template?.vertical_bar),
			skids: getBeamData(template?.skids),
		} as ManufacturingTemplate;
	});
}
