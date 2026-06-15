import type ExcelJS from "exceljs";
import type { Order, PackageMaterial } from "../../types";
import { headerStyle, subHeaderStyle } from "./styles";

/** Sheet 3: aggregated material quantities + estimated cost. */
export function addMaterialsSummarySheet(
	workbook: ExcelJS.Workbook,
	order: Order,
	packageMaterials: PackageMaterial[] | undefined,
	getMaterialCost: (mat: PackageMaterial) => number,
): void {
	const matSummarySheet = workbook.addWorksheet("Materials Summary");

	matSummarySheet.mergeCells("A1:E1");
	const matSumTitle = matSummarySheet.getCell("A1");
	matSumTitle.value = `Materials Summary - ${order.order_name}`;
	matSumTitle.font = { bold: true, size: 14 };
	matSumTitle.alignment = { horizontal: "center" };

	// Aggregate all materials
	const materialSummary: Record<
		string,
		{ qty: number; unit: string; cost: number }
	> = {};
	packageMaterials?.forEach((mat) => {
		const key = `${mat.material_name || "Unknown"} - ${mat.variant_name || "Default"}`;
		if (!materialSummary[key]) {
			materialSummary[key] = { qty: 0, unit: mat.unit_name || "", cost: 0 };
		}
		materialSummary[key].qty += mat.quantity || 0;

		// Calculate cost
		materialSummary[key].cost += getMaterialCost(mat);
	});

	let rowIndex = 3;
	const sumHeaderRow = matSummarySheet.getRow(rowIndex);
	sumHeaderRow.getCell(1).value = "Material";
	sumHeaderRow.getCell(2).value = "Total Quantity";
	sumHeaderRow.getCell(3).value = "Unit";
	sumHeaderRow.getCell(4).value = "Est. Cost (AED)";
	Object.assign(sumHeaderRow.getCell(1), subHeaderStyle);
	Object.assign(sumHeaderRow.getCell(2), subHeaderStyle);
	Object.assign(sumHeaderRow.getCell(3), subHeaderStyle);
	Object.assign(sumHeaderRow.getCell(4), subHeaderStyle);
	rowIndex++;

	let totalMaterialCost = 0;

	Object.entries(materialSummary)
		.sort((a, b) => a[0].localeCompare(b[0]))
		.forEach(([name, data]) => {
			const row = matSummarySheet.getRow(rowIndex);
			row.values = [
				name,
				data.qty,
				data.unit,
				data.cost > 0 ? `AED ${data.cost.toFixed(2)}` : "—",
			];
			totalMaterialCost += data.cost;
			rowIndex++;
		});

	// Total Cost Row
	rowIndex++;
	const totalRow = matSummarySheet.getRow(rowIndex);
	totalRow.getCell(3).value = "TOTAL COST:";
	totalRow.getCell(3).font = { bold: true };
	totalRow.getCell(3).alignment = { horizontal: "right" };
	totalRow.getCell(4).value = `AED ${totalMaterialCost.toFixed(2)}`;
	totalRow.getCell(4).font = { bold: true, color: { argb: "FF16A34A" } };
	totalRow.getCell(4).fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFE5E7EB" },
	};

	matSummarySheet.columns = [
		{ width: 40 },
		{ width: 15 },
		{ width: 10 },
		{ width: 20 },
	];
}

