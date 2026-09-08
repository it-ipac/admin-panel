// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportBoxSelectionProvider } from "../reportBoxSelectionContext";
import type { FilterParams, ReportInstanceData } from "../types";
import { useReportInstancesQuery } from "./useReportBuilderQueries";

const apiMocks = vi.hoisted(() => ({
	fetchClientDetails: vi.fn(),
	fetchClients: vi.fn(),
	fetchCompanyProfile: vi.fn(),
	fetchDestinations: vi.fn(),
	fetchOrderDetails: vi.fn(),
	fetchOrders: vi.fn(),
	fetchOrderTotals: vi.fn(),
	fetchProjectTags: vi.fn(),
	fetchReportInstances: vi.fn(),
	fetchTemplates: vi.fn(),
}));

vi.mock("../api", () => apiMocks);

const filters: FilterParams = {
	clientId: "client-1",
	orderIds: [],
	dateFrom: null,
	dateTo: null,
	dateFilterMode: "item_packed_at",
	tags: [],
	destinations: [],
	hasItemsOnly: false,
	packedOnly: true,
	statusFilter: null,
	photosFirst: false,
	splitBy: "none",
	orderSort: "name",
	boxId: null,
	tagSortPriority: "",
	destSortPriority: "",
	sortMode: "destination_first",
};

const reportInstances = [
	{ id: "box-1" },
	{ id: "box-2" },
	{ id: "box-3" },
] as ReportInstanceData[];

function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
}

function Probe() {
	const { data } = useReportInstancesQuery(filters);
	return <output data-testid="ids">{data?.map((item) => item.id).join(",")}</output>;
}

function SelectionHarness() {
	const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
	return (
		<ReportBoxSelectionProvider excludedBoxIds={excluded}>
			<button
				type="button"
				onClick={() => setExcluded(new Set(["box-2"]))}
			>
				Exclude box 2
			</button>
			<Probe />
		</ReportBoxSelectionProvider>
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	apiMocks.fetchReportInstances.mockResolvedValue(reportInstances);
});

afterEach(cleanup);

describe("useReportInstancesQuery box selection", () => {
	it("keeps the full filtered result outside the selection provider", async () => {
		render(
			<QueryClientProvider client={createQueryClient()}>
				<Probe />
			</QueryClientProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId("ids").textContent).toBe("box-1,box-2,box-3"),
		);
		expect(apiMocks.fetchReportInstances).toHaveBeenCalledTimes(1);
	});

	it("removes excluded boxes from the preview-facing query result", async () => {
		render(
			<QueryClientProvider client={createQueryClient()}>
				<ReportBoxSelectionProvider excludedBoxIds={new Set(["box-2"])}>
					<Probe />
				</ReportBoxSelectionProvider>
			</QueryClientProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId("ids").textContent).toBe("box-1,box-3"),
		);
		expect(apiMocks.fetchReportInstances).toHaveBeenCalledTimes(1);
	});

	it("updates the preview immediately when selection changes without refetching", async () => {
		render(
			<QueryClientProvider client={createQueryClient()}>
				<SelectionHarness />
			</QueryClientProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId("ids").textContent).toBe("box-1,box-2,box-3"),
		);
		fireEvent.click(screen.getByRole("button", { name: "Exclude box 2" }));
		await waitFor(() =>
			expect(screen.getByTestId("ids").textContent).toBe("box-1,box-3"),
		);
		expect(apiMocks.fetchReportInstances).toHaveBeenCalledTimes(1);
	});
});
