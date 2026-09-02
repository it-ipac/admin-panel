import type { Ref } from "react";
import { cn } from "../../lib/cn";

type Div = React.HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> };
type Heading = React.HTMLAttributes<HTMLHeadingElement> & {
	ref?: Ref<HTMLHeadingElement>;
	/** Pick the level that fits the page outline (WCAG 1.3.1). */
	as?: "h2" | "h3" | "h4";
};

/** The standard panel surface: app surface, hairline border, lg radius. */
export function Card({ className, ref, ...props }: Div) {
	return (
		<div
			ref={ref}
			className={cn(
				"rounded-xl border border-neutral-200 bg-app-surface",
				className,
			)}
			{...props}
		/>
	);
}

export function CardHeader({ className, ref, ...props }: Div) {
	return (
		<div
			ref={ref}
			className={cn(
				"flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4",
				className,
			)}
			{...props}
		/>
	);
}

export function CardTitle({ className, as = "h2", ref, ...props }: Heading) {
	const Comp = as;
	return (
		<Comp
			ref={ref}
			className={cn("text-base font-semibold text-neutral-900", className)}
			{...props}
		/>
	);
}

export function CardDescription({ className, ref, ...props }: Div) {
	return (
		<p
			ref={ref as Ref<HTMLParagraphElement>}
			className={cn("mt-1 text-sm text-neutral-500", className)}
			{...props}
		/>
	);
}

export function CardContent({ className, ref, ...props }: Div) {
	return <div ref={ref} className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ref, ...props }: Div) {
	return (
		<div
			ref={ref}
			className={cn(
				"flex items-center gap-3 border-t border-neutral-200 px-5 py-4",
				className,
			)}
			{...props}
		/>
	);
}
