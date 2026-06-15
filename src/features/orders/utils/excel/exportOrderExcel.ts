import ExcelJS from "exceljs";
import { supabase } from "@/lib/supabase";
import type { AttendanceLog, Order, PackageMaterial } from "../../types";
import {
	addManpowerBreakdownSheet,
	addManpowerSummarySheet,
} from "./manpowerSheets";
import {
	addMaterialsBreakdownSheet,
	addMaterialsSummarySheet,
} from "./materialSheets";

/**
 * Builds the order report workbook (manpower summary/breakdown +
 * materials summary/breakdown with supplier-pricing cost estimates)
 * and triggers a browser download.
 */
export async function exportOrderExcel(params: {
	order: Order;
	attendanceLogs: AttendanceLog[] | undefined;
	packageMaterials: PackageMaterial[] | undefined;
}): Promise<void> {
	const { order, attendanceLogs, packageMaterials } = params;

	// Fetch supplier pricing for cost calculation
	const { data: pricingData } = await supabase
		.from("supplier_pricing")
		.select(`
        material_variant_id,
        price_per_unit,
        material_variant:material_variants!supplier_pricing_material_variant_id_fkey (
          length,
          width,
          unit:units_of_measure!material_variants_unit_id_fkey (
            name
          )
        )
      `)
		.eq("approval_status", "approved");

	// Create a map of lowest price per variant with unit info
	const priceMap: Record<
		string,
		{ price: number; unit: string; length: number; width: number }
	> = {};

	pricingData?.forEach((p: any) => {
		const variant = Array.isArray(p.material_variant)
			? p.material_variant[0]
			: p.material_variant;
		const unitName = Array.isArray(variant?.unit)
			? variant?.unit[0]?.name
			: variant?.unit?.name;

		const info = {
			price: Number(p.price_per_unit),
			unit: unitName || "",
			length: Number(variant?.length || 0),
			width: Number(variant?.width || 0),
		};

		const current = priceMap[p.material_variant_id];
		if (!current || info.price < current.price) {
			priceMap[p.material_variant_id] = info;
		}
	});

	const getMaterialCost = (mat: PackageMaterial): number => {
		const priceInfo = priceMap[mat.material_variant_id];
		if (!priceInfo) return 0;

		let unitPrice = priceInfo.price;
		const matUnit = mat.unit_name || "";
		const priceUnit = priceInfo.unit;

		// Unit conversion logic
		if (matUnit !== priceUnit) {
			// Piece to Linear Meter (assuming price is per Meter, length is cm)
			if (matUnit.toLowerCase() === "pce" && priceUnit.toLowerCase() === "ml") {
				const lengthM = (mat.length || 0) / 100;
				if (lengthM > 0) {
					unitPrice = priceInfo.price * lengthM;
				}
			}
			// M2 to Roll (assuming price is per Roll, dimensions are cm)
			else if (
				matUnit.toLowerCase() === "m2" &&
				priceUnit.toLowerCase() === "roll"
			) {
				const rollAreaM2 = (priceInfo.length / 100) * (priceInfo.width / 100);
				if (rollAreaM2 > 0) {
					unitPrice = priceInfo.price / rollAreaM2;
				}
			}
			// Add more conversions as needed
		}

		return (mat.quantity || 0) * unitPrice;
	};

	const workbook = new ExcelJS.Workbook();
	workbook.creator = "IPAC Admin Panel";
	workbook.created = new Date();

	addManpowerSummarySheet(workbook, order, attendanceLogs);
	addManpowerBreakdownSheet(workbook, order, attendanceLogs);
	addMaterialsSummarySheet(workbook, order, packageMaterials, getMaterialCost);
	addMaterialsBreakdownSheet(
		workbook,
		order,
		packageMaterials,
		getMaterialCost,
	);

	// Generate and download the file
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${order.order_name.replace(/[^a-zA-Z0-9]/g, "_")}_Report.xlsx`;
	document.body.appendChild(a);
	a.click();
	window.URL.revokeObjectURL(url);
	document.body.removeChild(a);
}
