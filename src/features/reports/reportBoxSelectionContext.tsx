import { createContext, type ReactNode, useContext } from "react";
import type { ReportSelectionOrderTotals } from "./reportBoxSelectionTotals";

type ReportBoxSelectionState = {
	excludedBoxIds: ReadonlySet<string>;
	orderTotalsByOrder: ReadonlyMap<string, ReportSelectionOrderTotals>;
};

const ReportBoxSelectionContext = createContext<ReportBoxSelectionState | null>(
	null,
);

export function ReportBoxSelectionProvider({
	excludedBoxIds,
	orderTotalsByOrder,
	children,
}: {
	excludedBoxIds: ReadonlySet<string>;
	orderTotalsByOrder: ReadonlyMap<string, ReportSelectionOrderTotals>;
	children: ReactNode;
}) {
	return (
		<ReportBoxSelectionContext.Provider
			value={{ excludedBoxIds, orderTotalsByOrder }}
		>
			{children}
		</ReportBoxSelectionContext.Provider>
	);
}

export function useReportBoxSelection() {
	return useContext(ReportBoxSelectionContext);
}
