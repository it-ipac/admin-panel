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

function Harness({
	initialExcluded = [],
	currentOptions = options,
}: {
	initialExcluded?: string[];
	currentOptions?: BoxSelectionOption[];
}) {
	const [excluded, setExcluded] = useState(() => new Set(initialExcluded));
	return (
		<BoxSelectionPanel
			options={currentOptions}
			excludedBoxIds={excluded}
			onExcludedBoxIdsChange={setExcluded}
		/>
	);
}

function openPanel() {
	fireEvent.click(screen.getByRole("button", { name: /Boxes/ }));
}

describe("BoxSelectionPanel", () => {
	it("stays collapsed until the compact Boxes trigger is clicked", () => {
		render(<Harness />);
		const trigger = screen.getByRole("button", { name: /Boxes/ });
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByRole("dialog", { name: "Boxes to include" })).toBeNull();

		openPanel();
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		expect(screen.getByRole("dialog", { name: "Boxes to include" })).toBeTruthy();
		expect(screen.getByText("3 of 3 selected")).toBeTruthy();
	});

	it("starts with every filtered box selected", () => {
		render(<Harness />);
		openPanel();
		expect(
			(screen.getByRole("checkbox", { name: "Deselect all" }) as HTMLInputElement)
				.checked,
		).toBe(true);
	});

	it("deselects an individual box and enters the partial master state", () => {
		render(<Harness />);
		openPanel();
		fireEvent.click(
			screen.getByRole("checkbox", { name: /AIN-P-NAC-#01/ }),
		);

		expect(screen.getByText("2 of 3 selected")).toBeTruthy();
		const master = screen.getByRole("checkbox", {
			name: "Select all",
		}) as HTMLInputElement;
		expect(master.checked).toBe(false);
		expect(master.indeterminate).toBe(true);
	});

	it("master toggle deselects and reselects all boxes in the current filter", () => {
		render(<Harness />);
		openPanel();
		fireEvent.click(screen.getByRole("checkbox", { name: "Deselect all" }));
		expect(screen.getByText("0 of 3 selected")).toBeTruthy();

		fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
		expect(screen.getByText("3 of 3 selected")).toBeTruthy();
	});

	it("searches by reference and metadata without changing selection count", () => {
		render(<Harness />);
		openPanel();
		fireEvent.change(screen.getByRole("searchbox", { name: "Search boxes" }), {
			target: { value: "DXB" },
		});

		expect(screen.queryByText("AIN-P-AC-#16")).toBeNull();
		expect(screen.getByText("DXB-W-AC-#05")).toBeTruthy();
		expect(screen.getByText("3 of 3 selected")).toBeTruthy();
	});

	it("master select-all still applies to the full filtered set while search narrows the visible list", () => {
		render(<Harness />);
		openPanel();
		fireEvent.change(screen.getByRole("searchbox", { name: "Search boxes" }), {
			target: { value: "DXB" },
		});
		expect(screen.getByText("DXB-W-AC-#05")).toBeTruthy();
		expect(screen.queryByText("AIN-P-AC-#16")).toBeNull();

		fireEvent.click(screen.getByRole("checkbox", { name: "Deselect all" }));
		expect(screen.getByText("0 of 3 selected")).toBeTruthy();
		expect(
			(screen.getByRole("checkbox", { name: /DXB-W-AC-#05/ }) as HTMLInputElement)
				.checked,
		).toBe(false);
	});

	it("keeps a box exclusion when filters temporarily remove that box and later bring it back", () => {
		const { rerender } = render(<Harness />);
		openPanel();
		fireEvent.click(
			screen.getByRole("checkbox", { name: /AIN-P-NAC-#01/ }),
		);
		expect(screen.getByText("2 of 3 selected")).toBeTruthy();

		rerender(<Harness currentOptions={[options[0], options[2]]} />);
		expect(screen.getByText("2 of 2 selected")).toBeTruthy();

		rerender(<Harness currentOptions={options} />);
		expect(screen.getByText("2 of 3 selected")).toBeTruthy();
		expect(
			(screen.getByRole("checkbox", { name: /AIN-P-NAC-#01/ }) as HTMLInputElement)
				.checked,
		).toBe(false);
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

	it("virtualizes large box lists and advances the render window while scrolling", () => {
		const manyOptions: BoxSelectionOption[] = Array.from({ length: 240 }, (_, i) => ({
			id: `bulk-${i}`,
			label: `BOX-${String(i + 1).padStart(3, "0")}`,
			meta: "Large report",
		}));
		render(<Harness currentOptions={manyOptions} />);
		openPanel();

		expect(screen.getByText("BOX-001")).toBeTruthy();
		expect(screen.queryByText("BOX-200")).toBeNull();
		const list = screen.getByTestId("box-selection-list");
		fireEvent.scroll(list, { target: { scrollTop: 44 * 190 } });

		expect(screen.getByText("BOX-191")).toBeTruthy();
		expect(screen.queryByText("BOX-001")).toBeNull();
		expect(list.getAttribute("aria-busy")).toBe("true");
	});
});
