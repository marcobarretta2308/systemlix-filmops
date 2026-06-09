-- Production Reports — end-of-day wrap reports
-- Run after 007_call_sheet_distribution.sql

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.production_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  shooting_day_id uuid references public.shooting_days(id) on delete set null,
  call_sheet_id uuid references public.call_sheets(id) on delete set null,
  report_date date not null,
  title text,
  status text not null default 'draft',
  actual_crew_call_time text,
  actual_first_shot_time text,
  actual_wrap_time text,
  meal_break_time text,
  total_shooting_hours numeric,
  overtime_notes text,
  weather_notes text,
  general_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_report_scenes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.production_reports(id) on delete cascade,
  scene_id uuid references public.scenes(id) on delete set null,
  scene_number text,
  status text not null default 'completed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_report_issues (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.production_reports(id) on delete cascade,
  category text not null,
  department text,
  severity text not null default 'medium',
  title text not null,
  description text,
  resolved boolean not null default false,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_report_department_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.production_reports(id) on delete cascade,
  department text not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(report_id, department)
);

create index if not exists idx_prod_reports_project on public.production_reports(project_id);
create index if not exists idx_prod_reports_date on public.production_reports(report_date desc);
create index if not exists idx_prod_report_scenes_report on public.production_report_scenes(report_id);
create index if not exists idx_prod_report_issues_report on public.production_report_issues(report_id);
create index if not exists idx_prod_report_dept_notes_report on public.production_report_department_notes(report_id);

drop trigger if exists production_reports_updated_at on public.production_reports;
create trigger production_reports_updated_at
  before update on public.production_reports
  for each row execute function public.set_updated_at();

drop trigger if exists production_report_scenes_updated_at on public.production_report_scenes;
create trigger production_report_scenes_updated_at
  before update on public.production_report_scenes
  for each row execute function public.set_updated_at();

drop trigger if exists production_report_issues_updated_at on public.production_report_issues;
create trigger production_report_issues_updated_at
  before update on public.production_report_issues
  for each row execute function public.set_updated_at();

drop trigger if exists production_report_dept_notes_updated_at on public.production_report_department_notes;
create trigger production_report_dept_notes_updated_at
  before update on public.production_report_department_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
create or replace function public.user_can_manage_production_report(pid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_role text;
begin
  if not public.project_is_editable(pid) then
    return false;
  end if;

  if public.is_platform_owner() then
    return true;
  end if;

  select company_id into v_company_id from public.projects where id = pid;
  if v_company_id is null then
    return false;
  end if;

  if public.user_is_company_admin(v_company_id) then
    return true;
  end if;

  select role into v_role from public.user_project_member_role(pid);
  return v_role in ('project_admin', 'producer', 'assistant_director');
end;
$$;

create or replace function public.user_can_view_production_report(rid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_company_id uuid;
begin
  select project_id, company_id
  into v_project_id, v_company_id
  from public.production_reports
  where id = rid;

  if v_project_id is null then
    return false;
  end if;

  if public.is_platform_owner() then
    return true;
  end if;

  if public.user_is_company_admin(v_company_id) then
    return true;
  end if;

  return public.user_can_access_project(v_project_id);
end;
$$;

create or replace function public.user_can_edit_production_report(rid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select project_id, status
  into v_project_id, v_status
  from public.production_reports
  where id = rid;

  if v_project_id is null then
    return false;
  end if;

  if v_status in ('approved', 'archived') then
    return false;
  end if;

  return public.user_can_manage_production_report(v_project_id);
end;
$$;

create or replace function public.user_can_edit_report_department_note(rid uuid, dept text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_role text;
  v_member_dept text;
begin
  select project_id, status
  into v_project_id, v_status
  from public.production_reports
  where id = rid;

  if v_project_id is null or v_status <> 'draft' then
    return false;
  end if;

  if public.user_can_manage_production_report(v_project_id) then
    return true;
  end if;

  select role, department into v_role, v_member_dept
  from public.user_project_member_role(v_project_id);

  if v_role = 'department_user' and v_member_dept is not null then
    return public.normalize_doc_department(v_member_dept) = public.normalize_doc_department(dept)
        or v_member_dept = dept;
  end if;

  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.production_reports enable row level security;
alter table public.production_report_scenes enable row level security;
alter table public.production_report_issues enable row level security;
alter table public.production_report_department_notes enable row level security;

drop policy if exists "prod_reports_select" on public.production_reports;
create policy "prod_reports_select" on public.production_reports
  for select using (public.user_can_view_production_report(id));

drop policy if exists "prod_reports_insert" on public.production_reports;
create policy "prod_reports_insert" on public.production_reports
  for insert with check (
    public.user_can_manage_production_report(project_id)
    and created_by = auth.uid()
  );

drop policy if exists "prod_reports_update" on public.production_reports;
create policy "prod_reports_update" on public.production_reports
  for update using (public.user_can_edit_production_report(id));

drop policy if exists "prod_report_scenes_select" on public.production_report_scenes;
create policy "prod_report_scenes_select" on public.production_report_scenes
  for select using (
    exists (
      select 1 from public.production_reports r
      where r.id = report_id and public.user_can_view_production_report(r.id)
    )
  );

drop policy if exists "prod_report_scenes_write" on public.production_report_scenes;
create policy "prod_report_scenes_write" on public.production_report_scenes
  for all using (
    exists (
      select 1 from public.production_reports r
      where r.id = report_id and public.user_can_edit_production_report(r.id)
    )
  );

drop policy if exists "prod_report_issues_select" on public.production_report_issues;
create policy "prod_report_issues_select" on public.production_report_issues
  for select using (
    exists (
      select 1 from public.production_reports r
      where r.id = report_id and public.user_can_view_production_report(r.id)
    )
  );

drop policy if exists "prod_report_issues_write" on public.production_report_issues;
create policy "prod_report_issues_write" on public.production_report_issues
  for all using (
    exists (
      select 1 from public.production_reports r
      where r.id = report_id and public.user_can_edit_production_report(r.id)
    )
  );

drop policy if exists "prod_report_dept_notes_select" on public.production_report_department_notes;
create policy "prod_report_dept_notes_select" on public.production_report_department_notes
  for select using (
    exists (
      select 1 from public.production_reports r
      where r.id = report_id and public.user_can_view_production_report(r.id)
    )
  );

drop policy if exists "prod_report_dept_notes_insert" on public.production_report_department_notes;
create policy "prod_report_dept_notes_insert" on public.production_report_department_notes
  for insert with check (
    public.user_can_edit_report_department_note(report_id, department)
    and created_by = auth.uid()
  );

drop policy if exists "prod_report_dept_notes_update" on public.production_report_department_notes;
create policy "prod_report_dept_notes_update" on public.production_report_department_notes
  for update using (
    public.user_can_edit_report_department_note(report_id, department)
  );

grant execute on function public.user_can_manage_production_report(uuid) to authenticated;
grant execute on function public.user_can_view_production_report(uuid) to authenticated;
grant execute on function public.user_can_edit_production_report(uuid) to authenticated;
grant execute on function public.user_can_edit_report_department_note(uuid, text) to authenticated;
