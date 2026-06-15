import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import { RequestsPage } from "../features/requests/components/RequestsPage";
import { useAuth } from "../hooks/useAuth";
import { useRequirePageAccess } from "../hooks/usePageAccess";

export const Route = createFileRoute("/requests")({
	component: RequestsRoute,
});

function RequestsRoute() {
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();
	useRequirePageAccess();

	useEffect(() => {
		if (!authLoading && !user) {
			navigate({ to: "/login" });
		}
	}, [user, authLoading, navigate]);

	if (authLoading) return null;

	return (
		<div className="flex h-screen bg-neutral-50">
			<Sidebar />
			<RequestsPage />
		</div>
	);
}
