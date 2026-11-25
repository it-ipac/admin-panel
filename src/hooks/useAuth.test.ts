// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthState } from "./useAuth";

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;
const mocks = vi.hoisted(() => ({
	listener: null as AuthCallback | null,
	getSession: vi.fn(),
	getProfile: vi.fn(),
	signOut: vi.fn(),
	unsubscribe: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
	supabase: { auth: {
		getSession: mocks.getSession,
		onAuthStateChange: (callback: AuthCallback) => {
			mocks.listener = callback;
			return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
		},
	} },
	db: { getProfile: mocks.getProfile },
	auth: { signOut: mocks.signOut },
}));

const session = (id: string) => ({ user: { id } }) as Session;
const profile = (id: string) => ({ id, roles: { name: "admin" } });
const emit = (event: AuthChangeEvent, value: Session | null) => {
	act(() => { mocks.listener?.(event, value); });
};

describe("auth session lifecycle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.listener = null;
		mocks.getProfile.mockReset();
		mocks.getProfile.mockImplementation(async (id: string) => ({
			data: profile(id), error: null,
		}));
	});

	it("waits for the profile and uses INITIAL_SESSION as the only initializer", async () => {
		let resolve!: (value: { data: ReturnType<typeof profile>; error: null }) => void;
		mocks.getProfile.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
		const { result } = renderHook(() => useAuthState());
		expect(result.current.loading).toBe(true);
		emit("INITIAL_SESSION", session("a"));
		expect(result.current.user?.id).toBe("a");
		expect(result.current.loading).toBe(true);
		expect(mocks.getSession).not.toHaveBeenCalled();
		await act(async () => { resolve({ data: profile("a"), error: null }); });
		expect(result.current.loading).toBe(false);
		expect(result.current.isAdmin).toBe(true);
	});

	it("does not reset the profile during a token refresh", async () => {
		const { result } = renderHook(() => useAuthState());
		emit("INITIAL_SESSION", session("a"));
		await waitFor(() => expect(result.current.loading).toBe(false));
		emit("TOKEN_REFRESHED", session("a"));
		expect(result.current.isAdmin).toBe(true);
		expect(result.current.loading).toBe(false);
		expect(mocks.getProfile).toHaveBeenCalledTimes(1);
	});

	it("ignores a late profile response after sign out", async () => {
		let resolve!: (value: { data: ReturnType<typeof profile>; error: null }) => void;
		mocks.getProfile.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
		const { result } = renderHook(() => useAuthState());
		emit("INITIAL_SESSION", session("a"));
		emit("SIGNED_OUT", null);
		await act(async () => { resolve({ data: profile("a"), error: null }); });
		expect(result.current.user).toBeNull();
		expect(result.current.profile).toBeNull();
		expect(result.current.isAdmin).toBe(false);
		expect(result.current.loading).toBe(false);
	});

	it("keeps the session on a profile failure and allows a retry", async () => {
		mocks.getProfile.mockResolvedValueOnce({ data: null, error: new Error("offline") });
		const { result } = renderHook(() => useAuthState());
		emit("INITIAL_SESSION", session("a"));
		await waitFor(() => expect(result.current.profileError).toBeTruthy());
		expect(result.current.user?.id).toBe("a");
		expect(result.current.isAdmin).toBe(false);
		await act(async () => { await result.current.refreshProfile(); });
		expect(result.current.profileError).toBeNull();
		expect(result.current.isAdmin).toBe(true);
	});

	it("reloads the profile when the same account signs out and in in one render", async () => {
		const { result } = renderHook(() => useAuthState());
		emit("INITIAL_SESSION", session("a"));
		await waitFor(() => expect(result.current.loading).toBe(false));
		act(() => {
			mocks.listener?.("SIGNED_OUT", null);
			mocks.listener?.("SIGNED_IN", session("a"));
		});
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.profile?.id).toBe("a");
		expect(mocks.getProfile).toHaveBeenCalledTimes(2);
	});

	it("does not allow an old account profile to overwrite the new one", async () => {
		let resolve!: (value: { data: ReturnType<typeof profile>; error: null }) => void;
		mocks.getProfile.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
		const { result } = renderHook(() => useAuthState());
		emit("INITIAL_SESSION", session("a"));
		emit("SIGNED_IN", session("b"));
		await waitFor(() => expect(result.current.profile?.id).toBe("b"));
		await act(async () => { resolve({ data: profile("a"), error: null }); });
		expect(result.current.profile?.id).toBe("b");
	});
});
