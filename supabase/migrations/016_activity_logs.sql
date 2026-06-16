-- Activity Log — operational traceability for project actions

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null references public.companies(id) on delete set null,
  workspace_id uuid null references public.workspaces(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  user_email text null,
  user_name text null,
  department text null,
  role text null,
  action text not null,
  area text not null,
  entity_type text null,
  entity_id uuid null,
  entity_label text null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_project_created
  on public.activity_logs (project_id, created_at desc);

create index if not exists idx_activity_logs_user_created
  on public.activity_logs (user_id, created_at desc);

create index if not exists idx_activity_logs_department_created
  on public.activity_logs (department, created_at desc);

create index if not exists idx_activity_logs_action_created
  on public.activity_logs (action, created_at desc);

create index if not exists idx_activity_logs_area_created
  on public.activity_logs (area, created_at desc);

alter table public.activity_logs enable row level security;

drop policy if exists "activity_logs_insert" on public.activity_logs;
create policy "activity_logs_insert"
  on public.activity_logs
  for insert
  with check (
    public.user_can_access_project(project_id)
    and (user_id is null or user_id = auth.uid())
  );

drop policy if exists "activity_logs_select_manage" on public.activity_logs;
create policy "activity_logs_select_manage"
  on public.activity_logs
  for select
  using (public.user_can_edit_project(project_id));

drop policy if exists "activity_logs_delete_platform_owner" on public.activity_logs;
create policy "activity_logs_delete_platform_owner"
  on public.activity_logs
  for delete
  using (public.is_platform_owner());

grant select, insert on public.activity_logs to authenticated;

notify pgrst, 'reload schema';
