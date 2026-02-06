import { redirect } from "@tanstack/react-router";
import { auth } from "../lib/supabase";

export async function requireAuth() {
	const {
		data: { session },
	} = await auth.getSession();

	if (!session?.user) {
		throw redirect({
			to: "/login",
			search: {
				redirect:
					typeof window !== "undefined" ? window.location.pathname : undefined,
			},
		});
	}

	return session.user;
}

export async function requireAdmin() {
	const user = await requireAuth();

	// You should fetch the user's role here
	// This is a placeholder - implement actual role checking
	return user;
}
