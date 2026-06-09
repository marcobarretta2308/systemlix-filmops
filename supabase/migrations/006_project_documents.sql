-- Project Documents Vault — table, RLS helpers, storage bucket policies
-- Run after rls.sql and 003_platform_owner_rls.sql

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  file_name text not null,
  original_file_name text not null,
  file_path text not null,
  mime_type text,
  size_bytes bigint,
  category text not null,
  department text,
  visibility text not null default 'project',
  notes text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_documents_company on public.project_documents(company_id);
create index if not exists idx_project_documents_project on public.project_documents(project_id);
create index if not exists idx_project_documents_uploaded_by on public.project_documents(uploaded_by);
create index if not exists idx_project_documents_category on public.project_documents(category);
create index if not exists idx_project_documents_department on public.project_documents(department);
create index if not exists idx_project_documents_created_at on public.project_documents(created_at desc);

drop trigger if exists project_documents_updated_at on public.project_documents;
create trigger project_documents_updated_at
  before update on public.project_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.project_is_editable(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select status not in ('archived', 'locked')
      from public.projects
      where id = pid
    ),
    false
  );
$$;

create or replace function public.user_project_member_role(pid uuid)
returns table(role text, department text)
language sql
stable
security definer
set search_path = public
as $$
  select pm.role::text, pm.department::text
  from public.project_members pm
  where pm.project_id = pid
    and pm.user_id = auth.uid()
    and pm.access_status = 'active'
  limit 1;
$$;

create or replace function public.normalize_doc_department(dept text)
returns text
language sql
immutable
set search_path = public
as $$
  select case dept
    when 'Costumi' then 'Costume'
    when 'Trucco' then 'Makeup'
    when 'Trasporti' then 'Transport'
    when 'Location' then 'Locations'
    else dept
  end;
$$;

create or replace function public.user_can_upload_project_document(pid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_company_id uuid;
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

  return v_role in ('project_admin', 'producer', 'assistant_director', 'department_user');
end;
$$;

create or replace function public.user_can_view_project_document(
  p_project_id uuid,
  p_company_id uuid,
  p_visibility text,
  p_department text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_dept text;
begin
  if not public.user_can_access_project(p_project_id) then
    return false;
  end if;

  if public.is_platform_owner() then
    return true;
  end if;

  if public.user_is_company_admin(p_company_id) then
    return true;
  end if;

  select role, department into v_role, v_dept
  from public.user_project_member_role(p_project_id);

  if v_role is null then
    return false;
  end if;

  if v_role in ('project_admin', 'producer') then
    return true;
  end if;

  if coalesce(p_visibility, 'project') = 'project' then
    return true;
  end if;

  if v_role = 'assistant_director' then
    if p_department is null then
      return true;
    end if;
    if p_department in ('Production', 'Direction', 'AD Department') then
      return true;
    end if;
    if v_dept is not null and p_department = public.normalize_doc_department(v_dept) then
      return true;
    end if;
    return false;
  end if;

  if v_role = 'department_user' then
    return v_dept is not null
      and p_department = public.normalize_doc_department(v_dept);
  end if;

  return false;
end;
$$;

create or replace function public.user_can_delete_project_document(doc_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_company_id uuid;
  v_uploaded_by uuid;
  v_role text;
begin
  select project_id, company_id, uploaded_by
  into v_project_id, v_company_id, v_uploaded_by
  from public.project_documents
  where id = doc_id and is_deleted = false;

  if v_project_id is null then
    return false;
  end if;

  if not public.project_is_editable(v_project_id) then
    return false;
  end if;

  if public.is_platform_owner() then
    return true;
  end if;

  if public.user_is_company_admin(v_company_id) then
    return true;
  end if;

  select role into v_role from public.user_project_member_role(v_project_id);

  if v_role in ('project_admin', 'producer') then
    return true;
  end if;

  if v_uploaded_by = auth.uid() and public.user_can_upload_project_document(v_project_id) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.profile_display_name(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(full_name), ''), email, uid::text)
  from public.profiles
  where id = uid;
$$;

grant execute on function public.profile_display_name(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.project_documents enable row level security;

drop policy if exists "project_documents_select" on public.project_documents;
create policy "project_documents_select" on public.project_documents
  for select using (
    is_deleted = false
    and public.user_can_view_project_document(project_id, company_id, visibility, department)
  );

drop policy if exists "project_documents_insert" on public.project_documents;
create policy "project_documents_insert" on public.project_documents
  for insert with check (
    uploaded_by = auth.uid()
    and public.user_can_upload_project_document(project_id)
  );

drop policy if exists "project_documents_update" on public.project_documents;
create policy "project_documents_update" on public.project_documents
  for update using (
    public.user_can_delete_project_document(id)
  );

-- ---------------------------------------------------------------------------
-- Storage bucket (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-documents', 'project-documents', false, 26214400)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "project_documents_storage_insert" on storage.objects;
create policy "project_documents_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-documents'
    and (storage.foldername(name))[1] is not null
    and (storage.foldername(name))[2] is not null
    and public.user_can_upload_project_document(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "project_documents_storage_select" on storage.objects;
create policy "project_documents_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-documents'
    and exists (
      select 1
      from public.project_documents pd
      where pd.file_path = storage.objects.name
        and pd.is_deleted = false
        and public.user_can_view_project_document(
          pd.project_id, pd.company_id, pd.visibility, pd.department
        )
    )
  );

drop policy if exists "project_documents_storage_delete" on storage.objects;
create policy "project_documents_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-documents'
    and exists (
      select 1
      from public.project_documents pd
      where pd.file_path = storage.objects.name
        and public.user_can_delete_project_document(pd.id)
    )
  );
