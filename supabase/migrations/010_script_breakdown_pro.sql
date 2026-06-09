-- Script Breakdown Pro — revisions + breakdown runs
-- Run after 009_schema_hardening.sql

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.script_revisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid references public.project_documents(id) on delete set null,
  revision_name text,
  revision_date date,
  script_text text,
  ai_summary jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.script_breakdown_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  script_revision_id uuid references public.script_revisions(id) on delete set null,
  status text not null default 'completed',
  input_type text,
  ai_result jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_script_revisions_project on public.script_revisions(project_id);
create index if not exists idx_script_revisions_date on public.script_revisions(revision_date desc);
create index if not exists idx_script_breakdown_runs_project on public.script_breakdown_runs(project_id);
create index if not exists idx_script_breakdown_runs_revision on public.script_breakdown_runs(script_revision_id);

drop trigger if exists script_revisions_updated_at on public.script_revisions;
create trigger script_revisions_updated_at
  before update on public.script_revisions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.script_revisions enable row level security;
alter table public.script_breakdown_runs enable row level security;

drop policy if exists "script_revisions_select" on public.script_revisions;
create policy "script_revisions_select" on public.script_revisions
  for select using (public.user_can_access_project(project_id));

drop policy if exists "script_revisions_insert" on public.script_revisions;
create policy "script_revisions_insert" on public.script_revisions
  for insert with check (
    public.user_can_edit_project(project_id)
    and created_by = auth.uid()
  );

drop policy if exists "script_revisions_update" on public.script_revisions;
create policy "script_revisions_update" on public.script_revisions
  for update using (public.user_can_edit_project(project_id));

drop policy if exists "script_breakdown_runs_select" on public.script_breakdown_runs;
create policy "script_breakdown_runs_select" on public.script_breakdown_runs
  for select using (public.user_can_access_project(project_id));

drop policy if exists "script_breakdown_runs_insert" on public.script_breakdown_runs;
create policy "script_breakdown_runs_insert" on public.script_breakdown_runs
  for insert with check (
    public.user_can_edit_project(project_id)
    and created_by = auth.uid()
  );