/** Sheet 4: materials grouped by package and type. */
export function addMaterialsBreakdownSheet(
	workbook: ExcelJS.Workbook,
	order: Order,
	packageMaterials: PackageMaterial[] | undefined,
	getMaterialCost: (mat: PackageMaterial) => number,
): void {
	const matBreakdownSheet = workbook.addWorksheet("Materials Breakdown");

	matBreakdownSheet.mergeCells("A1:H1");
	const matBreakTitle = matBreakdownSheet.getCell("A1");
	matBreakTitle.value = `Materials Breakdown by Package - ${order.order_name}`;
	matBreakTitle.font = { bold: true, size: 14 };
	matBreakTitle.alignment = { horizontal: "center" };

	// Manufacturing types mapping
	const materialTypeLabels: Record<string, string> = {
		"Big Sides": "Big Sides",
		"Small Sides": "Small Sides",
		Lis: "Lid",
		Base: "Base",
		Body: "Body",
		Accessories: "Accessories",
		"Vacuum Packing": "Vacuum Packing",
		"Gas Packing": "Gas Packing",
		Securing: "Securing",
	};

	// Group materials by package
	const materialsByPackage: Record<string, PackageMaterial[]> = {};
	packageMaterials?.forEach((mat) => {
		if (!materialsByPackage[mat.order_package_id]) {
			materialsByPackage[mat.order_package_id] = [];
		}
		materialsByPackage[mat.order_package_id].push(mat);
	});

	let rowIndex = 3;
	const packages = [...(order.order_packages || [])].sort(
		(a, b) => a.package_number - b.package_number,
	);

	packages.forEach((pkg) => {
		const pkgMaterials = materialsByPackage[pkg.id] || [];

		// Package header
		matBreakdownSheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
		const pkgHeaderCell = matBreakdownSheet.getCell(`A${rowIndex}`);
		pkgHeaderCell.value = `Box #${pkg.package_number}${pkg.description ? ` - ${pkg.description}` : ""}`;
		pkgHeaderCell.font = {
			bold: true,
			size: 12,
			color: { argb: "FFFFFFFF" },
		};
		pkgHeaderCell.fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FF1F2937" },
		};
		rowIndex++;

		// Materials headers
		const matHeaders = [
			"Category",
			"Material",
			"Variant",
			"Qty",
			"Dimensions",
			"Unit",
			"Est. Cost (AED)",
			"Comment",
		];
		const matHeaderRow = matBreakdownSheet.getRow(rowIndex);
		matHeaders.forEach((header, i) => {
			const cell = matHeaderRow.getCell(i + 1);
			cell.value = header;
			Object.assign(cell, headerStyle);
		});
		rowIndex++;

		// Group materials by type
		const materialsByType: Record<string, PackageMaterial[]> = {};
		pkgMaterials.forEach((mat) => {
			const type = materialTypeLabels[mat.material_type] || mat.material_type;
			if (!materialsByType[type]) {
				materialsByType[type] = [];
			}
			materialsByType[type].push(mat);
		});

		// Helper to add rows
		const addMaterialRows = (types: string[]) => {
			types.forEach((type) => {
				const label = materialTypeLabels[type] || type;
				const mats = materialsByType[label];
				if (mats && mats.length > 0) {
					mats.forEach((mat, idx) => {
						const row = matBreakdownSheet.getRow(rowIndex);
						const dims =
							mat.length && mat.width && mat.height
								? `${mat.length} × ${mat.width} × ${mat.height}`
								: mat.length && mat.width
									? `${mat.length} × ${mat.width}`
									: "—";

						const cost = getMaterialCost(mat);

						row.values = [
							idx === 0 ? label : "",
							mat.material_name || "—",
							mat.variant_name || "—",
							mat.quantity || 0,
							dims,
							mat.unit_name || "—",
							cost > 0 ? `AED ${cost.toFixed(2)}` : "—",
							mat.comment || "",
						];
						if (idx === 0) {
							row.getCell(1).font = { bold: true };
						}
						rowIndex++;
					});
				}
			});
		};

		// Manufacturing materials
		addMaterialRows(["Body", "Big Sides", "Small Sides", "Lid", "Base"]);

		// Others
		addMaterialRows([
			"Accessories",
			"Vacuum Packing",
			"Gas Packing",
			"Securing",
		]);

		if (pkgMaterials.length === 0) {
			const row = matBreakdownSheet.getRow(rowIndex);
			row.getCell(1).value = "No materials assigned";
			row.getCell(1).font = { italic: true, color: { argb: "FF6B7280" } };
			rowIndex++;
		}

		rowIndex++; // Add spacing between packages
	});

	matBreakdownSheet.columns = [
		{ width: 18 },
		{ width: 25 },
		{ width: 20 },
		{ width: 10 },
		{ width: 20 },
		{ width: 10 },
		{ width: 20 },
		{ width: 30 },
	];
}
