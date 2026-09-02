import type { Ref } from "react";
import { Badge, type BadgeProps } from "./Badge";
import { statusLabel, statusTone } from "./tone";

export interface StatusPillProps
	extends Omit<BadgeProps, "children" | "tone" | "dot"> {
	/** A domain status such as `in_progress`, `approved` or `on_hold`. */
	status: string | null | undefined;
	/** Override the derived label (the raw status is humanised by default). */
	label?: string;
	ref?: Ref<HTMLSpanElement>;
}

/**
 * Renders a domain status with the tone and label derived from `tone.ts`, so
 * status colours cannot drift between routes.
 */
export function StatusPill({ status, label, ...props }: StatusPillProps) {
	return (
		<Badge tone={statusTone(status)} dot {...props}>
			{label ?? statusLabel(status)}
		</Badge>
	);
}
