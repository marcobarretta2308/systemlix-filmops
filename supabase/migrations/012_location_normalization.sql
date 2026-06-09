-- Location normalization — canonical names, status, scene links
-- Run after 011_script_breakdown_chunks.sql

alter table public.locations
  add column if not exists canonical_name text,
  add column if not exists sub_location text,
  add column if not exists location_type text,
  add column if not exists status text default 'scouting',
  add column if not exists permit_status text,
  add column if not exists notes text,
  add column if not exists source text,
  add column if not exists scene_count integer,
  add column if not exists metadata jsonb default '{}'::jsonb;

update public.locations
set canonical_name = name
where canonical_name is null and name is not null;

create table if not exists public.scene_locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  sub_location text,
  created_at timestamptz not null default now(),
  unique (scene_id, location_id, sub_location)
);

create index if not exists idx_scene_locations_project on public.scene_locations(project_id);
create index if not exists idx_scene_locations_location on public.scene_locations(location_id);
create index if not exists idx_scene_locations_scene on public.scene_locations(scene_id);
create index if not exists idx_locations_canonical on public.locations(project_id, canonical_name);
create index if not exists idx_locations_status on public.locations(status);

alter table public.scene_locations enable row level security;

drop policy if exists "scene_locations_select" on public.scene_locations;
create policy "scene_locations_select" on public.scene_locations
  for select using (public.user_can_access_project(project_id));

drop policy if exists "scene_locations_write" on public.scene_locations;
create policy "scene_locations_write" on public.scene_locations
  for all using (public.user_can_edit_project(project_id));
