import { hasAdminPanelAccess, isClientRole } from "./access";

export type AccountAreaMismatch = "client-in-admin" | "staff-in-portal";

export function getAccountAreaMismatch(
	role: string | null | undefined,
	pathname: string,
	clientId?: string | null,
): AccountAreaMismatch | null {
	const isPortalRoute =
		pathname === "/portal" || pathname.startsWith("/portal/");
	const hasAssignedAdminPortalAccess = role === "admin" && Boolean(clientId);

	if (isClientRole(role) && !isPortalRoute) {
		return "client-in-admin";
	}

	if (
		hasAdminPanelAccess(role) &&
		isPortalRoute &&
		!hasAssignedAdminPortalAccess
	) {
		return "staff-in-portal";
	}

	return null;
}
