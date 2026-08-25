import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
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
				className="portal-brand flex h-screen items-center justify-center bg-app-bg"
				style={{ height: "100dvh" }}
			>
				<Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-300" />
			</div>
		);
	}

	return (
		<div
			className="portal-brand auth-bg relative flex h-screen items-center justify-center overflow-x-hidden overflow-y-auto bg-app-bg px-[clamp(0.75rem,3vw,1.5rem)] py-[clamp(0.75rem,2.5vh,2rem)]"
			style={{ height: "100dvh" }}
		>
			{/* Keep the background quiet and architectural rather than decorative. */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
				<div
					className="absolute inset-0"
					style={{
						background:
							"radial-gradient(circle at 50% 12%, rgba(0,129,197,0.13), transparent 34%), radial-gradient(circle at 88% 82%, rgba(49,123,198,0.08), transparent 28%)",
					}}
				/>
				<div className="absolute left-1/2 top-0 h-px w-[min(82vw,46rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
			</div>

			<div className="relative z-10 my-auto w-full max-w-[27rem] overflow-hidden rounded-[1.75rem] border border-app-border bg-app-surface shadow-[0_28px_80px_-42px_rgba(2,8,23,0.9)]">
				<div
					className="pointer-events-none absolute inset-x-0 top-0 h-28"
					style={{
						background:
							"linear-gradient(180deg, rgba(0,129,197,0.075), rgba(0,129,197,0))",
					}}
					aria-hidden="true"
				/>
				<div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary-400/70 to-transparent" aria-hidden="true" />

				<div className="relative p-[clamp(1.15rem,2.35vh,1.7rem)]">
					<div className="text-center">
						<PortalBrand
							variant="full"
							showTagline
							className="mx-auto mb-[clamp(0.85rem,1.7vh,1.15rem)] justify-center"
							markClassName="!w-[6.75rem] min-[390px]:!w-[7.25rem] sm:!w-[7.75rem]"
						/>

						<div className="mx-auto mb-3 h-px w-12 bg-gradient-to-r from-transparent via-primary-500/70 to-transparent" aria-hidden="true" />
						<h1
							className="text-[clamp(1.55rem,3vh,1.9rem)] font-extrabold tracking-[-0.035em]"
							style={{
								backgroundImage: "linear-gradient(90deg, #b9e8f7 0%, #65b9e5 48%, #2d7bc7 100%)",
								WebkitBackgroundClip: "text",
								backgroundClip: "text",
								WebkitTextFillColor: "transparent",
							}}
						>
							Client Portal
						</h1>
						<p className="mt-1.5 text-[clamp(0.82rem,1.7vh,0.95rem)] font-medium text-app-text-muted">
							Login to track your packages.
						</p>
					</div>

					<form
						onSubmit={handleLogin}
						className="mt-[clamp(1.15rem,2.4vh,1.65rem)] flex flex-col gap-[clamp(0.9rem,1.8vh,1.15rem)]"
					>
						<div>
							<label
								htmlFor="login-identifier"
								className="mb-2 block text-[13px] font-semibold tracking-[-0.01em] text-app-text-strong"
							>
								Email Address or Username
							</label>
							<input
								id="login-identifier"
								type="text"
								required
								value={identifier}
								onChange={(e) => setIdentifier(e.target.value)}
								className="min-h-12 w-full rounded-xl border border-app-border bg-app-surface-muted px-4 py-3 text-[15px] shadow-inner shadow-black/5 placeholder:text-app-text-muted transition-[border-color,box-shadow,background-color] focus:border-primary-500 focus:bg-app-surface focus:outline-none focus:ring-2 focus:ring-primary-500/30"
								placeholder="you@company.com or username"
								autoComplete="username"
							/>
						</div>

						<div>
							<label
								htmlFor="login-password"
								className="mb-2 block text-[13px] font-semibold tracking-[-0.01em] text-app-text-strong"
							>
								Password
							</label>
							<input
								id="login-password"
								type="password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="min-h-12 w-full rounded-xl border border-app-border bg-app-surface-muted px-4 py-3 text-[15px] shadow-inner shadow-black/5 placeholder:text-app-text-muted transition-[border-color,box-shadow,background-color] focus:border-primary-500 focus:bg-app-surface focus:outline-none focus:ring-2 focus:ring-primary-500/30"
								placeholder="••••••••"
								autoComplete="current-password"
							/>
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							className="relative mt-1 flex min-h-12 w-full items-center justify-center rounded-xl border border-primary-500/25 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_30px_-16px_rgba(0,94,168,0.95)] transition-[transform,filter,box-shadow] hover:-translate-y-px hover:brightness-110 hover:shadow-[0_16px_34px_-18px_rgba(0,94,168,1)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-app-surface active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 motion-reduce:transform-none"
						>
							{isSubmitting ? (
								<Loader2 className="h-5 w-5 animate-spin text-white" />
							) : (
								<>
									<span className="text-white">Sign In</span>
									<ArrowRight className="absolute right-4 h-4 w-4 text-white/80" aria-hidden="true" />
								</>
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
