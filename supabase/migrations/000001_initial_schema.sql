-- RateYourPG — initial schema (run in Supabase SQL editor or via CLI)

-- Profiles mirror auth users + guest flag
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_guest boolean not null default false,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Profiles are inserted from the app after sign-in (JWT present → RLS passes).
-- Do not add a trigger on auth.users that inserts into profiles — it breaks anonymous sign-in.

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text not null,
  created_at timestamptz not null default now()
);

alter table public.locations enable row level security;
create policy "locations_read_all" on public.locations for select using (true);
create policy "locations_insert_authed" on public.locations for insert with check (auth.role() = 'authenticated');

create table if not exists public.pgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
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
create policy "pgs_read_all" on public.pgs for select using (true);
create policy "pgs_insert_authed" on public.pgs for insert with check (auth.role() = 'authenticated');

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
create policy "reviews_read_all" on public.reviews for select using (true);
create policy "reviews_insert_own" on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews_update_own" on public.reviews for update using (auth.uid() = user_id);

create table if not exists public.review_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type = 'upvote'),
  unique (review_id, user_id)
);

alter table public.review_votes enable row level security;
create policy "votes_read_all" on public.review_votes for select using (true);
create policy "votes_insert_own" on public.review_votes for insert with check (auth.uid() = user_id);
create policy "votes_delete_own" on public.review_votes for delete using (auth.uid() = user_id);

-- Storage: create bucket "pg-media" in dashboard, then:
-- insert into storage.buckets (id, name, public) values ('pg-media', 'pg-media', true);
-- Policies for storage.objects (authenticated upload to own folder) — configure in Supabase UI
