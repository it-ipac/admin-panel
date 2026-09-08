import { createContext, type ReactNode, useContext } from "react";

const ReportBoxSelectionContext = createContext<ReadonlySet<string> | null>(null);

export function ReportBoxSelectionProvider({
	excludedBoxIds,
	children,
}: {
	excludedBoxIds: ReadonlySet<string>;
	children: ReactNode;
}) {
	return (
		<ReportBoxSelectionContext.Provider value={excludedBoxIds}>
			{children}
		</ReportBoxSelectionContext.Provider>
	);
}

export function useReportBoxSelection() {
	return useContext(ReportBoxSelectionContext);
}
