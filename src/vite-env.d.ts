/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** Legacy name; optional if publishable key is set */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** From Supabase “Connect” modal (sb_publishable_…) */
  readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
  readonly VITE_GOOGLE_MAPS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
