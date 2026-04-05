import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { ProfileRow } from "@/types/database";

type AuthState = {
  user: User | null;
  profile: ProfileRow | null;
  loading: boolean;
  error: string | null;
};

export type AuthContextValue = AuthState & {
  refreshProfile: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInGuest: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(
  sb: SupabaseClient,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileRow;
}

/** Create profile row after JWT exists so RLS (auth.uid() = id) passes. */
async function ensureProfile(
  sb: SupabaseClient,
  user: User
): Promise<ProfileRow | null> {
  const existing = await fetchProfile(sb, user.id);
  if (existing) return existing;
  const { error } = await sb.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      is_guest: user.is_anonymous === true,
    },
    { onConflict: "id" }
  );
  if (error) {
    console.error("ensureProfile:", error.message);
    return null;
  }
  return fetchProfile(sb, user.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) {
      setProfile(null);
      return;
    }
    const p = await ensureProfile(sb, user);
    setProfile(p);
  }, [user]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }

    let mounted = true;
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    void (async () => {
      const p = await ensureProfile(sb, user);
      setProfile(p);
    })();
  }, [user]);

  const signInEmail = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase is not configured." };
    const { error: e } = await sb.auth.signInWithPassword({ email, password });
    return { error: e?.message ?? null };
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase is not configured." };
    const { error: e } = await sb.auth.signUp({
      email,
      password,
      options: { data: { is_guest: false } },
    });
    return { error: e?.message ?? null };
  }, []);

  const signInGuest = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase is not configured." };
    const { error: anonError } = await sb.auth.signInAnonymously();
    if (anonError) {
      const hint =
        /anonymous|disabled|not enabled/i.test(anonError.message) &&
        !/database error/i.test(anonError.message)
          ? " Enable Anonymous sign-ins under Authentication → Sign In / Providers."
          : /database error/i.test(anonError.message)
            ? " Run SQL in supabase/migrations/000003_drop_profile_trigger_client_profiles.sql (removes the auth trigger; profiles are created in the app after login)."
            : "";
      return { error: anonError.message + hint };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    setProfile(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      error,
      refreshProfile,
      signInEmail,
      signUpEmail,
      signInGuest,
      signOut,
      clearError,
    }),
    [
      user,
      profile,
      loading,
      error,
      refreshProfile,
      signInEmail,
      signUpEmail,
      signInGuest,
      signOut,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
