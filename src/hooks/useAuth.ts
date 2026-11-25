import type { Session, User } from "@supabase/supabase-js";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	useRef,
} from "react";
import { auth, db, supabase } from "../lib/supabase";

interface Profile {
	id: string;
	full_name: string | null;
	username: string | null;
	role_id: string | null;
	client_id: string | null;
	roles: {
		id: string;
		name: string | null;
	} | null;
	status: string | null;
}

interface AuthContextValue {
	user: User | null;
	profile: Profile | null;
	session: Session | null;
	loading: boolean;
	profileError?: string | null;
	signIn: (username: string, password: string) => Promise<{ error: any }>;
	signOut: () => Promise<void>;
	isAdmin: boolean;
	refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}

export function useAuthState() {
	const [session, setSession] = useState<Session | null>(null);
	const [initialized, setInitialized] = useState(false);
	const [identityVersion, setIdentityVersion] = useState(0);
	const [signingIn, setSigningIn] = useState(false);
	const [profileResult, setProfileResult] = useState<{
		userId: string;
		profile: Profile | null;
		error: string | null;
	} | null>(null);
	const currentUserId = useRef<string | null>(null);
	const profileRequest = useRef(0);
	const user = session?.user ?? null;
	const userId = user?.id ?? null;
	const currentProfile = profileResult?.userId === userId ? profileResult : null;
	const profile = currentProfile?.profile ?? null;
	const profileError = currentProfile?.error ?? null;
	const loading = !initialized || signingIn || (userId !== null && !currentProfile);

	const loadProfile = useCallback(async (id: string) => {
		const request = ++profileRequest.current;
		try {
			const { data, error } = await db.getProfile(id);
			if (error || !data) throw error ?? new Error("Profile not found");
			if (currentUserId.current !== id || request !== profileRequest.current) return;
			setProfileResult({ userId: id, profile: data as Profile, error: null });
		} catch (error) {
			if (currentUserId.current !== id || request !== profileRequest.current) return;
			console.error("Error loading profile:", error);
			setProfileResult({
				userId: id,
				profile: null,
				error: "Unable to load your account profile. Please retry.",
			});
		}
	}, []);

	const refreshProfile = useCallback(async () => {
		if (userId && currentUserId.current === userId) {
			await loadProfile(userId);
		}
	}, [userId, loadProfile]);

	useEffect(() => {
		let mounted = true;
		// INITIAL_SESSION already restores the persisted session. Do not race it
		// against an independent getSession() request.
		const { data: { subscription } } = supabase.auth.onAuthStateChange(
			(event, nextSession) => {
				if (!mounted) return;
				const nextUserId = nextSession?.user.id ?? null;
				if (currentUserId.current !== nextUserId) {
					currentUserId.current = nextUserId;
					profileRequest.current++;
					setProfileResult(null);
					setIdentityVersion((version) => version + 1);
				}
				console.log("Auth state changed:", event);
				setSession(nextSession);
				setInitialized(true);
			},
		);
		return () => {
			mounted = false;
			profileRequest.current++;
			subscription.unsubscribe();
		};
	}, []);

	// Load the profile outside the Supabase auth callback (which can hold an
	// internal auth lock). Token refreshes for the same user do not reset it.
	// biome-ignore lint/correctness/useExhaustiveDependencies: identityVersion invalidates the profile even when sign-out and sign-in for the same user are batched in a single render.
	useEffect(() => {
		if (!userId) return;
		void loadProfile(userId);
		return () => { profileRequest.current++; };
	}, [userId, identityVersion, loadProfile]);

	const signIn = useCallback(async (username: string, password: string) => {
		setSigningIn(true);
		try {
			const result = username.includes("@")
				? await auth.signIn(username, password)
				: await auth.signInWithUsername(username, password);
			return { error: result.error };
		} catch (error: any) {
			return { error: { message: error.message || "Authentication failed" } };
		} finally {
			setSigningIn(false);
		}
	}, []);

	const signOut = useCallback(async () => {
		const { error } = await auth.signOut();
		if (error) {
			console.error("Sign out failed:", error);
			throw error;
		}
		// SIGNED_OUT is the source of truth; let the SDK clear its own storage.
	}, []);

	const isAdmin =
		profile?.roles?.name === "admin" ||
		profile?.roles?.name === "director" ||
		profile?.roles?.name === "executive" ||
		profile?.roles?.name === "sales";

	return {
		user,
		profile,
		session,
		loading,
		profileError,
		signIn,
		signOut,
		isAdmin,
		refreshProfile,
	};
}
