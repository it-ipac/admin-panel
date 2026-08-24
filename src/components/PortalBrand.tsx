interface PortalBrandProps {
	variant?: "header" | "full";
	className?: string;
	markClassName?: string;
	showTagline?: boolean;
}

function Wordmark({ compact = false }: { compact?: boolean }) {
	return (
		<span
			className={`portal-wordmark inline-flex items-baseline whitespace-nowrap ${
				compact
					? "text-[14px] min-[480px]:text-[15px] sm:text-[17px] md:text-[18px]"
					: "text-2xl sm:text-[28px]"
			}`}
		>
			<span className="metrix-wordmark__metrix">METRIX-</span>
			<span className="metrix-wordmark__assets">ASSETS</span>
			<span className="metrix-wordmark__version ml-[0.08em] translate-y-[0.17em] text-[0.55em] font-black">
				4.0
			</span>
		</span>
	);
}

export function PortalBrand({
	variant = "full",
	className = "",
	markClassName = "",
	showTagline = false,
}: PortalBrandProps) {
	if (variant === "header") {
		return (
			<span
				className={`inline-flex min-w-0 shrink items-center gap-1.5 ${className}`}
			>
				<img
					src="/IPAC_logo.svg"
					alt=""
					aria-hidden="true"
					className={`h-8 w-8 shrink-0 object-contain min-[360px]:h-9 min-[360px]:w-9 sm:h-10 sm:w-10 md:h-[42px] md:w-[42px] ${markClassName}`}
				/>
				<span className="max-[359px]:hidden">
					<Wordmark compact />
				</span>
			</span>
		);
	}

	return (
		<span className={`inline-flex items-center gap-3 text-left ${className}`}>
			<img
				src="/IPAC_logo.svg"
				alt=""
				aria-hidden="true"
				className={`h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14 ${markClassName}`}
			/>
			<span className="flex flex-col gap-1">
				<Wordmark />
				{showTagline ? (
					<span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-app-text-muted sm:text-[11px]">
						Powered by Precision
					</span>
				) : null}
			</span>
		</span>
	);
}
