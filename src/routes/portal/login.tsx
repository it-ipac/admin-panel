import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PortalBrand } from "../../components/PortalBrand";
import { useToastContext } from "../../components/ui/ToastProvider";
import { useAuth } from "../../hooks/useAuth";
import { auth, db } from "../../lib/supabase";

type PortalLoginSearch = {
	returnUrl?: string;
};

export const Route = createFileRoute("/portal/login")({
	validateSearch: (search: Record<string, unknown>): PortalLoginSearch =>
		typeof search.returnUrl === "string" ? { returnUrl: search.returnUrl } : {},
	component: PortalLogin,
	head: () => ({
		meta: [{ title: "Client Portal Login | Client Portal" }],
	}),
});

function PortalLogin() {
	const navigate = useNavigate();
	const { returnUrl: rawReturnUrl } = Route.useSearch();
	const { user, loading } = useAuth();
	const { toast } = useToastContext();

	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const returnUrl = rawReturnUrl?.startsWith("/portal/")
		? rawReturnUrl
		: "/portal/projects";

	const goToReturnUrl = useCallback(() => {
		if (typeof window !== "undefined") {
			window.location.assign(returnUrl);
			return;
		}

		navigate({ to: "/portal/projects" });
	}, [navigate, returnUrl]);

	useEffect(() => {
		if (!loading && user) {
			// Already logged in
			goToReturnUrl();
		}
	}, [user, loading, goToReturnUrl]);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!identifier || !password) return;

		setIsSubmitting(true);
		try {
			const { data, error } = identifier.includes("@")
				? await auth.signIn(identifier, password)
				: await auth.signInWithUsername(identifier, password);
			if (error) throw error;

			if (data.user) {
				const profileData = await db.getProfile(data.user.id);
				if (profileData?.data?.roles?.name === "client") {
					toast({
						title: "Access Granted",
						description: "Welcome to your client portal.",
						variant: "success",
					});
					goToReturnUrl();
				} else {
					// They are standard admin staff trying to log into the portal? That's fine, but maybe redirect them to admin area?
					// Or let them in if they are testing.
					toast({
						title: "Logged In",
						description: "Redirecting...",
						variant: "success",
					});
					goToReturnUrl();
				}
			}
		} catch (error: any) {
			toast({
				title: "Login Failed",
				description: error.message || "Invalid credentials. Please try again.",
				variant: "error",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-neutral-50">
				<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
			</div>
		);
	}

	return (
		<div className="portal-brand auth-bg relative flex min-h-screen items-center justify-center overflow-hidden bg-steel-50 px-4 py-8 sm:px-6">
			{/* Brand Decoration */}
			<div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
			<div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-steel-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />

			<div className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-100 bg-white p-6 shadow-xl sm:p-8">
				<div className="mb-8 text-center sm:mb-10">
					<PortalBrand
						variant="full"
						className="mx-auto mb-5 sm:mb-6"
					/>
					<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary-700">
						Secure client access
					</p>
					<h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
						Client Portal
					</h1>
					<p className="text-neutral-500 text-sm mt-2 font-medium">
						Log in to track your items and packages.
					</p>
				</div>

				<form onSubmit={handleLogin} className="space-y-6">
					<div>
						<label
							htmlFor="login-identifier"
							className="block text-sm font-semibold text-neutral-700 mb-2"
						>
							Email Address or Username
						</label>
						<input
							id="login-identifier"
							type="text"
							required
							value={identifier}
							onChange={(e) => setIdentifier(e.target.value)}
							className="w-full px-4 py-3 placeholder-neutral-400 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow transition-colors bg-neutral-50"
							placeholder="you@company.com or username"
						/>
					</div>
					<div>
						<label
							htmlFor="login-password"
							className="block text-sm font-semibold text-neutral-700 mb-2"
						>
							Password
						</label>
						<input
							id="login-password"
							type="password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-4 py-3 placeholder-neutral-400 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow transition-colors bg-neutral-50"
							placeholder="••••••••"
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-primary-600/20"
					>
						{isSubmitting ? (
							<Loader2 className="w-5 h-5 animate-spin" />
						) : (
							"Sign In"
						)}
					</button>
				</form>
			</div>
		</div>
	);
}
