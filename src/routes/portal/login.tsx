import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	KeyRound,
	Loader2,
	Moon,
	Sun,
	UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PortalBrand } from "../../components/PortalBrand";
import { useToastContext } from "../../components/ui/ToastProvider";
import { useAuth } from "../../hooks/useAuth";
import { useThemePreference } from "../../hooks/useThemePreference";
import { auth, db } from "../../lib/supabase";
import "../../portal-login-polish.css";

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
	const { isDark, toggleTheme } = useThemePreference();

	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const returnUrl = rawReturnUrl?.startsWith("/portal/")
		? rawReturnUrl
		: "/portal/projects";

	const goToReturnUrl = useCallback(() => {
		if (returnUrl === "/portal/projects") {
			navigate({ to: "/portal/projects", replace: true });
			return;
		}

		if (typeof window !== "undefined") {
			window.location.assign(returnUrl);
			return;
		}

		navigate({ to: "/portal/projects", replace: true });
	}, [navigate, returnUrl]);

	useEffect(() => {
		if (loading || !user) return;

		let cancelled = false;

		const verifyExistingSession = async () => {
			const profileData = await db.getProfile(user.id);
			if (cancelled) return;

			const profile = profileData?.data;
			const roleName = profile?.roles?.name;
			const hasPortalAccess =
				roleName === "client" || (roleName === "admin" && !!profile?.client_id);

			if (hasPortalAccess) {
				goToReturnUrl();
				return;
			}

			await auth.signOut();
			if (cancelled) return;

			toast({
				title: "Access Denied",
				description: "This account does not have access to the Client Portal.",
				variant: "error",
			});
		};

		void verifyExistingSession();

		return () => {
			cancelled = true;
		};
	}, [user, loading, goToReturnUrl, toast]);

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
				if (profileData?.error) throw profileData.error;

				const profile = profileData?.data;
				const roleName = profile?.roles?.name;
				const hasPortalAccess =
					roleName === "client" ||
					(roleName === "admin" && !!profile?.client_id);

				if (!hasPortalAccess) {
					await auth.signOut();
					toast({
						title: "Access Denied",
						description: "This account does not have access to the Client Portal.",
						variant: "error",
					});
					return;
				}

				toast({
					title: "Access Granted",
					description: "Welcome to your client portal.",
					variant: "success",
				});
				goToReturnUrl();
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

	const themeToggle = (
		<button
			type="button"
			onClick={toggleTheme}
			className="inline-flex min-h-[2.65rem] items-center gap-2 rounded-xl border border-app-border bg-app-surface/90 py-1 pl-1 pr-3 text-app-text-strong shadow-[0_12px_28px_-20px_rgba(15,23,42,0.42)] backdrop-blur-xl transition-[transform,background-color,border-color,box-shadow] duration-150 hover:-translate-y-px hover:border-primary-300 hover:bg-app-surface hover:shadow-[0_14px_30px_-20px_rgba(0,94,168,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg motion-reduce:transform-none max-[520px]:min-h-[2.4rem] max-[520px]:pr-1.5"
			aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
			title={`Switch to ${isDark ? "light" : "dark"} theme`}
		>
			<span
				className="inline-flex h-[1.9rem] w-[1.9rem] shrink-0 items-center justify-center rounded-lg border border-app-border bg-app-surface-muted text-primary-700"
				aria-hidden="true"
			>
				{isDark ? (
					<Sun className="h-[17px] w-[17px]" />
				) : (
					<Moon className="h-[17px] w-[17px]" />
				)}
			</span>
			<span className="text-xs font-bold tracking-[-0.01em] text-app-text-strong max-[520px]:hidden">
				{isDark ? "Light" : "Dark"}
			</span>
		</button>
	);

	const themeTogglePosition = (
		<div className="fixed right-[clamp(0.65rem,2vw,1.25rem)] top-[clamp(0.65rem,2vw,1.25rem)] z-40">
			{themeToggle}
		</div>
	);

	if (loading) {
		return (
			<div
				className="portal-brand portal-login-page relative flex h-screen items-center justify-center overflow-hidden p-4"
				style={{ height: "100dvh" }}
			>
				{themeTogglePosition}
				<div className="portal-login-loading-card relative z-10 flex w-full max-w-[19rem] flex-col items-center rounded-3xl border p-7 text-center">
					<PortalBrand
						variant="header"
						className="mb-5 justify-center"
						markClassName="!h-10 !w-10"
					/>
					<div className="portal-login-loader flex h-11 w-11 items-center justify-center rounded-2xl border">
						<Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
					</div>
					<p className="mt-4 text-sm font-semibold text-app-text-strong">
						Opening Client Portal
					</p>
					<p className="mt-1.5 text-xs leading-5 text-app-text-muted">
						Loading your workspace.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className="portal-brand portal-login-page auth-bg relative flex h-screen items-center justify-center overflow-x-hidden overflow-y-auto px-[clamp(0.75rem,3vw,1.5rem)] py-[clamp(0.75rem,2.5vh,2rem)]"
			style={{ height: "100dvh" }}
		>
			{themeTogglePosition}
			<div
				className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/35 to-transparent"
				aria-hidden="true"
			/>

			<div className="portal-login-card relative z-10 isolate my-auto w-full max-w-[28rem] overflow-hidden rounded-[1.75rem] border after:pointer-events-none after:absolute after:inset-x-[12%] after:-bottom-28 after:-z-10 after:h-40 after:rounded-full after:bg-primary-500/10 after:blur-[34px]">
				<div
					className="portal-login-card-accent pointer-events-none absolute inset-x-10 top-0 z-20 h-px"
					aria-hidden="true"
				/>

				<div className="portal-login-hero relative px-[clamp(1.25rem,3vw,1.8rem)] pb-[clamp(1.25rem,2.6vh,1.7rem)] pt-[clamp(1.35rem,3vh,1.95rem)] text-center">
					<PortalBrand
						variant="full"
						showTagline
						className="mx-auto mb-[clamp(1rem,2vh,1.35rem)] justify-center"
						markClassName="!w-[6.5rem] min-[390px]:!w-[7rem] sm:!w-[7.4rem]"
					/>

					<div className="portal-login-title-block mx-auto max-w-[23rem]">
						<h1
							className="portal-login-title text-[clamp(2rem,4vh,2.45rem)] font-black tracking-[-0.055em]"
							aria-label="Client Portal"
						>
							<span className="portal-login-title-client">Client</span>
							<span className="portal-login-title-portal">Portal</span>
						</h1>
						<div className="portal-login-title-rule" aria-hidden="true">
							<span className="portal-login-title-rule-core" />
						</div>
						<p className="portal-login-subtitle mx-auto mt-2.5 max-w-[21rem] text-[clamp(0.84rem,1.75vh,0.96rem)] font-medium leading-6">
							Track packages, review records, and open package details in one place.
						</p>
					</div>
				</div>

				<div className="portal-login-form-shell relative px-[clamp(1.25rem,3vw,1.8rem)] pb-[clamp(1.3rem,2.6vh,1.75rem)] pt-[clamp(1.2rem,2.5vh,1.6rem)]">
					<div className="mb-[clamp(1rem,2vh,1.25rem)]">
						<p className="portal-login-form-heading text-[15px] font-bold tracking-[-0.018em]">
							Welcome back
						</p>
						<p className="portal-login-form-copy mt-1 text-xs leading-5">
							Sign in with your client account email or username.
						</p>
					</div>

					<form
						onSubmit={handleLogin}
						className="flex flex-col gap-[clamp(0.9rem,1.8vh,1.15rem)]"
					>
						<div className="portal-login-field">
							<label
								htmlFor="login-identifier"
								className="mb-2 block text-[13px] font-semibold tracking-[-0.01em]"
							>
								Email Address or Username
							</label>
							<div className="portal-login-input-wrap">
								<UserRound className="portal-login-input-icon" aria-hidden="true" />
								<input
									id="login-identifier"
									type="text"
									required
									value={identifier}
									onChange={(e) => setIdentifier(e.target.value)}
									className="portal-login-input min-h-12 w-full rounded-xl border py-3 pl-11 pr-4 text-[15px] transition-[border-color,box-shadow,background-color] focus:outline-none"
									placeholder="you@company.com or username"
									autoComplete="username"
								/>
							</div>
						</div>

						<div className="portal-login-field">
							<label
								htmlFor="login-password"
								className="mb-2 block text-[13px] font-semibold tracking-[-0.01em]"
							>
								Password
							</label>
							<div className="portal-login-input-wrap">
								<KeyRound className="portal-login-input-icon" aria-hidden="true" />
								<input
									id="login-password"
									type="password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="portal-login-input min-h-12 w-full rounded-xl border py-3 pl-11 pr-4 text-[15px] transition-[border-color,box-shadow,background-color] focus:outline-none"
									placeholder="••••••••"
									autoComplete="current-password"
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							className="relative mt-1 flex min-h-12 w-full items-center justify-center rounded-xl border border-primary-600 bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-[0_16px_30px_-18px_rgba(0,129,197,0.58)] transition-[transform,background-color,box-shadow] hover:-translate-y-px hover:bg-primary-700 hover:shadow-[0_18px_34px_-18px_rgba(0,129,197,0.7)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-app-surface active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 motion-reduce:transform-none"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-5 w-5 animate-spin text-white" aria-hidden="true" />
									<span className="text-white">Signing in</span>
								</>
							) : (
								<>
									<span className="text-white">Sign In</span>
									<ArrowRight
										className="absolute right-4 h-4 w-4 text-white"
										aria-hidden="true"
									/>
								</>
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
