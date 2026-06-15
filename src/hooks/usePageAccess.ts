import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { canAccessPage, landingPageForRole } from "../lib/access";
import { useAuth } from "./useAuth";

/**
 * Route guard for admin-panel pages. Call at the top of a protected route
 * component. Redirects:
 *  - unauthenticated users -> /login
 *  - authenticated users whose role can't view this path -> their landing page
 *    (or /login if the role has no admin-panel access at all).
 *
 * Returns the auth state so callers can reuse `user` / `profile` / `loading`.
 */
export function useRequirePageAccess() {
	const navigate = useNavigate();
	const location = useLocation();
	const { user, profile, loading } = useAuth();

	useEffect(() => {
		if (loading) return;

		if (!user) {
			navigate({ to: "/login" });
			return;
		}

		// Wait until the profile (and therefore the role) has loaded before
		// deciding access, to avoid a wrong redirect on first paint.
		if (!profile) return;

		const role = profile.roles?.name ?? null;
		if (!canAccessPage(role, location.pathname)) {
			const landing = landingPageForRole(role);
			navigate({ to: landing ?? "/login" });
		}
	}, [user, profile, loading, location.pathname, navigate]);

	return { user, profile, loading };
}
