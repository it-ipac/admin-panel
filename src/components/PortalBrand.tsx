interface PortalBrandProps {
	variant?: "horizontal" | "stacked";
	className?: string;
	imageClassName?: string;
	alt?: string;
}

const brandAssets = {
	horizontal: "/metrix-assets-horizontal.jpeg",
	stacked: "/metrix-assets-stacked.jpeg",
} as const;

export function PortalBrand({
	variant = "horizontal",
	className = "",
	imageClassName = "",
	alt = "Metrix-Assets 4.0, Powered by Precision",
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
