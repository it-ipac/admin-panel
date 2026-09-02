import { AlertCircle, Loader2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
	Card,
	CardHeader,
	CardTitle,
	StatusPill,
} from "../../../components/ui";
import type { StatusCounts } from "../deriveDashboardMetrics";

/** Status → chart colour, drawn from the same tokens the pills use. */
const SLICE_COLORS: Record<string, string> = {
	pending: "var(--color-warning-500)",
	in_progress: "var(--color-primary-500)",
	completed: "var(--color-success-500)",
	on_hold: "var(--color-ember-500)",
	cancelled: "var(--color-neutral-400)",
};

interface StatusBreakdownProps {
	counts: StatusCounts;
	loading?: boolean;
	error?: boolean;
	mounted: boolean;
}

export function StatusBreakdown({
	counts,
	loading = false,
	error = false,
	mounted,
}: StatusBreakdownProps) {
	const slices = (
		[
			["pending", counts.pending],
			["in_progress", counts.inProgress],
			["completed", counts.completed],
			["on_hold", counts.onHold],
			["cancelled", counts.cancelled],
		] as const
	)
		.filter(([, value]) => value > 0)
		.map(([status, value]) => ({ status, value }));

	const classified = slices.reduce((sum, s) => sum + s.value, 0);
	const unclassified = counts.total - classified;

	return (
		<Card>
			<CardHeader>
				<div>
					<CardTitle>Status breakdown</CardTitle>
					<p className="mt-1 text-sm text-neutral-500">
						{error
							? "Order data unavailable"
							: counts.total === 0
								? "No orders on record"
								: `${classified} of ${counts.total} orders classified`}
					</p>
				</div>
			</CardHeader>

			<div className="p-5">
				<div className="h-40">
					{loading || !mounted ? (
						<Placeholder>
							<Loader2 className="size-5 animate-spin" aria-hidden="true" />
							Loading…
						</Placeholder>
					) : error ? (
						<Placeholder>
							<AlertCircle className="size-5" aria-hidden="true" />
							Breakdown unavailable
						</Placeholder>
					) : slices.length === 0 ? (
						<Placeholder>No orders with a production status yet</Placeholder>
					) : (
						<ResponsiveContainer width="100%" height="100%" minWidth={0}>
							<PieChart>
								<Pie
									data={slices}
									dataKey="value"
									nameKey="status"
									cx="50%"
									cy="50%"
									innerRadius={34}
									outerRadius={62}
									paddingAngle={2}
								>
									{slices.map((slice) => (
										<Cell
											key={slice.status}
											fill={
												SLICE_COLORS[slice.status] ?? "var(--color-neutral-400)"
											}
										/>
									))}
								</Pie>
								<Tooltip
									contentStyle={{
										background: "var(--color-chart-tooltip-bg)",
										border: "1px solid var(--color-chart-grid)",
										borderRadius: "0.5rem",
										color: "var(--app-text)",
										fontSize: 12,
									}}
								/>
							</PieChart>
						</ResponsiveContainer>
					)}
				</div>

				{!loading && !error && slices.length > 0 && (
					<ul className="mt-4 space-y-2">
						{slices.map((slice) => (
							<li
								key={slice.status}
								className="flex items-center justify-between gap-3"
							>
								<StatusPill status={slice.status} />
								<span className="text-sm font-semibold tabular-nums text-neutral-900">
									{slice.value}
								</span>
							</li>
						))}
						{unclassified > 0 && (
							<li className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-2">
								<span className="text-sm text-neutral-500">No status set</span>
								<span className="text-sm font-semibold tabular-nums text-neutral-600">
									{unclassified}
								</span>
							</li>
						)}
					</ul>
				)}
			</div>
		</Card>
	);
}

function Placeholder({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 text-center text-sm text-neutral-500">
			{children}
		</div>
	);
}
