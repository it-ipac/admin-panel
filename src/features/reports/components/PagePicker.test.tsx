// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PagePicker } from "./PagePicker";

afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof PagePicker>[0]> = {}) => {
	const onNavigate = vi.fn();
	const props = { currentPage: 1, totalPages: 81, onNavigate, ...over };
	const view = render(<PagePicker {...props} />);
	const input = screen.getByRole("textbox", {
		name: "Go to page",
	}) as HTMLInputElement;
	return { onNavigate, input, view, props };
};

const type = (input: HTMLInputElement, value: string) =>
	fireEvent.change(input, { target: { value } });
const enter = (input: HTMLInputElement) =>
	fireEvent.keyDown(input, { key: "Enter" });

describe("PagePicker", () => {
	it("shows the 1-based current page and the total", () => {
		const { input } = setup({ currentPage: 1, totalPages: 81 });
		expect(input.value).toBe("2");
		expect(screen.getByText("of 81")).toBeTruthy();
	});

	it("navigates directly on Enter", () => {
		const { input, onNavigate } = setup();
		type(input, "42");
		enter(input);
		expect(onNavigate).toHaveBeenCalledWith(41); // 0-based
	});

	it("navigates to the first and last page", () => {
		const { input, onNavigate } = setup({ currentPage: 40 });
		type(input, "1");
		enter(input);
		expect(onNavigate).toHaveBeenCalledWith(0);
		type(input, "81");
		enter(input);
		expect(onNavigate).toHaveBeenCalledWith(80);
	});

	it("resolves out-of-range values to the nearest valid page", () => {
		const { input, onNavigate } = setup({ currentPage: 40 });
		type(input, "0");
		enter(input);
		expect(onNavigate).toHaveBeenLastCalledWith(0);
		type(input, "-5");
		enter(input);
		expect(onNavigate).toHaveBeenLastCalledWith(0);
		type(input, "9999");
		enter(input);
		expect(onNavigate).toHaveBeenLastCalledWith(80);
	});

	it("restores the current page for empty and invalid input without navigating", () => {
		for (const bad of ["", "   ", "abc", "2.5", "1e3"]) {
			const { input, onNavigate } = setup({ currentPage: 4 });
			type(input, bad);
			enter(input);
			expect(onNavigate).not.toHaveBeenCalled();
			expect(input.value).toBe("5");
			cleanup();
		}
	});

	it("cancels the edit on Escape", () => {
		const { input, onNavigate } = setup({ currentPage: 4 });
		type(input, "77");
		fireEvent.keyDown(input, { key: "Escape" });
		expect(onNavigate).not.toHaveBeenCalled();
		expect(input.value).toBe("5");
	});

	it("commits a valid value on blur and reverts an invalid one", () => {
		const a = setup({ currentPage: 4 });
		type(a.input, "10");
		fireEvent.blur(a.input);
		expect(a.onNavigate).toHaveBeenCalledWith(9);
		cleanup();

		const b = setup({ currentPage: 4 });
		type(b.input, "nope");
		fireEvent.blur(b.input);
		expect(b.onNavigate).not.toHaveBeenCalled();
		expect(b.input.value).toBe("5");
	});

	it("does not navigate when the typed page is already current", () => {
		const { input, onNavigate } = setup({ currentPage: 4 });
		type(input, "5");
		enter(input);
		expect(onNavigate).not.toHaveBeenCalled();
	});

	it("drives Previous and Next", () => {
		const { onNavigate } = setup({ currentPage: 4 });
		fireEvent.click(screen.getByRole("button", { name: "Next page" }));
		expect(onNavigate).toHaveBeenLastCalledWith(5);
		fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
		expect(onNavigate).toHaveBeenLastCalledWith(3);
	});

	it("disables Previous on the first page and Next on the last", () => {
		setup({ currentPage: 0, totalPages: 81 });
		expect(
			(
				screen.getByRole("button", {
					name: "Previous page",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(
			(screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement)
				.disabled,
		).toBe(false);
		cleanup();

		setup({ currentPage: 80, totalPages: 81 });
		expect(
			(screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("updates the input when navigation happens elsewhere", () => {
		const { input, view, props } = setup({ currentPage: 1 });
		expect(input.value).toBe("2");
		view.rerender(<PagePicker {...props} currentPage={7} />);
		expect(
			(screen.getByRole("textbox", { name: "Go to page" }) as HTMLInputElement)
				.value,
		).toBe("8");
	});

	it("abandons an in-progress edit when the page changes underneath", () => {
		const { input, view, props } = setup({ currentPage: 1 });
		type(input, "55");
		view.rerender(<PagePicker {...props} currentPage={3} />);
		expect(
			(screen.getByRole("textbox", { name: "Go to page" }) as HTMLInputElement)
				.value,
		).toBe("4");
	});

	it("reflects a shrunken totalPages once the parent clamps", () => {
		const { view, props } = setup({ currentPage: 80, totalPages: 81 });
		view.rerender(<PagePicker {...props} currentPage={2} totalPages={3} />);
		expect(
			(screen.getByRole("textbox", { name: "Go to page" }) as HTMLInputElement)
				.value,
		).toBe("3");
		expect(screen.getByText("of 3")).toBeTruthy();
		expect(
			(screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("stays inert with no pages", () => {
		const { input } = setup({ currentPage: 0, totalPages: 0 });
		expect(input.disabled).toBe(true);
		expect(
			(screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});
});
