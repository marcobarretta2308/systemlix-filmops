-- Platform Owner bypass RLS — Systemlix global admin sees all tenants
-- Run after rls.sql and 002_access_control.sql

create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select global_role = 'platform_owner' and auth_status = 'active'
      from public.profiles
      where id = auth.uid()
    ),
    false
  );
$$;

-- Extend helpers: platform owner = full company/project access
create or replace function public.user_in_company(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_owner() or exists (
    select 1 from public.company_members
    where company_id = cid and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.user_is_company_admin(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_owner() or exists (
    select 1 from public.company_members
    where company_id = cid and user_id = auth.uid() and status = 'active'
      and role in ('platform_owner', 'company_admin')
  );
$$;

create or replace function public.user_can_access_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
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

create or replace function public.user_can_edit_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
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

-- Company members: platform owner can read own row + all rows via user_in_company on companies
-- Allow platform owner to read all company_members
drop policy if exists "company_members_select_platform_owner" on public.company_members;
create policy "company_members_select_platform_owner" on public.company_members
  for select using (public.is_platform_owner() or user_id = auth.uid());
