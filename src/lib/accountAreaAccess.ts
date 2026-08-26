import { hasAdminPanelAccess, isClientRole } from "./access";

export type AccountAreaMismatch = "client-in-admin" | "staff-in-portal";

export function getAccountAreaMismatch(
	role: string | null | undefined,
	pathname: string,
): AccountAreaMismatch | null {
	const isPortalRoute =
		pathname === "/portal" || pathname.startsWith("/portal/");

	if (isClientRole(role) && !isPortalRoute) {
		return "client-in-admin";
	}

	if (hasAdminPanelAccess(role) && isPortalRoute) {
		return "staff-in-portal";
	}

	return null;
}
