interface PortalBrandProps {
	variant?: "horizontal" | "stacked";
	className?: string;
	imageClassName?: string;
	alt?: string;
}

const brandAssets = {
	horizontal: "/assets/ipac_horizontal_logo.svg",
	stacked: "/assets/ipac_vertical_logo.svg",
} as const;

export function PortalBrand({
	variant = "horizontal",
	className = "",
	imageClassName = "",
	alt = "IPAC logo",
}: PortalBrandProps) {
	return (
		<span
			className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ${className}`}
		>
			<img
				src={brandAssets[variant]}
				alt={alt}
				className={`block h-full w-full object-contain ${imageClassName}`}
			/>
		</span>
	);
}
