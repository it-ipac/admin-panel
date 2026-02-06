import { Camera } from "lucide-react";
import { useState } from "react";
import { TwoTierCard } from "../../../ui/TwoTierCard";

interface BeamData {
	id: string;
	quantity: number | null;
	width: number | null;
	thickness: number | null;
	space: number | null;
	type_name: string | null;
	material_name: string | null;
}

interface TemplateData {
	id: string;
	quantity: number | null;
	thickness: number | null;
	type_name: string | null;
	material_name: string | null;
}

interface ManufacturingSecuringData {
	id: string;
	order_package_id: string;
	securing_side: "big_sides" | "small_sides" | "lid" | "base";
	is_final: boolean;
	template: TemplateData;
	horizontal_bar: BeamData | null;
	vertical_bar: BeamData | null;
	skids: BeamData | null;
}

interface ManufacturingTabProps {
	selectedPackageManufacturing: ManufacturingSecuringData[];
}

const SIDE_LABELS: Record<string, string> = {
	big_sides: "Big Sides",
	small_sides: "Small Sides",
	lid: "Lid",
	base: "Base",
};

const Section = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<div className="mb-6 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
		<div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-semibold text-gray-700 text-sm uppercase tracking-wide">
			{title}
		</div>
		<div className="p-4 bg-white flex flex-wrap gap-2">{children}</div>
	</div>
);

export function ManufacturingTab({
	selectedPackageManufacturing,
}: ManufacturingTabProps) {
	const [activeTab, setActiveTab] = useState<
		"big_sides" | "small_sides" | "lid" | "base"
	>("big_sides");

	// Group manufacturing data by side and is_final
	const groupedData = selectedPackageManufacturing.reduce(
		(acc, item) => {
			if (!acc[item.securing_side]) {
				acc[item.securing_side] = { original: null, final: null };
			}
			if (item.is_final) {
				acc[item.securing_side].final = item;
			} else {
				acc[item.securing_side].original = item;
			}
			return acc;
		},
		{} as Record<
			string,
			{
				original: ManufacturingSecuringData | null;
				final: ManufacturingSecuringData | null;
			}
		>,
	);

	const currentData = groupedData[activeTab];

	if (!currentData || !currentData.original) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
					<h3 className="text-lg font-semibold text-gray-800">Manufacturing</h3>
				</div>
				<div className="flex items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
					<div className="text-center">
						<div className="text-4xl mb-3">✨</div>
						<p className="text-gray-500 font-medium">
							No manufacturing data for this package
						</p>
					</div>
				</div>
			</div>
		);
	}

	const original = currentData.original;
	const final = currentData.final || currentData.original; // Fallback to original if final doesn't exist yet

	return (
		<div className="space-y-4">
			{/* Header Section */}
			<div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
				<h3 className="text-lg font-semibold text-gray-800">Manufacturing</h3>
				<button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-colors">
					<Camera className="w-4 h-4" />
					View Images
				</button>
			</div>

			{/* Tabs */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="flex border-b border-gray-200 overflow-x-auto">
					{(["big_sides", "small_sides", "lid", "base"] as const).map(
						(side) => (
							<button
								key={side}
								onClick={() => setActiveTab(side)}
								className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap transition-colors ${
									activeTab === side
										? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
										: "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
								}`}
							>
								{SIDE_LABELS[side]}
							</button>
						),
					)}
				</div>

				<div className="p-6 bg-gray-50/50">
					{/* Template Section */}
					<Section title="Template">
						<TwoTierCard
							label="Qty"
							original={original.template.quantity}
							final={final.template.quantity}
							editable={false}
						/>
						<TwoTierCard
							label="Thickness"
							original={original.template.thickness}
							final={final.template.thickness}
							editable={false}
						/>
						<TwoTierCard
							label="Type"
							original={original.template.type_name}
							final={final.template.type_name}
							editable={false}
							className="min-w-[150px]"
						/>
						<TwoTierCard
							label="Material"
							original={original.template.material_name}
							final={final.template.material_name}
							editable={false}
							className="min-w-[150px]"
						/>
					</Section>

					{/* Horizontal Bars Section */}
					{(original.horizontal_bar || final.horizontal_bar) && (
						<Section title="Horizontal Bars">
							<TwoTierCard
								label="Qty"
								original={original.horizontal_bar?.quantity}
								final={final.horizontal_bar?.quantity}
								editable={false}
							/>
							<TwoTierCard
								label="Width"
								original={original.horizontal_bar?.width}
								final={final.horizontal_bar?.width}
								editable={false}
							/>
							<TwoTierCard
								label="Thickness"
								original={original.horizontal_bar?.thickness}
								final={final.horizontal_bar?.thickness}
								editable={false}
							/>
							<TwoTierCard
								label="Space"
								original={original.horizontal_bar?.space}
								final={final.horizontal_bar?.space}
								editable={false}
							/>
							<TwoTierCard
								label="Type"
								original={original.horizontal_bar?.type_name}
								final={final.horizontal_bar?.type_name}
								editable={false}
								className="min-w-[150px]"
							/>
							<TwoTierCard
								label="Material"
								original={original.horizontal_bar?.material_name}
								final={final.horizontal_bar?.material_name}
								editable={false}
								className="min-w-[150px]"
							/>
						</Section>
					)}

					{/* Vertical Bars Section */}
					{(original.vertical_bar || final.vertical_bar) && (
						<Section title="Vertical Bars">
							<TwoTierCard
								label="Qty"
								original={original.vertical_bar?.quantity}
								final={final.vertical_bar?.quantity}
								editable={false}
							/>
							<TwoTierCard
								label="Width"
								original={original.vertical_bar?.width}
								final={final.vertical_bar?.width}
								editable={false}
							/>
							<TwoTierCard
								label="Thickness"
								original={original.vertical_bar?.thickness}
								final={final.vertical_bar?.thickness}
								editable={false}
							/>
							<TwoTierCard
								label="Space"
								original={original.vertical_bar?.space}
								final={final.vertical_bar?.space}
								editable={false}
							/>
							<TwoTierCard
								label="Type"
								original={original.vertical_bar?.type_name}
								final={final.vertical_bar?.type_name}
								editable={false}
								className="min-w-[150px]"
							/>
							<TwoTierCard
								label="Material"
								original={original.vertical_bar?.material_name}
								final={final.vertical_bar?.material_name}
								editable={false}
								className="min-w-[150px]"
							/>
						</Section>
					)}

					{/* Skids Section */}
					{(original.skids || final.skids) && (
						<Section title="Skids">
							<TwoTierCard
								label="Qty"
								original={original.skids?.quantity}
								final={final.skids?.quantity}
								editable={false}
							/>
							<TwoTierCard
								label="Width"
								original={original.skids?.width}
								final={final.skids?.width}
								editable={false}
							/>
							<TwoTierCard
								label="Thickness"
								original={original.skids?.thickness}
								final={final.skids?.thickness}
								editable={false}
							/>
							<TwoTierCard
								label="Space"
								original={original.skids?.space}
								final={final.skids?.space}
								editable={false}
							/>
							<TwoTierCard
								label="Type"
								original={original.skids?.type_name}
								final={final.skids?.type_name}
								editable={false}
								className="min-w-[150px]"
							/>
							<TwoTierCard
								label="Material"
								original={original.skids?.material_name}
								final={final.skids?.material_name}
								editable={false}
								className="min-w-[150px]"
							/>
						</Section>
					)}
				</div>
			</div>
		</div>
	);
}
