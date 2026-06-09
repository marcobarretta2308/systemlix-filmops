-- Script Breakdown Pro — chunked processing + quality checks
-- Run after 010_script_breakdown_pro.sql

create table if not exists public.script_breakdown_chunks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.script_breakdown_runs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chunk_index integer not null,
  scene_range text,
  input_text text,
  ai_result jsonb,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, chunk_index)
);

create table if not exists public.script_breakdown_quality_checks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.script_breakdown_runs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  quality_status text not null default 'needs_review',
  issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_script_breakdown_chunks_run on public.script_breakdown_chunks(run_id);
create index if not exists idx_script_breakdown_chunks_project on public.script_breakdown_chunks(project_id);
create index if not exists idx_script_breakdown_quality_run on public.script_breakdown_quality_checks(run_id);

drop trigger if exists script_breakdown_chunks_updated_at on public.script_breakdown_chunks;
create trigger script_breakdown_chunks_updated_at
  before update on public.script_breakdown_chunks
  for each row execute function public.set_updated_at();

alter table public.script_breakdown_chunks enable row level security;
alter table public.script_breakdown_quality_checks enable row level security;

drop policy if exists "script_breakdown_chunks_select" on public.script_breakdown_chunks;
create policy "script_breakdown_chunks_select" on public.script_breakdown_chunks
  for select using (public.user_can_access_project(project_id));

drop policy if exists "script_breakdown_chunks_insert" on public.script_breakdown_chunks;
create policy "script_breakdown_chunks_insert" on public.script_breakdown_chunks
  for insert with check (public.user_can_edit_project(project_id));

drop policy if exists "script_breakdown_chunks_update" on public.script_breakdown_chunks;
create policy "script_breakdown_chunks_update" on public.script_breakdown_chunks
  for update using (public.user_can_edit_project(project_id));

drop policy if exists "script_breakdown_quality_select" on public.script_breakdown_quality_checks;
create policy "script_breakdown_quality_select" on public.script_breakdown_quality_checks
  for select using (public.user_can_access_project(project_id));

drop policy if exists "script_breakdown_quality_insert" on public.script_breakdown_quality_checks;
create policy "script_breakdown_quality_insert" on public.script_breakdown_quality_checks
  for insert with check (public.user_can_edit_project(project_id));
