import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parsePackageRows } from "./parsePackageRows";

const createSheet = () => {
	const workbook = new ExcelJS.Workbook();
	return workbook.addWorksheet("Calculation");
};

describe("parsePackageRows", () => {
	it("parses legacy v53-and-below mapping without offset", () => {
		const sheet = createSheet();

		sheet.getCell("A4").value = 3;
		sheet.getCell("B4").value = "PKG-Legacy";
		sheet.getCell("C4").value = "Legacy Box";
		sheet.getCell("M4").value = 100;
		sheet.getCell("AB4").value = "53A";
		sheet.getCell("U4").value = 10;
		sheet.getCell("BAB4").value = 2;
		sheet.getCell("BAD3").value = "Legacy Accessory";
		sheet.getCell("BAD4").value = 5;

		const rows = parsePackageRows(sheet, 0);
		expect(rows).toHaveLength(1);

		const first = rows[0];
		expect(first.packageNumber).toBe(1);
		expect(first.quantity).toBe(3);
		expect(first.designation).toBe("PKG-Legacy");
		expect(first.boxTypeLabel).toBe("Legacy Box");
		expect(first.item_length).toBe(100);
		expect(first.packingTypeRaw).toBe("53A");
		expect(first.net_weight).toBe(10);
		expect(first.tare).toBe(2);
		expect(first.gross_weight).toBe(12);
		expect(first.accessories).toContainEqual({
			typeLabel: "Legacy Accessory",
			amount: 5,
		});
	});

	it("parses v54+ mapping with +2 offset and keeps A/B anchors", () => {
		const sheet = createSheet();

		sheet.getCell("A4").value = 9;
		sheet.getCell("B4").value = "PKG-V54";

		sheet.getCell("C4").value = "Wrong Legacy Box";
		sheet.getCell("E4").value = "Shifted Box";

		sheet.getCell("M4").value = 111;
		sheet.getCell("L4").value = 222;

		sheet.getCell("AB4").value = "LegacyPacking";
		sheet.getCell("AA4").value = "54B";

		sheet.getCell("U4").value = 10;
		sheet.getCell("T4").value = 20;

		sheet.getCell("BAB4").value = 1;
		sheet.getCell("BAA4").value = 3;

		sheet.getCell("BAC3").value = "Shifted Accessory";
		sheet.getCell("BAC4").value = 7;

		const rows = parsePackageRows(sheet, 2);
		expect(rows).toHaveLength(1);

		const first = rows[0];
		expect(first.quantity).toBe(9);
		expect(first.designation).toBe("PKG-V54");

		expect(first.boxTypeLabel).toBe("Shifted Box");
		expect(first.item_length).toBe(222);
		expect(first.packingTypeRaw).toBe("54B");
		expect(first.net_weight).toBe(20);
		expect(first.tare).toBe(3);
		expect(first.gross_weight).toBe(23);
		expect(first.accessories).toContainEqual({
			typeLabel: "Shifted Accessory",
			amount: 7,
		});
	});

	it("skips heading rows and accepts first valid package row at row 5", () => {
		const sheet = createSheet();

		// Row 4 mimics heading/noise: designation present but quantity is not a positive whole number.
		sheet.getCell("A4").value = "Qty";
		sheet.getCell("B4").value = "Item Designation";

		// First real package starts at row 5.
		sheet.getCell("A5").value = 2;
		sheet.getCell("B5").value = "PKG-REAL-1";
		sheet.getCell("C5").value = "Wooden Box";

		// Row 6 should be ignored because quantity is decimal.
		sheet.getCell("A6").value = 1.5;
		sheet.getCell("B6").value = "PKG-INVALID-DECIMAL";

		// Row 7 should be ignored because designation is missing.
		sheet.getCell("A7").value = 1;
		sheet.getCell("B7").value = "";

		// Second real package.
		sheet.getCell("A8").value = 1;
		sheet.getCell("B8").value = "PKG-REAL-2";

		const rows = parsePackageRows(sheet, 0);
		expect(rows).toHaveLength(2);

		expect(rows[0].rowIndex).toBe(5);
		expect(rows[0].packageNumber).toBe(1);
		expect(rows[0].designation).toBe("PKG-REAL-1");
		expect(rows[0].quantity).toBe(2);

		expect(rows[1].rowIndex).toBe(8);
		expect(rows[1].packageNumber).toBe(2);
		expect(rows[1].designation).toBe("PKG-REAL-2");
		expect(rows[1].quantity).toBe(1);
	});
});
