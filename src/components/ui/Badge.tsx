import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode, Ref } from "react";
import { cn } from "../../lib/cn";
import { type Tone, toneDot, toneSolid, toneSubtle } from "./tone";

const badgeVariants = cva(
	"inline-flex items-center gap-1.5 whitespace-nowrap border font-medium",
	{
		variants: {
			size: {
				// Floor is 12px: badges carry operational meaning and must stay legible.
				sm: "rounded-full px-2 py-0.5 text-xs",
				md: "rounded-full px-2.5 py-1 text-sm",
			},
		},
		defaultVariants: { size: "sm" },
	},
);

export interface BadgeProps
	extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children">,
		VariantProps<typeof badgeVariants> {
	tone?: Tone;
	/** `subtle` tints the surface; `solid` fills it. */
	appearance?: "subtle" | "solid";
	/** Leading status dot — a non-colour cue alongside the tone (WCAG 1.4.1). */
	dot?: boolean;
	children: ReactNode;
	ref?: Ref<HTMLSpanElement>;
}

export function Badge({
	className,
	tone = "neutral",
	appearance = "subtle",
	size,
	dot = false,
	children,
	ref,
	...props
}: BadgeProps) {
	return (
		<span
			ref={ref}
			className={cn(
				badgeVariants({ size }),
				appearance === "solid" ? toneSolid[tone] : toneSubtle[tone],
				className,
			)}
			{...props}
		>
			{dot && (
				<span
					className={cn(
						"size-1.5 shrink-0 rounded-full",
						appearance === "solid" ? "bg-current" : toneDot[tone],
					)}
					aria-hidden="true"
				/>
			)}
			{children}
		</span>
	);
}

export { badgeVariants };
