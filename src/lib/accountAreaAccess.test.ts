import { describe, expect, it } from "vitest";
import { getAccountAreaMismatch } from "./accountAreaAccess";

describe("getAccountAreaMismatch", () => {
	it("flags client accounts outside the package portal", () => {
		expect(getAccountAreaMismatch("client", "/dashboard")).toBe(
			"client-in-admin",
		);
		expect(getAccountAreaMismatch("client", "/login")).toBe("client-in-admin");
	});

	it("allows client accounts inside the package portal", () => {
		expect(getAccountAreaMismatch("client", "/portal")).toBeNull();
		expect(getAccountAreaMismatch("client", "/portal/projects")).toBeNull();
	});

	it.each(["admin", "director", "executive", "sales"])(
		"flags %s accounts inside the package portal",
		(role) => {
			expect(getAccountAreaMismatch(role, "/portal/projects")).toBe(
				"staff-in-portal",
			);
		},
	);

	it("allows staff accounts in the admin panel", () => {
		expect(getAccountAreaMismatch("admin", "/dashboard")).toBeNull();
	});

	it("does not classify unrelated roles as a cross-area mismatch", () => {
		expect(getAccountAreaMismatch("packer", "/portal/projects")).toBeNull();
		expect(getAccountAreaMismatch(null, "/dashboard")).toBeNull();
	});
});
