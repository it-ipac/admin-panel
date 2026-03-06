import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import { RequestsPage } from "../features/requests/components/RequestsPage";
import { useAuth } from "../hooks/useAuth";

export const Route = createFileRoute("/requests")({
	component: RequestsRoute,
});

function RequestsRoute() {
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();

	useEffect(() => {
		if (!authLoading && !user) {
			navigate({ to: "/login" });
		}
	}, [user, authLoading, navigate]);

	if (authLoading) return null;

	return (
		<div className="flex h-screen bg-gray-50">
			<Sidebar />
			<RequestsPage />
		</div>
	);
}
