-- =============================================================================
-- RateYourPG — full Supabase setup (paste entire file in SQL Editor, run once)
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS where needed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Anonymous login fix — remove profile trigger (app creates profiles)
-- -----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2) profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_guest boolean not null default false,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 3) locations (slug required for /location/[slug] routes + type + image_url)
-- -----------------------------------------------------------------------------
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  city text not null,
  type text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.locations add column if not exists slug text;
alter table public.locations add column if not exists type text;
alter table public.locations add column if not exists image_url text;

-- Backfill slug for existing rows (URL-safe + id suffix → unique)
update public.locations
set slug = trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
     || '-' || left(replace(id::text, '-', ''), 8)
where slug is null or trim(slug) = '';

-- Not-null + one unique index for ON CONFLICT (slug)
do $$
begin
  alter table public.locations alter column slug set not null;
exception
  when others then
    raise notice 'locations.slug NOT NULL: %', sqlerrm;
end $$;

create unique index if not exists locations_slug_uq on public.locations (slug);

alter table public.locations enable row level security;

drop policy if exists "locations_read_all" on public.locations;
drop policy if exists "locations_insert_authed" on public.locations;

create policy "locations_read_all"
  on public.locations for select using (true);

create policy "locations_insert_authed"
  on public.locations for insert
  with check (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 4) pgs
-- -----------------------------------------------------------------------------
create table if not exists public.pgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  location_id uuid not null references public.locations (id) on delete restrict,
  area text not null,
  price_range text,
  gender_type text not null check (gender_type in ('boys', 'girls', 'coliving')),
  room_types jsonb not null default '[]'::jsonb,
  amenities jsonb not null default '[]'::jsonb,
  curfew text,
  visitor_allowed boolean,
  deposit numeric,
  description text,
  created_by_user boolean not null default false,
  is_verified boolean not null default false,
  cover_image_url text,
  created_at timestamptz not null default now()
);

create index if not exists pgs_location_idx on public.pgs (location_id);
create index if not exists pgs_slug_idx on public.pgs (slug);

alter table public.pgs enable row level security;

drop policy if exists "pgs_read_all" on public.pgs;
drop policy if exists "pgs_insert_authed" on public.pgs;

create policy "pgs_read_all" on public.pgs for select using (true);

create policy "pgs_insert_authed"
  on public.pgs for insert
  with check (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 5) reviews
-- -----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pg_id uuid not null references public.pgs (id) on delete cascade,
  rating numeric not null check (rating >= 1 and rating <= 5),
  food_rating numeric not null check (food_rating >= 1 and food_rating <= 5),
  cleanliness_rating numeric not null check (cleanliness_rating >= 1 and cleanliness_rating <= 5),
  safety_rating numeric not null check (safety_rating >= 1 and safety_rating <= 5),
  value_rating numeric not null check (value_rating >= 1 and value_rating <= 5),
  owner_rating numeric not null check (owner_rating >= 1 and owner_rating <= 5),
  review_text text not null default '',
  tags jsonb not null default '[]'::jsonb,
  guest_name text,
  is_anonymous boolean not null default false,
  is_guest boolean not null default false,
  media_urls jsonb not null default '[]'::jsonb,
  ai_pros jsonb,
  ai_cons jsonb,
  ai_summary text,
  reported_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists reviews_pg_idx on public.reviews (pg_id);
create index if not exists reviews_user_idx on public.reviews (user_id);

alter table public.reviews enable row level security;

drop policy if exists "reviews_read_all" on public.reviews;
drop policy if exists "reviews_insert_own" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;

create policy "reviews_read_all" on public.reviews for select using (true);

create policy "reviews_insert_own"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "reviews_update_own"
  on public.reviews for update
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6) review_votes
-- -----------------------------------------------------------------------------
create table if not exists public.review_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type = 'upvote'),
  unique (review_id, user_id)
);

alter table public.review_votes enable row level security;

drop policy if exists "votes_read_all" on public.review_votes;
drop policy if exists "votes_insert_own" on public.review_votes;
drop policy if exists "votes_delete_own" on public.review_votes;

create policy "votes_read_all" on public.review_votes for select using (true);

create policy "votes_insert_own"
  on public.review_votes for insert
  with check (auth.uid() = user_id);

create policy "votes_delete_own"
  on public.review_votes for delete
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 7) review_reports (moderation — replace “unrestricted” with RLS)
-- -----------------------------------------------------------------------------
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists review_reports_review_idx on public.review_reports (review_id);

alter table public.review_reports enable row level security;

drop policy if exists "review_reports_insert_own" on public.review_reports;
drop policy if exists "review_reports_select_own" on public.review_reports;

-- Reporters can insert their own report rows
create policy "review_reports_insert_own"
  on public.review_reports for insert
  with check (auth.uid() = reporter_id);

-- Reporters can read only what they filed (tighten later for admin dashboard)
create policy "review_reports_select_own"
  on public.review_reports for select
  using (auth.uid() = reporter_id);

-- -----------------------------------------------------------------------------
-- 8) Storage bucket pg-media (images / uploads)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pg-media', 'pg-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "pg_media_public_read" on storage.objects;
drop policy if exists "pg_media_authenticated_upload" on storage.objects;
drop policy if exists "pg_media_authenticated_update" on storage.objects;
drop policy if exists "pg_media_authenticated_delete" on storage.objects;

create policy "pg_media_public_read"
  on storage.objects for select
  using (bucket_id = 'pg-media');

create policy "pg_media_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pg-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pg_media_authenticated_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'pg-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pg_media_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'pg-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 9) Seed: Bangalore colleges & areas (skip rows that already exist by slug)
-- -----------------------------------------------------------------------------
insert into public.locations (name, slug, city, type, image_url)
values
  ('Christ University', 'christ-university-bangalore', 'Bangalore', 'college', null),
  ('PES University', 'pes-university-bangalore', 'Bangalore', 'college', null),
  ('BMS College of Engineering', 'bms-college-bangalore', 'Bangalore', 'college', null),
  ('RV College of Engineering', 'rv-college-bangalore', 'Bangalore', 'college', null),
  ('NMIT', 'nmit-bangalore', 'Bangalore', 'college', null),
  ('Koramangala', 'koramangala-bangalore', 'Bangalore', 'area', null),
  ('Indiranagar', 'indiranagar-bangalore', 'Bangalore', 'area', null),
  ('Whitefield', 'whitefield-bangalore', 'Bangalore', 'area', null),
  ('Electronic City', 'electronic-city-bangalore', 'Bangalore', 'area', null),
  ('HSR Layout', 'hsr-layout-bangalore', 'Bangalore', 'area', null),
  ('Acharya Institute of Technology', 'acharya-institute-bangalore', 'Bangalore', 'college', null)
on conflict (slug) do nothing;

-- =============================================================================
-- Done. Optional: add sample PGs after you have location ids from Table Editor.
-- Example (replace LOCATION_UUID):
-- insert into public.pgs (name, slug, location_id, area, gender_type, room_types, amenities, created_by_user, is_verified)
-- values (
--   'Demo PG',
--   'demo-pg-koramangala-abc12345',
--   'LOCATION_UUID'::uuid,
--   'Koramangala 5th Block',
--   'coliving',
--   '["Single","Double"]'::jsonb,
--   '["wifi","food"]'::jsonb,
--   false,
--   true
-- );
-- =============================================================================
