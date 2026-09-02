import type { Ref } from "react";
import { cn } from "../../lib/cn";

/**
 * Table shell used by the list routes. The wrapper owns horizontal scrolling so
 * wide tables never push the page body sideways, and `Th` sets `scope` so screen
 * readers can associate cells with headers (WCAG 1.3.1).
 */

type TableEl = React.TableHTMLAttributes<HTMLTableElement> & {
	ref?: Ref<HTMLTableElement>;
};
type SectionEl = React.HTMLAttributes<HTMLTableSectionElement> & {
	ref?: Ref<HTMLTableSectionElement>;
};
type RowEl = React.HTMLAttributes<HTMLTableRowElement> & {
	ref?: Ref<HTMLTableRowElement>;
};
type CellEl = React.TdHTMLAttributes<HTMLTableCellElement> & {
	ref?: Ref<HTMLTableCellElement>;
};
type HeaderCellEl = React.ThHTMLAttributes<HTMLTableCellElement> & {
	ref?: Ref<HTMLTableCellElement>;
};

/** Scroll container. Keep wide tables inside this, not on the page body. */
export function TableContainer({
	className,
	ref,
	...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
	return (
		<div ref={ref} className={cn("overflow-x-auto", className)} {...props} />
	);
}

export function Table({ className, ref, ...props }: TableEl) {
	return (
		<table
			ref={ref}
			className={cn("min-w-full border-collapse", className)}
			{...props}
		/>
	);
}

export function THead({ className, ref, ...props }: SectionEl) {
	return (
		<thead ref={ref} className={cn("bg-neutral-100", className)} {...props} />
	);
}

export function TBody({ className, ref, ...props }: SectionEl) {
	return <tbody ref={ref} className={className} {...props} />;
}

export function Tr({ className, ref, ...props }: RowEl) {
	return (
		<tr
			ref={ref}
			className={cn("border-t border-neutral-200", className)}
			{...props}
		/>
	);
}

export function Th({ className, scope = "col", ref, ...props }: HeaderCellEl) {
	return (
		<th
			ref={ref}
			scope={scope}
			className={cn(
				"px-4 py-3 text-left text-xs font-semibold text-neutral-600",
				className,
			)}
			{...props}
		/>
	);
}

export function Td({ className, ref, ...props }: CellEl) {
	return (
		<td
			ref={ref}
			className={cn("px-4 py-3 text-sm text-neutral-700", className)}
			{...props}
		/>
	);
}
