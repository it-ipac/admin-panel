import { type ComponentProps, type FC, useMemo, useState } from "react";
import { useReportInstancesQuery } from "../hooks/useReportBuilderQueries";
import { ReportBoxSelectionProvider } from "../reportBoxSelectionContext";
import { buildSelectionOrderTotals } from "../reportBoxSelectionTotals";
import type { FilterParams, ReportInstanceData } from "../types";
import { getBoxTags } from "../utils";
import {
	BoxSelectionPanel,
	type BoxSelectionOption,
} from "./BoxSelectionPanel";
import { LivePreviewPanel } from "./LivePreviewPanel";

type SelectableLivePreviewPanelProps = ComponentProps<typeof LivePreviewPanel>;

export function getSelectableReportInstances(
	instances: ReportInstanceData[] | undefined,
	filters: FilterParams,
): ReportInstanceData[] {
	if (!instances) return [];

	let result = [...instances];
	if (filters.packedOnly) {
		result = result.filter((instance) => instance.status === "packed");
	}
	if (filters.statusFilter) {
		result = result.filter((instance) => instance.status === filters.statusFilter);
	}
	if (filters.boxId) {
		result = result.filter((instance) => instance.id === filters.boxId);
	}
	if (filters.tags.length > 0) {
		result = result.filter((instance) => {
			const instanceTags = getBoxTags(instance);
			return filters.tags.some((tag) =>
				instanceTags.includes(tag.toLowerCase()),
			);
		});
	}

	return result;
}

function toBoxSelectionOption(instance: ReportInstanceData): BoxSelectionOption {
	const fallbackLabel = `Box ${instance.package_number}${
		instance.instance_number > 1 ? ` (Inst ${instance.instance_number})` : ""
	}${instance.package_reference ? ` - ${instance.package_reference}` : ""}`;
	const label =
		instance.ipac_reference?.trim() ||
		instance.package_reference?.trim() ||
		fallbackLabel;
	const meta = [instance.order_name, instance.destination]
		.filter(Boolean)
		.join(" · ");
	const searchText = [
		instance.ipac_reference,
		instance.package_reference,
		instance.order_reference,
		instance.order_name,
		instance.destination,
		instance.tag,
		`box ${instance.package_number}`,
		`instance ${instance.instance_number}`,
	]
		.filter(Boolean)
		.join(" ");

	return { id: instance.id, label, meta, searchText };
}

export const SelectableLivePreviewPanel: FC<SelectableLivePreviewPanelProps> = (
	props,
) => {
	const [excludedBoxIds, setExcludedBoxIds] = useState<Set<string>>(
		() => new Set(),
	);
	const { data: instances, isLoading, error } = useReportInstancesQuery(
		props.filters,
	);

	const selectableInstances = useMemo(
		() => getSelectableReportInstances(instances, props.filters),
		[instances, props.filters],
	);
	const options = useMemo(
		() => selectableInstances.map(toBoxSelectionOption),
		[selectableInstances],
	);
	const hasActiveExclusions = useMemo(
		() => selectableInstances.some((instance) => excludedBoxIds.has(instance.id)),
		[selectableInstances, excludedBoxIds],
	);
	const orderTotalsByOrder = useMemo(
		() => buildSelectionOrderTotals(selectableInstances, excludedBoxIds),
		[selectableInstances, excludedBoxIds],
	);

	const hasReportScope =
		Boolean(props.filters.clientId) || props.filters.orderIds.length > 0;
	const showSelector = hasReportScope && !isLoading && !error;

	const selectedSingleOrderTotals =
		hasActiveExclusions && props.filters.orderIds.length === 1
			? orderTotalsByOrder.get(props.filters.orderIds[0])
			: null;
	const selectionAwareHeaderData = selectedSingleOrderTotals
		? {
				...props.headerData,
				nw: String(selectedSingleOrderTotals.totalNW),
				gw: String(selectedSingleOrderTotals.totalGW),
				totalVolume: String(selectedSingleOrderTotals.totalVolume),
			}
		: props.headerData;

	return (
		<div className="relative h-full min-h-0">
			{showSelector && (
				<div className="absolute right-3 top-3 z-40">
					<BoxSelectionPanel
						options={options}
						excludedBoxIds={excludedBoxIds}
						onExcludedBoxIdsChange={setExcludedBoxIds}
					/>
				</div>
			)}
			<div className="h-full min-h-0">
				<ReportBoxSelectionProvider
					excludedBoxIds={excludedBoxIds}
					hasActiveExclusions={hasActiveExclusions}
					orderTotalsByOrder={orderTotalsByOrder}
				>
					<LivePreviewPanel
						{...props}
						headerData={selectionAwareHeaderData}
					/>
				</ReportBoxSelectionProvider>
			</div>
		</div>
	);
};
