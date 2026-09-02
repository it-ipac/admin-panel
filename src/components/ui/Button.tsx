import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
	cn(
		"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border",
		"font-medium transition-colors",
		// WCAG 2.5.8: every target clears 24x24 CSS px.
		"min-h-6 min-w-6",
		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
		"disabled:pointer-events-none disabled:opacity-50",
	),
	{
		variants: {
			variant: {
				primary:
					"border-transparent bg-primary-600 text-white hover:bg-primary-700",
				secondary:
					"border-transparent bg-neutral-100 text-neutral-800 hover:bg-neutral-200",
				outline:
					"border-neutral-300 bg-transparent text-neutral-700 hover:bg-neutral-100",
				ghost:
					"border-transparent bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
				danger:
					"border-transparent bg-danger-600 text-white hover:bg-danger-700",
				link: "border-transparent bg-transparent text-primary-700 underline-offset-4 hover:underline dark:text-primary-300",
			},
			size: {
				sm: "h-8 px-2.5 text-xs",
				md: "h-10 px-4 text-sm",
				lg: "h-11 px-6 text-base",
				icon: "size-10 p-0",
				"icon-sm": "size-8 p-0",
			},
		},
		defaultVariants: { variant: "primary", size: "md" },
	},
);

type ButtonBase = Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"children"
> &
	VariantProps<typeof buttonVariants> & {
		/** Renders a spinner, disables the button and marks it busy. */
		loading?: boolean;
		/** Render as the single child element instead of a <button>. */
		asChild?: boolean;
		ref?: Ref<HTMLButtonElement>;
	};

/**
 * An icon-only button carries no text, so an accessible name is required rather
 * than optional (WCAG 4.1.2). The union makes that a type error, not a review
 * comment.
 */
type IconOnlyProps = ButtonBase & {
	size: "icon" | "icon-sm";
	"aria-label": string;
	children?: ReactNode;
};

type LabelledProps = ButtonBase & {
	size?: Exclude<
		VariantProps<typeof buttonVariants>["size"],
		"icon" | "icon-sm"
	>;
	children: ReactNode;
};

export type ButtonProps = IconOnlyProps | LabelledProps;

export function Button({
	className,
	variant,
	size,
	loading = false,
	asChild = false,
	disabled,
	children,
	ref,
	...props
}: ButtonProps) {
	const classes = cn(buttonVariants({ variant, size }), className);

	// Radix Slot merges its props into a SINGLE child element, so this branch must
	// render exactly one child: no spinner alongside it, and none of the
	// button-only attributes (type/disabled) that would land on an <a>.
	// `loading` is therefore not supported with asChild — wrap the trigger in a
	// real Button if you need a pending state.
	if (asChild) {
		return (
			<Slot ref={ref} className={classes} {...props}>
				{children}
			</Slot>
		);
	}

	const isIcon = size === "icon" || size === "icon-sm";
	return (
		<button
			ref={ref}
			// A <button> inside a form defaults to type="submit"; be explicit.
			type={props.type ?? "button"}
			className={classes}
			disabled={disabled || loading}
			aria-busy={loading || undefined}
			{...props}
		>
			{loading && (
				<Loader2
					className={cn("size-4 animate-spin", !isIcon && "-ml-0.5")}
					aria-hidden="true"
				/>
			)}
			{children}
		</button>
	);
}

export { buttonVariants };
