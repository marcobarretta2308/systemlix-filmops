-- Soft delete for projects (hide from workspace, keep all related data)

alter table public.projects
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null references auth.users(id),
  add column if not exists is_deleted boolean not null default false;

create index if not exists idx_projects_active_company
  on public.projects(company_id)
  where is_deleted = false;

-- Non-deleted projects visible to members; deleted visible only to platform owner / company admin
create or replace function public.user_can_access_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_owner() or exists (
    select 1 from public.projects p
    where p.id = pid
      and (
        coalesce(p.is_deleted, false) = false
        or public.user_is_company_admin(p.company_id)
      )
      and (
        public.user_is_company_admin(p.company_id)
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = pid
            and pm.user_id = auth.uid()
            and pm.access_status = 'active'
        )
      )
  );
$$;
