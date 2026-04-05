import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "./AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** True when Vite env has Supabase URL + key (no Provider required). */
export function useOptionalSupabase(): boolean {
  return isSupabaseConfigured();
}
