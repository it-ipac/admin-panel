import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useToastContext } from "../../components/ui/ToastProvider";
import { useAuth } from "../../hooks/useAuth";
import { auth, db } from "../../lib/supabase";

export const Route = createFileRoute("/portal/login")({
	component: PortalLogin,
});

function PortalLogin() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();
	const { toast } = useToastContext();

	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const searchParams = new window.URLSearchParams(window.location.search);
	const rawReturnUrl = searchParams.get("returnUrl");
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
						description: "Welcome to your Client Portal.",
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
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	return (
		<div className="auth-bg min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
			{/* Brand Decoration */}
			<div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
			<div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />

			<div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 relative z-10">
				<div className="text-center mb-10">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg mb-6 shadow-blue-600/20">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="w-8 h-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							role="img"
							aria-labelledby="brand-logo-title"
						>
							<title id="brand-logo-title">IPAC Logo</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
							/>
						</svg>
					</div>
					<h1 className="text-2xl font-bold text-gray-900 tracking-tight">
						IPAC Client Portal
					</h1>
					<p className="text-gray-500 text-sm mt-2 font-medium">
						Log in to track your items and packages.
					</p>
				</div>

				<form onSubmit={handleLogin} className="space-y-6">
					<div>
						<label
							htmlFor="login-identifier"
							className="block text-sm font-semibold text-gray-700 mb-2"
						>
							Email Address or Username
						</label>
						<input
							id="login-identifier"
							type="text"
							required
							value={identifier}
							onChange={(e) => setIdentifier(e.target.value)}
							className="w-full px-4 py-3 placeholder-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow transition-colors bg-gray-50"
							placeholder="you@company.com or username"
						/>
					</div>
					<div>
						<label
							htmlFor="login-password"
							className="block text-sm font-semibold text-gray-700 mb-2"
						>
							Password
						</label>
						<input
							id="login-password"
							type="password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-4 py-3 placeholder-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow transition-colors bg-gray-50"
							placeholder="••••••••"
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
					>
						{isSubmitting ? (
							<Loader2 className="w-5 h-5 animate-spin" />
						) : (
							"Sign In"
						)}
					</button>
				</form>

				<div className="mt-8 text-center border-t border-gray-100 pt-6">
					<p className="text-xs text-gray-400 font-medium">
						Powered by IPAC Global Packaging
					</p>
				</div>
			</div>
		</div>
	);
}
