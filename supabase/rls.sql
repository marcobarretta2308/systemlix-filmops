-- FilmOps — Row Level Security policies
-- Run AFTER schema.sql

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.workspaces enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.scripts enable row level security;
alter table public.scenes enable row level security;
alter table public.cast_crew enable row level security;
alter table public.locations enable row level security;
alter table public.shooting_days enable row level security;
alter table public.call_sheets enable row level security;
alter table public.assistant_threads enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.project_archive_logs enable row level security;

-- Helper: global platform owner (profiles.global_role)
create or replace function public.is_platform_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (
      select global_role = 'platform_owner' and auth_status = 'active'
      from public.profiles where id = auth.uid()
    ),
    false
  );
$$;

-- Helper: user belongs to company (platform owner sees all)
create or replace function public.user_in_company(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_owner() or exists (
    select 1 from public.company_members
    where company_id = cid and user_id = auth.uid() and status = 'active'
  );
$$;

-- Helper: user is company admin
create or replace function public.user_is_company_admin(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_owner() or exists (
    select 1 from public.company_members
    where company_id = cid and user_id = auth.uid() and status = 'active'
      and role in ('platform_owner', 'company_admin')
  );
$$;

-- Helper: user can access project
create or replace function public.user_can_access_project(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_owner() or exists (
    select 1 from public.projects p
    where p.id = pid and (
      public.user_is_company_admin(p.company_id)
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = pid and pm.user_id = auth.uid() and pm.access_status = 'active'
      )
    )
  );
$$;

-- Helper: user can edit project (admin roles)
create or replace function public.user_can_edit_project(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_owner() or exists (
    select 1 from public.projects p
    where p.id = pid and (
      public.user_is_company_admin(p.company_id)
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = pid and pm.user_id = auth.uid() and pm.access_status = 'active'
          and pm.role in ('project_admin', 'producer', 'assistant_director')
      )
    )
  );
$$;

-- Profiles
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());

-- Companies
create policy "companies_select_member" on public.companies for select
  using (public.user_in_company(id));
create policy "companies_insert_authenticated" on public.companies for insert
  with check (auth.uid() is not null);
create policy "companies_update_admin" on public.companies for update
  using (public.user_is_company_admin(id));

-- Company members
create policy "company_members_select_own_company" on public.company_members for select
  using (public.is_platform_owner() or public.user_in_company(company_id) or user_id = auth.uid());
create policy "company_members_insert_admin_or_self" on public.company_members for insert
  with check (
    user_id = auth.uid()
    or public.user_is_company_admin(company_id)
  );
create policy "company_members_update_admin" on public.company_members for update
  using (public.user_is_company_admin(company_id));

-- Workspaces
create policy "workspaces_select" on public.workspaces for select
  using (public.user_in_company(company_id));
create policy "workspaces_insert_admin" on public.workspaces for insert
  with check (public.user_is_company_admin(company_id));
create policy "workspaces_update_admin" on public.workspaces for update
  using (public.user_is_company_admin(company_id));

-- Projects
create policy "projects_select" on public.projects for select
  using (public.user_can_access_project(id));
create policy "projects_insert_admin" on public.projects for insert
  with check (public.user_is_company_admin(company_id));
create policy "projects_update_editor" on public.projects for update
  using (public.user_can_edit_project(id));

-- Project members
create policy "project_members_select" on public.project_members for select
  using (public.user_can_access_project(project_id));
create policy "project_members_insert_admin" on public.project_members for insert
  with check (public.user_can_edit_project(project_id));

-- Project-scoped tables (read if access, write if edit)
-- Scripts
create policy "scripts_select" on public.scripts for select using (public.user_can_access_project(project_id));
create policy "scripts_write" on public.scripts for all using (public.user_can_edit_project(project_id));

-- Scenes
create policy "scenes_select" on public.scenes for select using (public.user_can_access_project(project_id));
create policy "scenes_insert" on public.scenes for insert with check (public.user_can_edit_project(project_id));
create policy "scenes_update" on public.scenes for update using (public.user_can_edit_project(project_id));
create policy "scenes_delete" on public.scenes for delete using (public.user_can_edit_project(project_id));

-- Cast & crew
create policy "cast_crew_select" on public.cast_crew for select using (public.user_can_access_project(project_id));
create policy "cast_crew_write" on public.cast_crew for all using (public.user_can_edit_project(project_id));

-- Locations
create policy "locations_select" on public.locations for select using (public.user_can_access_project(project_id));
create policy "locations_write" on public.locations for all using (public.user_can_edit_project(project_id));

-- Shooting days
create policy "shooting_days_select" on public.shooting_days for select using (public.user_can_access_project(project_id));
create policy "shooting_days_write" on public.shooting_days for all using (public.user_can_edit_project(project_id));

-- Call sheets
create policy "call_sheets_select" on public.call_sheets for select using (public.user_can_access_project(project_id));
create policy "call_sheets_write" on public.call_sheets for all using (public.user_can_edit_project(project_id));

-- Assistant
create policy "assistant_threads_select" on public.assistant_threads for select
  using (public.user_can_access_project(project_id) and user_id = auth.uid());
create policy "assistant_threads_insert" on public.assistant_threads for insert
  with check (public.user_can_access_project(project_id) and user_id = auth.uid());

create policy "assistant_messages_select" on public.assistant_messages for select
  using (exists (
    select 1 from public.assistant_threads t
    where t.id = thread_id and t.user_id = auth.uid()
  ));
create policy "assistant_messages_insert" on public.assistant_messages for insert
  with check (exists (
    select 1 from public.assistant_threads t
    where t.id = thread_id and t.user_id = auth.uid()
  ));

-- Archive logs
create policy "archive_logs_select" on public.project_archive_logs for select
  using (public.user_can_access_project(project_id));
create policy "archive_logs_insert" on public.project_archive_logs for insert
  with check (public.user_can_edit_project(project_id));
