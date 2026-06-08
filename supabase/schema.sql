-- Systemlix FilmOps — Database schema
-- Run in Supabase SQL Editor (after enabling uuid-ossp / pgcrypto)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  global_role text default 'user',
  auth_status text default 'active',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Companies & membership
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  logo_url text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  status text default 'active',
  access_start_date date,
  access_end_date date,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz default now(),
  unique(company_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Workspaces & projects
-- ---------------------------------------------------------------------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  production_type text,
  description text,
  status text default 'active',
  start_date date,
  end_date date,
  archived_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  department text,
  permission_profile text,
  can_view_breakdown boolean default false,
  can_edit_breakdown boolean default false,
  can_view_scenes boolean default false,
  can_edit_scenes boolean default false,
  can_view_cast_crew boolean default false,
  can_edit_cast_crew boolean default false,
  can_view_locations boolean default false,
  can_edit_locations boolean default false,
  can_view_shooting_days boolean default false,
  can_edit_shooting_days boolean default false,
  can_view_call_sheets boolean default false,
  can_edit_call_sheets boolean default false,
  can_view_set_assistant boolean default false,
  can_manage_access boolean default false,
  access_status text default 'active',
  access_start_date date,
  access_end_date date,
  created_at timestamptz default now(),
  unique(project_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Project data
-- ---------------------------------------------------------------------------
create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text,
  file_url text,
  raw_text text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  script_id uuid references public.scripts(id) on delete set null,
  scene_number text,
  int_ext text,
  day_night text,
  location text,
  short_description text,
  characters text[] default '{}',
  props text[] default '{}',
  costumes text[] default '{}',
  vfx text[] default '{}',
  stunts text[] default '{}',
  vehicles text[] default '{}',
  animals text[] default '{}',
  special_requirements text[] default '{}',
  complexity text,
  production_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.cast_crew (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  full_name text not null,
  role text,
  department text,
  phone text,
  email text,
  call_time text,
  permission_level text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  address text,
  maps_link text,
  parking_notes text,
  access_notes text,
  production_notes text,
  created_at timestamptz default now()
);

create table if not exists public.shooting_days (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  day_number text,
  date date,
  location_id uuid references public.locations(id) on delete set null,
  selected_scene_ids uuid[] default '{}',
  general_crew_call text,
  cast_call text,
  makeup_call text,
  first_shot text,
  lunch text,
  estimated_wrap text,
  parking text,
  transport_notes text,
  emergency_contact text,
  production_notes text,
  created_at timestamptz default now()
);

create table if not exists public.call_sheets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  shooting_day_id uuid references public.shooting_days(id) on delete cascade,
  version integer default 1,
  status text default 'draft',
  pdf_url text,
  generated_by uuid references public.profiles(id),
  document_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.assistant_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_context text,
  created_at timestamptz default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.assistant_threads(id) on delete cascade,
  sender text,
  message text,
  created_at timestamptz default now()
);

create table if not exists public.project_archive_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  action text,
  performed_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_company_members_user on public.company_members(user_id);
create index if not exists idx_workspaces_company on public.workspaces(company_id);
create index if not exists idx_projects_company on public.projects(company_id);
create index if not exists idx_projects_workspace on public.projects(workspace_id);
create index if not exists idx_project_members_user on public.project_members(user_id);
create index if not exists idx_scenes_project on public.scenes(project_id);
create index if not exists idx_cast_crew_project on public.cast_crew(project_id);
create index if not exists idx_locations_project on public.locations(project_id);
create index if not exists idx_shooting_days_project on public.shooting_days(project_id);
create index if not exists idx_call_sheets_project on public.call_sheets(project_id);

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, global_role, auth_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'global_role', 'user'),
    'active'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update projects.updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists scenes_updated_at on public.scenes;
create trigger scenes_updated_at
  before update on public.scenes
  for each row execute function public.set_updated_at();
