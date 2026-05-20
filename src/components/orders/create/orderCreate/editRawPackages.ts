import type { PackageEditableField, RawPackageRow } from "./types";
import { normalizePackingTypeCode, updateRawPackageByNumber } from "./utils";

export const applyPackageFieldChange = (
	rows: RawPackageRow[],
	packageNumber: number,
	field: PackageEditableField,
	value: string | number | null,
) =>
	updateRawPackageByNumber(rows, packageNumber, (pkg) => {
		const next = { ...pkg };
		if (field === "quantity") next.quantity = value as number | null;
		if (field === "designation") next.designation = (value as string) || "";
		if (field === "boxTypeLabel")
			next.boxTypeLabel = ((value as string) || "").trim() || null;
		if (field === "packingTypeRaw") {
			next.packingTypeRaw = ((value as string) || "").trim() || null;
			next.packingTypeCode = normalizePackingTypeCode(next.packingTypeRaw);
		}
		if (field === "item.length") next.item_length = value as number | null;
		if (field === "item.width") next.item_width = value as number | null;
		if (field === "item.height") next.item_height = value as number | null;
		if (field === "internal.length")
			next.internal_length = value as number | null;
		if (field === "internal.width")
			next.internal_width = value as number | null;
		if (field === "internal.height")
			next.internal_height = value as number | null;
		if (field === "external.length")
			next.external_length = value as number | null;
		if (field === "external.width")
			next.external_width = value as number | null;
		if (field === "external.height")
			next.external_height = value as number | null;
		if (field === "netWeight") next.net_weight = value as number | null;
		if (field === "tare") next.tare = value as number | null;
		if (field === "destination") next.destination = value as string | null;
		next.gross_weight =
			next.net_weight !== null && next.tare !== null
				? Math.floor(Number((next.net_weight + next.tare).toFixed(8)) * 100) /
					100
				: null;
		return next;
	});

export const applyManufacturingFieldChange = (
	rows: RawPackageRow[],
	key: string,
	field: "quantity" | "width" | "thickness" | "space",
	value: number | null,
) => {
	const [, pkgRaw, group, section] = key.split(":");
	const packageNumber = Number(pkgRaw);
	if (!Number.isFinite(packageNumber) || !group) return rows;

	return updateRawPackageByNumber(rows, packageNumber, (pkg) => {
		const next = structuredClone(pkg);
		if (group === "securing" || group === "accessory") {
			const index = Number(section);
			if (!Number.isFinite(index)) return next;
			if (group === "securing" && next.securing[index]) {
				if (field === "quantity") next.securing[index].quantity = value;
				if (field === "width") next.securing[index].width = value;
				if (field === "thickness") next.securing[index].thickness = value;
			}
			if (
				group === "accessory" &&
				next.accessories[index] &&
				field === "quantity"
			) {
				next.accessories[index].amount = value;
			}
			return next;
		}

		const side = next.manufacturing[
			group as keyof RawPackageRow["manufacturing"]
		] as any;
		if (!side) return next;
		if (section === "template") {
			if (field === "quantity") side.quantity = value;
			if (field === "thickness") side.thickness = value;
			return next;
		}

		const bar =
			section === "skids"
				? next.manufacturing.base.skids
				: side[section as "horizontal" | "vertical"];
		if (!bar) return next;
		if (field === "quantity") bar.quantity = value;
		if (field === "width") bar.width = value;
		if (field === "thickness") bar.thickness = value;
		if (field === "space") bar.space = value;
		return next;
	});
};

export const applyManufacturingPartTypeLabelChange = (
	rows: RawPackageRow[],
	key: string,
	typeLabel: string | null,
) => {
	const [, pkgRaw, group, section] = key.split(":");
	const packageNumber = Number(pkgRaw);
	if (!Number.isFinite(packageNumber) || !group) return rows;

	return updateRawPackageByNumber(rows, packageNumber, (pkg) => {
		const next = structuredClone(pkg);
		const normalizedLabel = typeLabel === null ? null : typeLabel;

		if (group === "securing" || group === "accessory") {
			const index = Number(section);
			if (!Number.isFinite(index)) return next;
			if (group === "securing" && next.securing[index]) {
				next.securing[index].typeLabel = normalizedLabel;
			}
			if (group === "accessory" && next.accessories[index]) {
				next.accessories[index].typeLabel = normalizedLabel;
			}
			return next;
		}

		const side = next.manufacturing[
			group as keyof RawPackageRow["manufacturing"]
		] as any;
		if (!side) return next;

		if (section === "template") {
			side.typeLabel = normalizedLabel;
			return next;
		}

		const bar =
			section === "skids"
				? next.manufacturing.base.skids
				: side[section as "horizontal" | "vertical"];
		if (!bar) return next;
		bar.typeLabel = normalizedLabel;
		return next;
	});
};

export const clearManufacturingPart = (rows: RawPackageRow[], key: string) => {
	const [, pkgRaw, group, section] = key.split(":");
	const packageNumber = Number(pkgRaw);
	if (!Number.isFinite(packageNumber) || !group) return rows;

	return updateRawPackageByNumber(rows, packageNumber, (pkg) => {
		const next = structuredClone(pkg);

		if (group === "securing" || group === "accessory") {
			const index = Number(section);
			if (!Number.isFinite(index)) return next;
			if (group === "securing" && next.securing[index]) {
				next.securing[index] = {
					typeLabel: null,
					quantity: null,
					width: null,
					thickness: null,
				};
			}
			if (group === "accessory" && next.accessories[index]) {
				next.accessories[index] = {
					typeLabel: null,
					amount: null,
				};
			}
			return next;
		}

		const side = next.manufacturing[
			group as keyof RawPackageRow["manufacturing"]
		] as any;
		if (!side) return next;

		if (section === "template") {
			side.typeLabel = null;
			side.quantity = null;
			side.thickness = null;
			return next;
		}

		const bar =
			section === "skids"
				? next.manufacturing.base.skids
				: side[section as "horizontal" | "vertical"];
		if (!bar) return next;

		bar.typeLabel = null;
		bar.quantity = null;
		bar.width = null;
		bar.thickness = null;
		bar.space = null;
		return next;
	});
};
