// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	applySelectAll,
	BOX_LINE1_FIELDS,
	type BoxLine1Field,
	getSelectAllState,
} from "../lineOptions";
import { DEFAULT_PKG_DETAILS_SETTINGS } from "../settings-defaults";
import { SelectAllCheckbox } from "./SelectAllCheckbox";

afterEach(cleanup);

const box = () =>
	screen.getByRole("checkbox", { name: "Select all" }) as HTMLInputElement;

describe("SelectAllCheckbox", () => {
	it("is checked when everything is selected", () => {
		render(<SelectAllCheckbox state="all" onChange={() => {}} />);
		expect(box().checked).toBe(true);
		expect(box().indeterminate).toBe(false);
	});

	it("is unchecked when nothing is selected", () => {
		render(<SelectAllCheckbox state="none" onChange={() => {}} />);
		expect(box().checked).toBe(false);
		expect(box().indeterminate).toBe(false);
	});

	it("is indeterminate for a partial selection", () => {
		render(<SelectAllCheckbox state="some" onChange={() => {}} />);
		expect(box().indeterminate).toBe(true);
		expect(box().checked).toBe(false);
	});

	it("selects everything when clicked while indeterminate", () => {
		const onChange = vi.fn();
		render(<SelectAllCheckbox state="some" onChange={onChange} />);
		fireEvent.click(box());
		expect(onChange).toHaveBeenCalledWith(true);
	});

	it("clears everything when clicked while fully checked", () => {
		const onChange = vi.fn();
		render(<SelectAllCheckbox state="all" onChange={onChange} />);
		fireEvent.click(box());
		expect(onChange).toHaveBeenCalledWith(false);
	});

	it("selects everything when clicked while empty", () => {
		const onChange = vi.fn();
		render(<SelectAllCheckbox state="none" onChange={onChange} />);
		fireEvent.click(box());
		expect(onChange).toHaveBeenCalledWith(true);
	});

	it("is a real checkbox reachable by keyboard with an accessible name", () => {
		render(<SelectAllCheckbox state="none" onChange={() => {}} />);
		const el = box();
		expect(el.tagName).toBe("INPUT");
		expect(el.type).toBe("checkbox");
		expect(el.disabled).toBe(false);
	});
});

/** The control driving real settings, the way AppearancePanel wires it. */
describe("SelectAllCheckbox wired to the Box Card line-1 settings", () => {
	function Harness() {
		const [settings, setSettings] = useState(DEFAULT_PKG_DETAILS_SETTINGS);
		return (
			<>
				<SelectAllCheckbox
					state={getSelectAllState(settings)}
					onChange={(checked) => setSettings((p) => applySelectAll(p, checked))}
				/>
				<output data-testid="state">{getSelectAllState(settings)}</output>
				{BOX_LINE1_FIELDS.map((f: BoxLine1Field) => (
					<span key={f} data-testid={f}>
						{String(settings[f])}
					</span>
				))}
			</>
		);
	}

	it("turns every field on, then off, through the real reducer", () => {
		render(<Harness />);

		// defaults are mixed -> indeterminate
		expect(screen.getByTestId("state").textContent).toBe("some");
		expect(box().indeterminate).toBe(true);

		fireEvent.click(box());
		expect(screen.getByTestId("state").textContent).toBe("all");
		for (const f of BOX_LINE1_FIELDS) {
			expect(screen.getByTestId(f).textContent).toBe("true");
		}

		fireEvent.click(box());
		expect(screen.getByTestId("state").textContent).toBe("none");
		for (const f of BOX_LINE1_FIELDS) {
			expect(screen.getByTestId(f).textContent).toBe("false");
		}
	});
});
