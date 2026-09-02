import { AlertCircle, Loader2 } from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Button, Card, CardHeader, CardTitle } from "../../../components/ui";
import type { ActivityPoint } from "../deriveDashboardMetrics";
import { hasActivity } from "../deriveDashboardMetrics";

/** Chart colours come from the theme-aware tokens in styles.css @theme. */
const GRID = "var(--color-chart-grid)";
const AXIS = "var(--color-chart-axis)";
const SERIES_CREATED = "var(--color-chart-series-1)";
const SERIES_COMPLETED = "var(--color-chart-series-2)";

export const RANGE_OPTIONS = [7, 30] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

interface OrderActivityChartProps {
	points: ActivityPoint[];
	rangeDays: RangeDays;
	onRangeChange: (days: RangeDays) => void;
	loading?: boolean;
	error?: boolean;
	/** False when the browser has not mounted yet — Recharts needs real layout. */
	mounted: boolean;
}

export function OrderActivityChart({
	points,
	rangeDays,
	onRangeChange,
	loading = false,
	error = false,
	mounted,
}: OrderActivityChartProps) {
	return (
		<Card>
			<CardHeader>
				<div>
					<CardTitle>Order activity</CardTitle>
					<p className="mt-1 text-sm text-neutral-500">
						Orders created and completed, by day
					</p>
				</div>
				<div
					className="flex shrink-0 gap-1"
					role="group"
					aria-label="Chart date range"
				>
					{RANGE_OPTIONS.map((days) => (
						<Button
							key={days}
							size="sm"
							variant={days === rangeDays ? "primary" : "outline"}
							aria-pressed={days === rangeDays}
							onClick={() => onRangeChange(days)}
						>
							{days} days
						</Button>
					))}
				</div>
			</CardHeader>

			<div className="h-72 p-5">
				<ChartBody
					points={points}
					loading={loading}
					error={error}
					mounted={mounted}
					rangeDays={rangeDays}
				/>
			</div>
		</Card>
	);
}

function ChartBody({
	points,
	loading,
	error,
	mounted,
	rangeDays,
}: {
	points: ActivityPoint[];
	loading: boolean;
	error: boolean;
	mounted: boolean;
	rangeDays: RangeDays;
}) {
	if (loading || !mounted) {
		return (
			<Placeholder>
				<Loader2 className="size-5 animate-spin" aria-hidden="true" />
				Loading order activity…
			</Placeholder>
		);
	}
	if (error) {
		return (
			<Placeholder>
				<AlertCircle className="size-5" aria-hidden="true" />
				Order activity could not be loaded.
			</Placeholder>
		);
	}
	if (!hasActivity(points)) {
		return (
			<Placeholder>
				No orders were created or completed in the last {rangeDays} days.
			</Placeholder>
		);
	}

	return (
		<ResponsiveContainer width="100%" height="100%" minWidth={0}>
			<BarChart data={points} barGap={2}>
				<CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
				<XAxis
					dataKey="label"
					stroke={AXIS}
					fontSize={12}
					tickLine={false}
					interval="preserveStartEnd"
				/>
				<YAxis
					stroke={AXIS}
					fontSize={12}
					allowDecimals={false}
					tickLine={false}
				/>
				<Tooltip
					contentStyle={{
						background: "var(--color-chart-tooltip-bg)",
						border: "1px solid var(--color-chart-grid)",
						borderRadius: "0.5rem",
						color: "var(--app-text)",
						fontSize: 12,
					}}
				/>
				<Legend
					wrapperStyle={{ fontSize: 12, color: "var(--app-text-muted)" }}
				/>
				<Bar
					dataKey="created"
					name="Created"
					fill={SERIES_CREATED}
					radius={[4, 4, 0, 0]}
				/>
				<Bar
					dataKey="completed"
					name="Completed"
					fill={SERIES_COMPLETED}
					radius={[4, 4, 0, 0]}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}

function Placeholder({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 text-center text-sm text-neutral-500">
			{children}
		</div>
	);
}
