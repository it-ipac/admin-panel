/**
 * Central role-based access policy for the admin panel.
 *
 * Single source of truth for "which roles may open which pages". Consumed by:
 *  - `Sidebar` (which nav links to render)
 *  - `useRequirePageAccess` (route guard / redirect)
 *  - `login` (where to land a user after sign-in)
 *
 * Role names mirror the `roles` table: admin, director, executive, sales,
 * client, packer. `executive` is the CEO tier (treated as full access).
 */

/** Every top-level admin-panel page path. */
export const ADMIN_PAGES = [
	"/dashboard",
	"/orders",
	"/clients",
	"/users",
	"/inventory",
	"/inventory-duplicates",
	"/requests",
	"/reports",
	"/settings",
	"/data-import",
] as const;

/** Roles that may access the whole admin panel. */
const FULL_ACCESS_ROLES: ReadonlySet<string> = new Set([
	"admin",
	"director",
	"executive",
	"sales",
]);

/** Pages the given role may access. Empty array = no admin-panel access. */
export function allowedPagesForRole(
	role: string | null | undefined,
): readonly string[] {
	if (!role) return [];
	if (FULL_ACCESS_ROLES.has(role)) return ADMIN_PAGES;
	if (role === "client") return [];
	// packer and any unknown role: no admin-panel access (they use the ops app / portal).
	return [];
}

/** True if `role` may view `pathname` (exact page or a child route of it). */
export function canAccessPage(
	role: string | null | undefined,
	pathname: string,
): boolean {
	return allowedPagesForRole(role).some(
		(page) => pathname === page || pathname.startsWith(`${page}/`),
	);
}

/** True if the role can access at least one admin-panel page. */
export function hasAdminPanelAccess(role: string | null | undefined): boolean {
	return allowedPagesForRole(role).length > 0;
}

/** Where to send the role after login (its first allowed page), or null. */
export function landingPageForRole(
	role: string | null | undefined,
): string | null {
	return allowedPagesForRole(role)[0] ?? null;
}

/** Restricted client-style roles (limited subset of the panel). */
export function isClientRole(role: string | null | undefined): boolean {
	return role === "client";
}
