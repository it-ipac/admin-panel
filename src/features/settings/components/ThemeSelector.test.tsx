// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThemePreference } from "../../../lib/theme";
import { ThemeSelector } from "./ThemeSelector";

afterEach(cleanup);

const radio = (name: "Light" | "Dark" | "System") =>
	screen.getByRole("radio", { name: new RegExp(name) }) as HTMLInputElement;
const card = (v: ThemePreference) =>
	screen.getByTestId(`theme-option-${v}`).querySelector("span") as HTMLElement;
const swatch = (v: ThemePreference) =>
	card(v).querySelector("span") as HTMLElement;

describe("ThemeSelector — labels, values and previews", () => {
	it("offers exactly three options in a radiogroup", () => {
		render(<ThemeSelector value="light" onChange={() => {}} />);
		expect(screen.getAllByRole("radio")).toHaveLength(3);
		expect(screen.getByRole("group", { name: /Theme/ })).toBeTruthy();
	});

	it("Light: label 'Light', value 'light', preview is a LIGHT surface", () => {
		render(<ThemeSelector value="system" onChange={() => {}} />);
		expect(radio("Light").value).toBe("light");
		expect(swatch("light").className).toContain("bg-preview-light-bg");
		expect(swatch("light").className).not.toContain("bg-preview-dark-bg");
	});

	it("Dark: label 'Dark', value 'dark', preview is a DARK surface", () => {
		render(<ThemeSelector value="system" onChange={() => {}} />);
		expect(radio("Dark").value).toBe("dark");
		expect(swatch("dark").className).toContain("bg-preview-dark-bg");
		expect(swatch("dark").className).not.toContain("bg-preview-light-bg");
	});

	it("System: value 'system', preview shows BOTH a light and a dark half", () => {
		render(<ThemeSelector value="light" onChange={() => {}} />);
		expect(radio("System").value).toBe("system");
		const halves = [...swatch("system").querySelectorAll(":scope > span")];
		expect(halves).toHaveLength(2);
		expect(halves[0].className).toContain("bg-preview-light-bg");
		expect(halves[1].className).toContain("bg-preview-dark-bg");
	});

	// regression guard: the previews used bg-app-surface / bg-neutral-900, which
	// are theme-aware, so Light rendered dark and Dark rendered light.
	it("no preview uses a theme-aware surface token", () => {
		render(<ThemeSelector value="light" onChange={() => {}} />);
		for (const v of ["light", "dark", "system"] as ThemePreference[]) {
			const html = card(v).innerHTML;
			expect(html).not.toContain("bg-app-surface");
			expect(html).not.toContain("bg-neutral-900");
			expect(html).not.toContain("bg-white");
		}
	});
});

describe("ThemeSelector — selection", () => {
	it("marks exactly the current value as checked", () => {
		render(<ThemeSelector value="dark" onChange={() => {}} />);
		expect(radio("Dark").checked).toBe(true);
		expect(radio("Light").checked).toBe(false);
		expect(radio("System").checked).toBe(false);
	});

	it("selected styling follows the value it was given", () => {
		const { rerender } = render(
			<ThemeSelector value="light" onChange={() => {}} />,
		);
		expect(card("light").className).toContain("border-primary-600");
		expect(card("dark").className).not.toContain("border-primary-600");
		rerender(<ThemeSelector value="dark" onChange={() => {}} />);
		expect(card("dark").className).toContain("border-primary-600");
		expect(card("light").className).not.toContain("border-primary-600");
	});

	it("does not signal selection with colour alone", () => {
		render(<ThemeSelector value="light" onChange={() => {}} />);
		// a check glyph accompanies the selected card
		expect(card("light").querySelectorAll("svg").length).toBeGreaterThan(1);
		expect(card("dark").querySelectorAll("svg").length).toBe(1);
	});

	it("reports the clicked value, and Light never reports dark", () => {
		const onChange = vi.fn();
		render(<ThemeSelector value="system" onChange={onChange} />);
		fireEvent.click(radio("Light"));
		expect(onChange).toHaveBeenCalledWith("light");
		expect(onChange).not.toHaveBeenCalledWith("dark");
	});

	it("Dark never reports light", () => {
		const onChange = vi.fn();
		render(<ThemeSelector value="system" onChange={onChange} />);
		fireEvent.click(radio("Dark"));
		expect(onChange).toHaveBeenCalledWith("dark");
		expect(onChange).not.toHaveBeenCalledWith("light");
	});
});

describe("ThemeSelector — keyboard", () => {
	it("radios share one group name so arrow keys move within it", () => {
		render(<ThemeSelector value="light" onChange={() => {}} />);
		const names = screen
			.getAllByRole("radio")
			.map((r) => (r as HTMLInputElement).name);
		expect(new Set(names).size).toBe(1);
		expect(names[0]).toBe("theme-preference");
	});

	it("is focusable and carries a visible focus ring class", () => {
		render(<ThemeSelector value="light" onChange={() => {}} />);
		radio("Light").focus();
		expect(document.activeElement).toBe(radio("Light"));
		expect(card("light").className).toContain("peer-focus-visible:ring-2");
	});
});

describe("ThemeSelector — driven by real state", () => {
	function Harness() {
		const [value, setValue] = useState<ThemePreference>("system");
		return (
			<>
				<ThemeSelector value={value} onChange={setValue} />
				<output data-testid="current">{value}</output>
			</>
		);
	}

	it("selecting each option updates the checked card and the value", () => {
		render(<Harness />);
		for (const [label, expected] of [
			["Light", "light"],
			["Dark", "dark"],
			["System", "system"],
		] as const) {
			fireEvent.click(radio(label));
			expect(screen.getByTestId("current").textContent).toBe(expected);
			expect(radio(label).checked).toBe(true);
			expect(
				screen
					.getAllByRole("radio")
					.filter((r) => (r as HTMLInputElement).checked),
			).toHaveLength(1);
		}
	});
});
