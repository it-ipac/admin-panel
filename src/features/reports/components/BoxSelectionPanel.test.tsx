// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
	BoxSelectionPanel,
	type BoxSelectionOption,
	setAllCurrentBoxesSelected,
} from "./BoxSelectionPanel";

afterEach(cleanup);

const options: BoxSelectionOption[] = [
	{
		id: "box-1",
		label: "AIN-P-AC-#16",
		meta: "TAQA Order A · AIN",
		searchText: "package 16",
	},
	{
		id: "box-2",
		label: "AIN-P-NAC-#01",
		meta: "TAQA Order A · AIN",
		searchText: "package 1",
	},
	{
		id: "box-3",
		label: "DXB-W-AC-#05",
		meta: "TAQA Order B · DXB",
		searchText: "package 5",
	},
];

function Harness({ initialExcluded = [] }: { initialExcluded?: string[] }) {
	const [excluded, setExcluded] = useState(() => new Set(initialExcluded));
	return (
		<BoxSelectionPanel
			options={options}
			excludedBoxIds={excluded}
			onExcludedBoxIdsChange={setExcluded}
		/>
	);
}

describe("BoxSelectionPanel", () => {
	it("starts with every filtered box selected and shows the count", () => {
		render(<Harness />);
		expect(screen.getByText("3 / 3 selected")).toBeTruthy();
		expect(
			(screen.getByRole("checkbox", { name: "Deselect all" }) as HTMLInputElement)
				.checked,
		).toBe(true);
	});

	it("deselects an individual box and enters the partial master state", () => {
		render(<Harness />);
		fireEvent.click(screen.getByRole("checkbox", { name: "AIN-P-NAC-#01" }));

		expect(screen.getByText("2 / 3 selected")).toBeTruthy();
		const master = screen.getByRole("checkbox", {
			name: "Select all",
		}) as HTMLInputElement;
		expect(master.checked).toBe(false);
		expect(master.indeterminate).toBe(true);
	});

	it("master toggle deselects and reselects all boxes in the current filter", () => {
		render(<Harness />);
		fireEvent.click(screen.getByRole("checkbox", { name: "Deselect all" }));
		expect(screen.getByText("0 / 3 selected")).toBeTruthy();

		fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
		expect(screen.getByText("3 / 3 selected")).toBeTruthy();
	});

	it("searches by reference and metadata without changing selection count", () => {
		render(<Harness />);
		fireEvent.change(screen.getByRole("searchbox", { name: "Search boxes" }), {
			target: { value: "DXB" },
		});

		expect(screen.queryByText("AIN-P-AC-#16")).toBeNull();
		expect(screen.getByText("DXB-W-AC-#05")).toBeTruthy();
		expect(screen.getByText("3 / 3 selected")).toBeTruthy();
	});

	it("select-all preserves exclusions that are outside the current filtered set", () => {
		const next = setAllCurrentBoxesSelected(
			new Set(["box-1", "outside-filter"]),
			options,
			true,
		);
		expect(next.has("box-1")).toBe(false);
		expect(next.has("outside-filter")).toBe(true);
	});
});
