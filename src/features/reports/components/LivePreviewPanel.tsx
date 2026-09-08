import { type ComponentProps, type FC, useMemo, useState } from "react";
import { useReportInstancesQuery } from "../hooks/useReportBuilderQueries";
import { ReportBoxSelectionProvider } from "../reportBoxSelectionContext";
import type { FilterParams, ReportInstanceData } from "../types";
import { getBoxTags } from "../utils";
import {
	BoxSelectionPanel,
	type BoxSelectionOption,
} from "./BoxSelectionPanel";
import { LivePreviewPanel as LegacyLivePreviewPanel } from "./LivePreviewPanelLegacy";

type LivePreviewPanelProps = ComponentProps<typeof LegacyLivePreviewPanel>;

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

export const LivePreviewPanel: FC<LivePreviewPanelProps> = (props) => {
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

	const hasReportScope =
		Boolean(props.filters.clientId) || props.filters.orderIds.length > 0;
	const showSelector = hasReportScope && !isLoading && !error;

	return (
		<div className="flex h-full min-h-0 flex-col">
			{showSelector && (
				<BoxSelectionPanel
					options={options}
					excludedBoxIds={excludedBoxIds}
					onExcludedBoxIdsChange={setExcludedBoxIds}
				/>
			)}
			<div className="min-h-0 flex-1">
				<ReportBoxSelectionProvider excludedBoxIds={excludedBoxIds}>
					<LegacyLivePreviewPanel {...props} />
				</ReportBoxSelectionProvider>
			</div>
		</div>
	);
};
