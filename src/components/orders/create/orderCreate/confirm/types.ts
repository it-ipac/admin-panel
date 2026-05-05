import type { AppliedExcelTemplateMode, PackageEditableField } from "../types";

export interface OrderCreateSummary {
	orderName: string;
	clientName: string;
	fileName?: string | null;
	packageCount?: number;
	selectedCategoryLabels?: string[];
	clientMode: "existing" | "new";
	newClientDetails?: {
		name: string;
		contact_person?: string | null;
		email?: string | null;
		phone?: string | null;
		address?: string | null;
	};
	worksheetNames?: string[];
}

export interface OrderCreateDetailTable {
	tableName: string;
	description: string;
	columns: Array<{ column: string; value: string; note?: string }>;
}

export interface ManufacturingPartPreview {
	key: string;
	typeLabel: string | null;
	typeId: string | null;
	typeResolved: boolean;
	typeOptions: Array<{ id: string; label: string }>;
	hasMatchedOptions: boolean;
	showAllOptions: boolean;
	quantity: number | null;
	thickness: number | null;
	width: number | null;
	space: number | null;
}

export interface PackagePreview {
	packageNumber: number;
	rowIndex: number;
	designation: string | null;
	quantity: number | null;
	boxTypeLabel: string | null;
	boxTypeResolved: boolean;
	seiCategoryRaw: string | null;
	seiProtectionRaw: string | null;
	packingTypeRaw: string | null;
	packingTypeLabel: string | null;
	packingTypeResolved: boolean;
	packingTypeOptions: Array<{ id: string; label: string }> | null;
	packingTypeId: string | null;
	seiCategoryId: number | null;
	seiProtectionId: number | null;
	seiCategoryOptions: Array<{ id: number; label: string }>;
	seiProtectionOptions: Array<{ id: number; label: string }>;
	hasMatchedSeiCategories: boolean;
	hasMatchedSeiProtections: boolean;
	hasMatchedPackingOptions: boolean;
	showAllPackingOptions: boolean;
	internal: {
		length: number | null;
		width: number | null;
		height: number | null;
	};
	item: { length: number | null; width: number | null; height: number | null };
	external: {
		length: number | null;
		width: number | null;
		height: number | null;
	};
	netWeight: number | null;
	tare: number | null;
	grossWeight: number | null;
	manufacturing: {
		big: {
			template: ManufacturingPartPreview;
			horizontal: ManufacturingPartPreview;
			vertical: ManufacturingPartPreview;
		};
		small: {
			template: ManufacturingPartPreview;
			horizontal: ManufacturingPartPreview;
			vertical: ManufacturingPartPreview;
		};
		lid: {
			template: ManufacturingPartPreview;
			horizontal: ManufacturingPartPreview;
			vertical: ManufacturingPartPreview;
		};
		base: {
			template: ManufacturingPartPreview;
			horizontal: ManufacturingPartPreview;
			vertical: ManufacturingPartPreview;
			skids: ManufacturingPartPreview;
		};
	};
	securing: ManufacturingPartPreview[];
	accessories: ManufacturingPartPreview[];
	destination: string | null;
	tag: string;
	ipacReference: string | null;
	instanceOverrides?: Record<number, { destination: string | null }>;
}

export interface PackageItemMatchStatus {
	status: "matched" | "unmatched";
	searchedItemNumber: string;
	matchedItemNumber?: string;
	matchedItemId?: string;
}

export interface OrderCreateConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	templateMode?: AppliedExcelTemplateMode;
	summary: OrderCreateSummary;
	detailTables: OrderCreateDetailTable[];
	packagePreviews: PackagePreview[];
	packageIssueMessages?: Record<number, string[]>;
	partIssueMessages?: Record<string, string[]>;
	itemMatchStatusByPackage?: Record<number, PackageItemMatchStatus>;
	onPackageFieldChange: (
		packageNumber: number,
		field: PackageEditableField,
		value: string | number | null,
	) => void;
	onPackageRemove: (packageNumber: number) => void;
	onPackingTypeChange: (packageNumber: number, packingTypeId: string) => void;
	onSeiCategoryChange: (
		packageNumber: number,
		seiCategoryId: number | null,
	) => void;
	onSeiProtectionChange: (
		packageNumber: number,
		seiProtectionId: number | null,
	) => void;
	onPackingTypeOptionsToggle: (packageNumber: number) => void;
	onManufacturingTypeChange: (key: string, typeId: string) => void;
	onManufacturingFieldChange: (
		key: string,
		field: "quantity" | "width" | "thickness" | "space",
		value: number | null,
	) => void;
	onManufacturingOptionsToggle: (key: string) => void;
	onManufacturingPartAdd: (key: string) => void;
	onManufacturingPartRemove: (key: string) => void;
	onInstanceOverrideChange: (
		packageNumber: number,
		instanceNumber: number,
		destination: string | null,
	) => void;
	onFetchItems: () => void;
	isFetchingItems?: boolean;
	fetchItemsDisabled?: boolean;
	fetchItemsDisabledReason?: string;
	onMakeAllPositive?: () => void;
	negativeValueCount?: number;
	confirmDisabled?: boolean;
	confirmDisabledReason?: string;
	templateWarningCount?: number;
	onConfirm: () => void;
	isSubmitting: boolean;
	submitError?: string | null;
}
