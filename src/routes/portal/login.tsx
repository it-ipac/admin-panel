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
			<div
				className="flex h-screen items-center justify-center bg-neutral-50"
				style={{ height: "100dvh" }}
			>
				<Loader2 className="h-8 w-8 animate-spin text-primary-600" />
			</div>
		);
	}

	return (
		<div
			className="portal-brand auth-bg relative flex h-screen items-center justify-center overflow-x-hidden overflow-y-auto bg-steel-50 px-[clamp(0.75rem,3vw,1.5rem)] py-[clamp(0.75rem,2.5vh,2rem)]"
			style={{ height: "100dvh" }}
		>
			{/* Decorative blobs are clipped inside their own layer so they never
			    create page-level horizontal or vertical scroll overflow. */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
				<div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary-100 opacity-50 mix-blend-multiply blur-3xl filter animate-blob" />
				<div className="absolute right-[-10%] bottom-[-20%] h-[600px] w-[600px] rounded-full bg-steel-200 opacity-50 mix-blend-multiply blur-3xl filter animate-blob animation-delay-2000" />
			</div>

			<div className="relative z-10 my-auto w-full max-w-md rounded-2xl border border-neutral-100 bg-white p-[clamp(1rem,2.6vh,2rem)] shadow-xl">
				<div className="text-center">
					<PortalBrand
						variant="full"
						showTagline
						className="mx-auto mb-[clamp(0.75rem,1.8vh,1.25rem)] justify-center"
						markClassName="h-14 w-14 sm:h-16 sm:w-16"
					/>
					<h1 className="bg-gradient-to-r from-primary-700 via-primary-500 to-sky-400 bg-clip-text text-[clamp(1.5rem,3.2vh,2rem)] font-extrabold tracking-tight text-transparent dark:from-primary-300 dark:via-sky-300 dark:to-cyan-200">
						Client Portal
					</h1>
					<p className="mt-[clamp(0.25rem,0.8vh,0.5rem)] text-[clamp(0.8rem,1.8vh,0.95rem)] font-medium text-neutral-500">
						Login to track your packages.
					</p>
				</div>

				<form
					onSubmit={handleLogin}
					className="mt-[clamp(1rem,2.5vh,1.75rem)] flex flex-col gap-[clamp(0.9rem,2vh,1.35rem)]"
				>
					<div>
						<label
							htmlFor="login-identifier"
							className="mb-1.5 block text-sm font-semibold text-neutral-700"
						>
							Email Address or Username
						</label>
						<input
							id="login-identifier"
							type="text"
							required
							value={identifier}
							onChange={(e) => setIdentifier(e.target.value)}
							className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-[clamp(0.65rem,1.5vh,0.85rem)] text-base placeholder-neutral-400 transition-colors transition-shadow focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
							placeholder="you@company.com or username"
							autoComplete="username"
						/>
					</div>
					<div>
						<label
							htmlFor="login-password"
							className="mb-1.5 block text-sm font-semibold text-neutral-700"
						>
							Password
						</label>
						<input
							id="login-password"
							type="password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-[clamp(0.65rem,1.5vh,0.85rem)] text-base placeholder-neutral-400 transition-colors transition-shadow focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
							placeholder="••••••••"
							autoComplete="current-password"
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						className="flex w-full items-center justify-center rounded-xl border border-transparent bg-primary-600 px-4 py-[clamp(0.7rem,1.6vh,0.9rem)] text-sm font-bold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
					>
						{isSubmitting ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							"Sign In"
						)}
					</button>
				</form>
			</div>
		</div>
	);
}
