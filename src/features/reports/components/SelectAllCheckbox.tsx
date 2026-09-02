import { useEffect, useRef } from "react";
import { cn } from "../../../lib/cn";
import type { SelectAllState } from "../lineOptions";

interface SelectAllCheckboxProps {
	state: SelectAllState;
	onChange: (checked: boolean) => void;
	label?: string;
	/** Describes what the control governs, for screen readers. */
	"aria-describedby"?: string;
	id?: string;
}

/**
 * Master checkbox for a group of options.
 *
 * Uses a real <input type="checkbox"> and sets the DOM `indeterminate` property
 * for the partial state — that is what makes assistive tech announce "mixed".
 * Setting aria-checked by hand on a native checkbox would conflict with the
 * element's own state, so it is deliberately not used here.
 */
export function SelectAllCheckbox({
	state,
	onChange,
	label = "Select all",
	id,
	...aria
}: SelectAllCheckboxProps) {
	const ref = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (ref.current) ref.current.indeterminate = state === "some";
	}, [state]);

	return (
		<label
			className={cn(
				"flex cursor-pointer items-center gap-2 rounded text-sm font-semibold",
				"text-neutral-700",
			)}
		>
			<input
				id={id}
				ref={ref}
				type="checkbox"
				className="size-4 cursor-pointer accent-primary-600"
				checked={state === "all"}
				// An indeterminate box selects everything rather than clearing.
				onChange={() => onChange(state !== "all")}
				aria-describedby={aria["aria-describedby"]}
			/>
			{label}
		</label>
	);
}
