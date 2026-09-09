// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
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
		expect(trigger.getAttribute("aria-controls")).toBe(
			"report-box-selection-dialog",
		);
		expect(
			screen.queryByRole("dialog", { name: /Boxes to include/i }),
		).toBeNull();

		openPanel();
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		expect(
			screen.getByRole("dialog", { name: /Boxes to include/i }),
		).toBeTruthy();
		expect(screen.getByText("3 of 3 selected")).toBeTruthy();
	});

	it("focuses search on open, closes on Escape, and returns focus to the trigger", async () => {
		render(<Harness />);
		const trigger = screen.getByRole("button", { name: /Boxes/ });
		openPanel();
		const searchbox = screen.getByRole("searchbox", { name: "Search boxes" });

		await waitFor(() => expect(document.activeElement).toBe(searchbox));
		fireEvent.keyDown(document, { key: "Escape" });
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		await waitFor(() => expect(document.activeElement).toBe(trigger));
		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: /Boxes to include/i }),
			).toBeNull(),
		);
	});

	it("closes through the animated lifecycle when clicking outside", async () => {
		render(<Harness />);
		const trigger = screen.getByRole("button", { name: /Boxes/ });
		openPanel();
		expect(
			screen.getByRole("dialog", { name: /Boxes to include/i }),
		).toBeTruthy();

		fireEvent.mouseDown(document.body);
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: /Boxes to include/i }),
			).toBeNull(),
		);
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

	it("shows a spinner while bulk deselect/select is being applied", async () => {
		render(<Harness />);
		openPanel();
		fireEvent.click(screen.getByRole("checkbox", { name: "Deselect all" }));

		expect(
			screen.getByRole("status", { name: "Updating box selection" }),
		).toBeTruthy();
		expect(screen.queryByRole("checkbox", { name: "Deselect all" })).toBeNull();

		await waitFor(() => {
			expect(screen.getByText("0 of 3 selected")).toBeTruthy();
			expect(screen.getByRole("checkbox", { name: "Select all" })).toBeTruthy();
		});

		fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
		expect(
			screen.getByRole("status", { name: "Updating box selection" }),
		).toBeTruthy();

		await waitFor(() => {
			expect(screen.getByText("3 of 3 selected")).toBeTruthy();
			expect(screen.getByRole("checkbox", { name: "Deselect all" })).toBeTruthy();
		});
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

	it("master select-all still applies to the full filtered set while search narrows the visible list", async () => {
		render(<Harness />);
		openPanel();
		fireEvent.change(screen.getByRole("searchbox", { name: "Search boxes" }), {
			target: { value: "DXB" },
		});
		expect(screen.getByText("DXB-W-AC-#05")).toBeTruthy();
		expect(screen.queryByText("AIN-P-AC-#16")).toBeNull();

		fireEvent.click(screen.getByRole("checkbox", { name: "Deselect all" }));
		expect(
			screen.getByRole("status", { name: "Updating box selection" }),
		).toBeTruthy();

		await waitFor(() => {
			expect(screen.getByText("0 of 3 selected")).toBeTruthy();
			expect(
				(screen.getByRole("checkbox", { name: /DXB-W-AC-#05/ }) as HTMLInputElement)
					.checked,
			).toBe(false);
		});
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

	it("virtualizes large box lists without showing the old Smooth list label", () => {
		const manyOptions: BoxSelectionOption[] = Array.from({ length: 240 }, (_, i) => ({
			id: `bulk-${i}`,
			label: `BOX-${String(i + 1).padStart(3, "0")}`,
			meta: "Large report",
		}));
		render(<Harness currentOptions={manyOptions} />);
		openPanel();

		expect(screen.getByText("BOX-001")).toBeTruthy();
		expect(screen.queryByText("BOX-200")).toBeNull();
		expect(screen.queryByText(/Smooth list/)).toBeNull();
		const list = screen.getByTestId("box-selection-list");
		fireEvent.scroll(list, { target: { scrollTop: 44 * 190 } });

		expect(screen.getByText("BOX-191")).toBeTruthy();
		expect(screen.queryByText("BOX-001")).toBeNull();
		expect(list.getAttribute("aria-busy")).toBe("true");
	});
});
