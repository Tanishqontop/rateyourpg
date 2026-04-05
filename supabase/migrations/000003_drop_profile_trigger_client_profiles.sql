-- Reliable fix for: "Database error creating anonymous user"
-- The trigger on auth.users inserts into public.profiles before any JWT exists, so
-- RLS (auth.uid() = id) blocks the insert on many Supabase projects.
--
-- Strategy: remove the trigger; the React app creates/updates the profile after
-- sign-in when auth.uid() is available (see AuthContext ensureProfile).

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
