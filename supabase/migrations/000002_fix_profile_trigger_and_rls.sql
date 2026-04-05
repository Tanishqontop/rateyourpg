-- Optional / legacy. Prefer 000003_drop_profile_trigger_client_profiles.sql instead.
-- Fix: "Database error creating anonymous user"
-- Cause: INSERT into public.profiles from handle_new_user runs with no JWT, so
-- RLS policy "profiles_insert_own" (auth.uid() = id) fails because auth.uid() is NULL.
-- Also harden is_guest parsing (invalid ::boolean casts can throw).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_guest boolean := false;
  v_app text;
  v_user text;
begin
  v_app := new.raw_app_meta_data->>'is_guest';
  v_user := new.raw_user_meta_data->>'is_guest';
  if v_app in ('true', 't', '1', 'yes') or v_user in ('true', 't', '1', 'yes') then
    v_is_guest := true;
  elsif v_app in ('false', 'f', '0', 'no') or v_user in ('false', 'f', '0', 'no') then
    v_is_guest := false;
  end if;

  -- No JWT in this context; bypass RLS for this single trusted insert
  set local row_security = off;

  insert into public.profiles (id, email, is_guest)
  values (new.id, new.email, v_is_guest)
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    is_guest = excluded.is_guest;

  return new;
end;
$$;

-- Ensure Supabase can execute the trigger (idempotent)
grant usage on schema public to postgres, anon, authenticated, service_role;
