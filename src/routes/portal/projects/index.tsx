import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, PackageX } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { db } from "../../../lib/supabase";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/portal/projects/")({
	component: PortalProjects,
});

function PortalProjects() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();

	// Redirect to portal login if unauthenticated
	useEffect(() => {
		if (!loading && !user) {
			navigate({ to: "/portal/login", search: { returnUrl: window.location.pathname } });
		}
	}, [user, loading, navigate]);

	// Fetch current user's profile to extract their client_id
	const { data: profile, isLoading: profileLoading } = useQuery({
		queryKey: ["currentUserProfile", user?.id],
		queryFn: async () => {
			if (!user) return null;
			const { data, error } = await db.getProfile(user.id);
			if (error) throw error;
			return data;
		},
		enabled: !!user,
	});

	// If no client_id is attached to the profile, they shouldn't be here (or they have no data)
	const clientId = profile?.client_id;

	if (loading || profileLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	if (!clientId) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
				<PackageX className="w-16 h-16 text-gray-300 mb-4" />
				<h2 className="text-xl font-bold text-gray-900 mb-2">No Client Assigned</h2>
				<p className="text-gray-500 max-w-md">Your user profile is not linked to any client company. Please contact support.</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Portal Header */}
			<header className="bg-white border-b border-gray-200 sticky top-0 z-30">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
								<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
								</svg>
							</div>
							<h1 className="text-lg font-bold text-gray-900">IPAC Portal</h1>
						</div>
						<div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-700">{profile?.full_name}</span>
                            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
								onClick={async () => {
									await db.signOut();
									navigate({to: "/portal/login"});
								}}
							>
								Log out
							</button>
                        </div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<h2 className="text-2xl font-bold text-gray-900">Your Inventory Projects</h2>
					<p className="text-gray-500 mt-1">Browse all items packed across your projects.</p>
				</div>

				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
					This dashboard will automatically populate with aggregated inventory analytics and bulk item lists.
                    <br/><br/>
                    Status: Awaiting Database Sync (Phase 3 Backend Data Bridge)
				</div>
			</main>
		</div>
	);
}
