// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
	// vitest runs without `globals: true`, so testing-library's auto-cleanup
	// afterEach is never registered; unmount explicitly.
	afterEach(cleanup);

	it("renders a real button with an explicit type", () => {
		render(<Button>Save</Button>);
		const btn = screen.getByRole("button", { name: "Save" });
		expect(btn.tagName).toBe("BUTTON");
		expect(btn.getAttribute("type")).toBe("button");
	});

	it("marks a loading button busy and disabled", () => {
		render(<Button loading>Save</Button>);
		const btn = screen.getByRole("button", { name: /Save/ });
		expect(btn.hasAttribute("disabled")).toBe(true);
		expect(btn.getAttribute("aria-busy")).toBe("true");
	});

	it("keeps the accessible name on an icon-only button", () => {
		render(
			<Button size="icon" aria-label="Add package">
				<svg aria-hidden="true" />
			</Button>,
		);
		expect(screen.getByRole("button", { name: "Add package" })).toBeTruthy();
	});

	// Regression: Slot calls React.Children.only, so the asChild branch must pass
	// exactly one child. Rendering the spinner slot alongside it threw
	// "React.Children.only expected to receive a single React element child."
	it("renders asChild as the child element without throwing", () => {
		expect(() =>
			render(
				<Button asChild variant="outline">
					<a href="/orders">View all orders</a>
				</Button>,
			),
		).not.toThrow();
		const link = screen.getByRole("link", { name: "View all orders" });
		expect(link.tagName).toBe("A");
		// the variant classes are merged onto the child
		expect(link.className).toContain("border-neutral-300");
	});

	it("does not forward button-only attributes to an asChild anchor", () => {
		render(
			<Button asChild>
				<a href="/orders">Orders</a>
			</Button>,
		);
		const link = screen.getByRole("link", { name: "Orders" });
		expect(link.hasAttribute("disabled")).toBe(false);
		expect(link.hasAttribute("type")).toBe(false);
	});
});
