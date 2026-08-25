interface PortalBrandProps {
	variant?: "header" | "full";
	className?: string;
	markClassName?: string;
	showTagline?: boolean;
}

export function PortalBrand({
	variant = "full",
	className = "",
	markClassName = "",
}: PortalBrandProps) {
	if (variant === "header") {
		return (
			<span className={`inline-flex min-w-0 shrink items-center ${className}`}>
				<img
					src="/IPAC_logo.svg"
					alt=""
					aria-hidden="true"
					className={`h-8 w-8 shrink-0 object-contain min-[360px]:hidden ${markClassName}`}
				/>
				<img
					src="/assets/ipac_horizontal_logo.svg"
					alt=""
					aria-hidden="true"
					className={`hidden h-auto w-[8.75rem] shrink-0 object-contain min-[360px]:block sm:w-[9.75rem] md:w-[10.75rem] ${markClassName}`}
				/>
			</span>
		);
	}

	return (
		<span
			className={`inline-flex max-w-full items-center justify-center overflow-hidden rounded-2xl bg-white p-2 ${className}`}
		>
			<img
				src="/assets/ipac_vertical_logo.svg"
				alt="Metrix-Assets 4.0, Powered by Precision"
				className="block h-auto w-[17rem] max-w-full object-contain sm:w-[20rem]"
			/>
		</span>
	);
}
