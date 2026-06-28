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

	it("parses TAQA per-box codes from column B (SB + m2m)", () => {
		const sheet = createSheet();

		// Standard box: no item, becomes "Standard Box", ref derived from col B.
		sheet.getCell("A4").value = 1;
		sheet.getCell("B4").value = "ADF-P-AC-SB-#01";
		sheet.getCell("C4").value = "Wooden Box";

		// m2m box: item number is the token right after "#<box>-".
		sheet.getCell("A5").value = 1;
		sheet.getCell("B5").value = "ADF-P-NAC-#01-181072516-02G07B003-(NB+DFS)";
		sheet.getCell("C5").value = "Wooden Box";

		// m2m box with decimal box number + alphanumeric item number.
		sheet.getCell("A6").value = 1;
		sheet.getCell("B6").value = "AIN-W-AC-#08-N02248-Check-(NB+DFS)";
		sheet.getCell("C6").value = "Wooden Box";

		const rows = parsePackageRows(sheet, 0);
		expect(rows).toHaveLength(3);

		// SB box → no item, Standard Box, derived ref == col B.
		expect(rows[0].designation).toBeNull();
		expect(rows[0].boxTypeLabel).toBe("Standard Box");
		expect(rows[0].destination).toBe("ADF");
		expect(rows[0].tagL1).toBe("P");
		expect(rows[0].tagL2).toBe("AC");
		expect(rows[0].boxNo).toBe("#01");
		expect(rows[0].ipacReference).toBe("ADF-P-AC-SB-#01");

		// m2m box → item number extracted, real box type kept.
		expect(rows[1].designation).toBe("181072516");
		expect(rows[1].boxTypeLabel).toBe("Wooden Box");
		expect(rows[1].destination).toBe("ADF");
		expect(rows[1].tagL1).toBe("P");
		expect(rows[1].tagL2).toBe("NAC");
		expect(rows[1].boxNo).toBe("#01");
		expect(rows[1].boxItemReference).toBe("02G07B003");
		expect(rows[1].ipacReference).toBe("ADF-P-NAC-#01");

		// Alphanumeric item number.
		expect(rows[2].designation).toBe("N02248");
		expect(rows[2].boxItemReference).toBe("Check");
		expect(rows[2].ipacReference).toBe("AIN-W-AC-#08");
	});

	it("trusts column B over Extended-info for TAQA codes (the AC/NAC conflict)", () => {
		const sheet = createSheet();

		// Extended-info present but DISAGREES with column B — mirrors the real client
		// bug where Non-AC m2m boxes are mis-tagged "AC". Column B must win.
		sheet.getCell("BMD3").value = "Destination";
		sheet.getCell("BME3").value = "tag L1";
		sheet.getCell("BMF3").value = "tag L2";
		sheet.getCell("BMG3").value = "Box no.";
		sheet.getCell("BMH3").value = "IPAC ref";
		sheet.getCell("BMI3").value = "box type";

		sheet.getCell("A4").value = 1;
		sheet.getCell("B4").value = "ADF-P-NAC-#01-181072516-02G07B003-(NB+DFS)";
		sheet.getCell("C4").value = "Wooden Box";
		sheet.getCell("BMD4").value = "ADF";
		sheet.getCell("BME4").value = "P";
		sheet.getCell("BMF4").value = "AC"; // WRONG (col B says NAC)
		sheet.getCell("BMG4").value = "#01";
		sheet.getCell("BMH4").value = "ADF-P-AC-#01"; // WRONG

		const rows = parsePackageRows(sheet, 0);
		expect(rows).toHaveLength(1);
		expect(rows[0].tagL2).toBe("NAC"); // from col B, not the buggy "AC"
		expect(rows[0].ipacReference).toBe("ADF-P-NAC-#01"); // derived from col B
		expect(rows[0].designation).toBe("181072516"); // item still from col B
	});

	it("falls back to Extended-info when column B is not a TAQA box code", () => {
		const sheet = createSheet();

		sheet.getCell("BMD3").value = "Destination";
		sheet.getCell("BME3").value = "tag L1";
		sheet.getCell("BMF3").value = "tag L2";
		sheet.getCell("BMH3").value = "IPAC ref";

		sheet.getCell("A4").value = 1;
		sheet.getCell("B4").value = "PLAIN-DESIGNATION"; // no #box token → not a TAQA code
		sheet.getCell("C4").value = "Wooden Box";
		sheet.getCell("BMD4").value = "AUH";
		sheet.getCell("BME4").value = "W";
		sheet.getCell("BMF4").value = "AC";
		sheet.getCell("BMH4").value = "CUSTOM-REF-99";

		const rows = parsePackageRows(sheet, 0);
		expect(rows).toHaveLength(1);
		expect(rows[0].destination).toBe("AUH");
		expect(rows[0].tagL1).toBe("W");
		expect(rows[0].ipacReference).toBe("CUSTOM-REF-99");
		expect(rows[0].designation).toBe("PLAIN-DESIGNATION");
	});

	it("uses Extended-info box type 'SB' only when column B is not a TAQA code", () => {
		const sheet = createSheet();

		sheet.getCell("BMD3").value = "Destination";
		sheet.getCell("BMI3").value = "box type";

		// Non-TAQA column B (no #box token) → Extended-info box type decides.
		sheet.getCell("A4").value = 1;
		sheet.getCell("B4").value = "PLAIN-DESIGNATION";
		sheet.getCell("C4").value = "Wooden Box";
		sheet.getCell("BMD4").value = "ADF";
		sheet.getCell("BMI4").value = "SB";

		const rows = parsePackageRows(sheet, 0);
		expect(rows).toHaveLength(1);
		expect(rows[0].designation).toBeNull();
		expect(rows[0].boxTypeLabel).toBe("Standard Box");

		// A TAQA m2m code with Extended-info box type "SB" stays m2m — column B wins.
		const sheet2 = createSheet();
		sheet2.getCell("BMI3").value = "box type";
		sheet2.getCell("A4").value = 1;
		sheet2.getCell("B4").value = "ADF-P-NAC-#01-181072516-02G07B003-(NB+DFS)";
		sheet2.getCell("C4").value = "Wooden Box";
		sheet2.getCell("BMI4").value = "SB";
		const rows2 = parsePackageRows(sheet2, 0);
		expect(rows2[0].designation).toBe("181072516");
		expect(rows2[0].boxTypeLabel).toBe("Wooden Box");
	});
});
