import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export const Route = createFileRoute("/")({
	component: IndexPage,
});

function IndexPage() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading) {
			if (user) {
				navigate({ to: "/dashboard" });
			} else {
				navigate({ to: "/login" });
			}
		}
	}, [user, loading, navigate]);

	return (
		<div
			suppressHydrationWarning
			className="min-h-screen flex items-center justify-center bg-neutral-50"
		>
			<div
				suppressHydrationWarning
				className="flex flex-col items-center gap-4"
			>
				<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
				<p className="text-neutral-600">Loading...</p>
			</div>
		</div>
	);
}
