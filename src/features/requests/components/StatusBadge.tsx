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
					"bg-neutral-100 text-neutral-600 border border-neutral-200",
				)}
				title={
					parentLabel
						? `Waiting for: ${parentLabel}`
						: "Waiting for parent request approval"
				}
			>
				<span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
				Blocked
			</span>
		);
	}

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
				"bg-success-50 text-success-700 border border-success-200",
			)}
		>
			<span className="w-1.5 h-1.5 rounded-full bg-success-500" />
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
	material: "bg-primary-50 text-primary-700 border-primary-200",
	material_variant: "bg-accent-50 text-accent-700 border-accent-200",
	supplier_pricing: "bg-ember-50 text-ember-700 border-ember-200",
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
					? "bg-success-50 text-success-700 border-success-200"
					: "bg-danger-50 text-danger-700 border-danger-200",
			)}
		>
			{isApproved ? "Approved" : "Rejected"}
		</span>
	);
}
