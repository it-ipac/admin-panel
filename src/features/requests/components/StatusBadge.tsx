import { cn } from "../../../lib/cn";

interface StatusBadgeProps {
	isBlocked: boolean;
	parentLabel?: string;
}

export function StatusBadge({ isBlocked, parentLabel }: StatusBadgeProps) {
	if (isBlocked) {
		return (
			<span
				className={cn(
					"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
					"bg-gray-100 text-gray-600 border border-gray-200",
				)}
				title={
					parentLabel
						? `Waiting for: ${parentLabel}`
						: "Waiting for parent request approval"
				}
			>
				<span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
				Blocked
			</span>
		);
	}

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
				"bg-green-50 text-green-700 border border-green-200",
			)}
		>
			<span className="w-1.5 h-1.5 rounded-full bg-green-500" />
			Ready to review
		</span>
	);
}

interface RequestTypeBadgeProps {
	type: "material" | "material_variant" | "supplier_pricing";
}

const TYPE_LABELS: Record<RequestTypeBadgeProps["type"], string> = {
	material: "Material",
	material_variant: "Variant",
	supplier_pricing: "Pricing",
};

const TYPE_CLASSES: Record<RequestTypeBadgeProps["type"], string> = {
	material: "bg-blue-50 text-blue-700 border-blue-200",
	material_variant: "bg-purple-50 text-purple-700 border-purple-200",
	supplier_pricing: "bg-orange-50 text-orange-700 border-orange-200",
};

export function RequestTypeBadge({ type }: RequestTypeBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
				TYPE_CLASSES[type],
			)}
		>
			{TYPE_LABELS[type]}
		</span>
	);
}

interface ActionBadgeProps {
	action: "approved" | "rejected";
}

export function ActionBadge({ action }: ActionBadgeProps) {
	const isApproved = action === "approved";
	return (
		<span
			className={cn(
				"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
				isApproved
					? "bg-green-50 text-green-700 border-green-200"
					: "bg-red-50 text-red-700 border-red-200",
			)}
		>
			{isApproved ? "Approved" : "Rejected"}
		</span>
	);
}
