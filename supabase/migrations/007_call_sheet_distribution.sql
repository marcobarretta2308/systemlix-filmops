-- Call Sheet Distribution + Read Receipts
-- Run after 006_project_documents.sql

-- Extend call_sheets workflow metadata
alter table public.call_sheets
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists approved_at timestamptz,
  add column if not exists sent_by uuid references public.profiles(id),
  add column if not exists sent_at timestamptz;

update public.call_sheets
set created_by = generated_by
where created_by is null and generated_by is not null;

update public.call_sheets set status = 'ready_for_approval' where status = 'final';
update public.call_sheets set status = 'approved' where status = 'locked';

-- ---------------------------------------------------------------------------
-- Distribution tables
-- ---------------------------------------------------------------------------
create table if not exists public.call_sheet_distributions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  call_sheet_id uuid not null references public.call_sheets(id) on delete cascade,
  version_number integer not null default 1,
  status text not null default 'sent',
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.call_sheet_recipients (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.call_sheet_distributions(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  full_name text,
  department text,
  recipient_type text not null default 'user',
  target_key text,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  acknowledged_user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cs_dist_project on public.call_sheet_distributions(project_id);
create index if not exists idx_cs_dist_call_sheet on public.call_sheet_distributions(call_sheet_id);
create index if not exists idx_cs_dist_sent_at on public.call_sheet_distributions(sent_at desc);
create index if not exists idx_cs_recip_distribution on public.call_sheet_recipients(distribution_id);
create index if not exists idx_cs_recip_project on public.call_sheet_recipients(project_id);
create index if not exists idx_cs_recip_user on public.call_sheet_recipients(user_id);
create index if not exists idx_cs_recip_department on public.call_sheet_recipients(department);

drop trigger if exists call_sheet_distributions_updated_at on public.call_sheet_distributions;
create trigger call_sheet_distributions_updated_at
  before update on public.call_sheet_distributions
  for each row execute function public.set_updated_at();

drop trigger if exists call_sheet_recipients_updated_at on public.call_sheet_recipients;
create trigger call_sheet_recipients_updated_at
  before update on public.call_sheet_recipients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.user_can_send_call_sheet(pid uuid)
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

create or replace function public.user_can_manage_call_sheet_receipts(pid uuid)
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

create or replace function public.user_can_view_call_sheet_distribution(dist_id uuid)
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
  from public.call_sheet_distributions
  where id = dist_id;

  if v_project_id is null then
    return false;
  end if;

  if public.user_can_manage_call_sheet_receipts(v_project_id) then
    return true;
  end if;

  if exists (
    select 1 from public.call_sheet_recipients r
    where r.distribution_id = dist_id
      and r.user_id = auth.uid()
  ) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.user_can_view_call_sheet_recipient(recip_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dist_id uuid;
  v_project_id uuid;
  v_user_id uuid;
  v_dept text;
  v_role text;
  v_member_dept text;
begin
  select r.distribution_id, r.project_id, r.user_id, r.department
  into v_dist_id, v_project_id, v_user_id, v_dept
  from public.call_sheet_recipients r
  where r.id = recip_id;

  if v_project_id is null then
    return false;
  end if;

  if public.user_can_manage_call_sheet_receipts(v_project_id) then
    return true;
  end if;

  if v_user_id = auth.uid() then
    return true;
  end if;

  select role, department into v_role, v_member_dept
  from public.user_project_member_role(v_project_id);

  if v_role = 'department_user' and v_dept is not null then
    return public.normalize_doc_department(v_member_dept) = v_dept;
  end if;

  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.call_sheet_distributions enable row level security;
alter table public.call_sheet_recipients enable row level security;

drop policy if exists "cs_dist_select" on public.call_sheet_distributions;
create policy "cs_dist_select" on public.call_sheet_distributions
  for select using (public.user_can_view_call_sheet_distribution(id));

drop policy if exists "cs_dist_insert" on public.call_sheet_distributions;
create policy "cs_dist_insert" on public.call_sheet_distributions
  for insert with check (
    public.user_can_send_call_sheet(project_id)
    and sent_by = auth.uid()
  );

drop policy if exists "cs_dist_update" on public.call_sheet_distributions;
create policy "cs_dist_update" on public.call_sheet_distributions
  for update using (public.user_can_send_call_sheet(project_id));

drop policy if exists "cs_recip_select" on public.call_sheet_recipients;
create policy "cs_recip_select" on public.call_sheet_recipients
  for select using (public.user_can_view_call_sheet_recipient(id));

drop policy if exists "cs_recip_insert" on public.call_sheet_recipients;
create policy "cs_recip_insert" on public.call_sheet_recipients
  for insert with check (
    exists (
      select 1 from public.call_sheet_distributions d
      where d.id = distribution_id
        and public.user_can_send_call_sheet(d.project_id)
    )
  );

drop policy if exists "cs_recip_update_ack" on public.call_sheet_recipients;
create policy "cs_recip_update_ack" on public.call_sheet_recipients
  for update using (
    user_id = auth.uid()
    and acknowledged_at is null
  );

grant execute on function public.user_can_send_call_sheet(uuid) to authenticated;
grant execute on function public.user_can_manage_call_sheet_receipts(uuid) to authenticated;
