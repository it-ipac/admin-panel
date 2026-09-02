import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from "lucide-react";
import { Card } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import type { PeriodChange } from "../deriveDashboardMetrics";

interface StatCardProps {
	title: string;
	value: number | null;
	/** Real, derived supporting detail. Omit rather than invent one. */
	subtitle?: string;
	/** Trailing-window comparison. Omit when the metric has no time dimension. */
	change?: PeriodChange;
	changeWindowLabel?: string;
	icon: React.ComponentType<{ className?: string }>;
	loading?: boolean;
	error?: boolean;
}

export function StatCard({
	title,
	value,
	subtitle,
	change,
	changeWindowLabel = "vs previous period",
	icon: Icon,
	loading = false,
	error = false,
}: StatCardProps) {
	return (
		<Card className="p-5">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium text-neutral-600">{title}</p>
					<div className="mt-2 text-3xl font-bold tabular-nums text-neutral-900">
						{loading ? (
							<Loader2
								className="size-7 animate-spin text-neutral-400"
								aria-label={`Loading ${title}`}
							/>
						) : error || value === null ? (
							<span className="text-lg font-semibold text-neutral-500">
								Unavailable
							</span>
						) : (
							value
						)}
					</div>
					{!loading && !error && subtitle && (
						<p className="mt-1.5 text-xs text-neutral-500">{subtitle}</p>
					)}
				</div>
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
					<Icon className="size-5" />
				</div>
			</div>

			{!loading && !error && change && (
				<ChangeIndicator change={change} windowLabel={changeWindowLabel} />
			)}
		</Card>
	);
}

function ChangeIndicator({
	change,
	windowLabel,
}: {
	change: PeriodChange;
	windowLabel: string;
}) {
	// No honest percentage exists when the prior window held nothing.
	if (change.percent === null) {
		return (
			<p className="mt-3 text-xs text-neutral-500">
				{change.current} added · no prior period to compare
			</p>
		);
	}

	const flat = change.percent === 0;
	const up = change.percent > 0;
	const Arrow = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

	return (
		<p className="mt-3 flex items-center gap-1.5 text-xs">
			<span
				className={cn(
					"inline-flex items-center gap-1 font-medium",
					flat
						? "text-neutral-600"
						: up
							? "text-success-700 dark:text-success-300"
							: "text-danger-700 dark:text-danger-300",
				)}
			>
				<Arrow className="size-3.5" aria-hidden="true" />
				{flat ? "No change" : `${up ? "+" : ""}${change.percent}%`}
			</span>
			<span className="text-neutral-500">{windowLabel}</span>
		</p>
	);
}
