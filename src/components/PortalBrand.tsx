interface PortalBrandProps {
	variant?: "header" | "full";
	className?: string;
	markClassName?: string;
	showTagline?: boolean;
}

const brandFont =
	'Montserrat, "Avenir Next", "Century Gothic", Futura, "Arial Black", Arial, sans-serif';

function Wordmark({ compact = false }: { compact?: boolean }) {
	return (
		<span
			className={`inline-flex items-end whitespace-nowrap font-black leading-none ${
				compact
					? "text-[14px] min-[480px]:text-[15px] sm:text-[17px] md:text-[18px]"
					: "text-[28px] min-[390px]:text-[30px] sm:text-[34px]"
			}`}
			style={{
				fontFamily: brandFont,
				fontWeight: 900,
				letterSpacing: "-0.045em",
			}}
		>
			<span style={{ color: "#1e289c" }}>METRIX-</span>
			<span style={{ color: "#317bc6" }}>ASSETS</span>
			<span
				className="ml-[0.08em] inline-block text-[0.5em] leading-none"
				style={{
					color: "#317bc6",
					fontWeight: 900,
					letterSpacing: "-0.04em",
					transform: "translateY(-0.04em)",
				}}
			>
				4.0
			</span>
		</span>
	);
}

function Tagline() {
	return (
		<span className="mt-2 flex w-full items-center justify-center gap-2.5 sm:mt-2.5 sm:gap-3">
			<span
				aria-hidden="true"
				className="h-px min-w-0 flex-1"
				style={{
					background:
						"linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(125,164,181,0.38) 38%, #155576 100%)",
				}}
			/>
			<span
				className="shrink-0 whitespace-nowrap text-[12px] italic leading-none text-neutral-950 dark:text-white min-[390px]:text-[13px] sm:text-[15px]"
				style={{
					fontFamily: 'Arial, Helvetica, sans-serif',
					fontWeight: 400,
					letterSpacing: "-0.01em",
				}}
			>
				Powered by Precision
			</span>
			<span
				aria-hidden="true"
				className="h-px min-w-0 flex-1"
				style={{
					background:
						"linear-gradient(90deg, #155576 0%, rgba(125,164,181,0.38) 62%, rgba(255,255,255,0) 100%)",
				}}
			/>
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
		<span
			className={`inline-flex w-full max-w-[22rem] flex-col items-center justify-center text-center ${className}`}
		>
			<img
				src="/IPAC_logo.svg"
				alt=""
				aria-hidden="true"
				className={`mb-2.5 h-auto w-[8.25rem] shrink-0 object-contain min-[390px]:w-[8.75rem] sm:mb-3 sm:w-[9.5rem] ${markClassName}`}
			/>
			<Wordmark />
			{showTagline ? <Tagline /> : null}
		</span>
	);
}
