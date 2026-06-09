-- Schema hardening — supplemental columns and indexes
-- Run after 008_production_reports.sql
-- Idempotent: safe to re-run on existing databases

-- ---------------------------------------------------------------------------
-- call_sheets — workflow metadata (extends 007)
-- Note: version lives on call_sheets.version; version_number on distributions
-- ---------------------------------------------------------------------------
alter table public.call_sheets
  add column if not exists status text default 'draft',
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists sent_by uuid references public.profiles(id) on delete set null,
  add column if not exists sent_at timestamptz,
  add column if not exists last_updated_at timestamptz;

update public.call_sheets
set last_updated_at = coalesce(updated_at, created_at, now())
where last_updated_at is null;

create or replace function public.sync_call_sheet_last_updated()
returns trigger
language plpgsql
as $$
begin
  new.last_updated_at = now();
  new.updated_at = coalesce(new.updated_at, now());
  return new;
end;
$$;

drop trigger if exists call_sheets_last_updated on public.call_sheets;
create trigger call_sheets_last_updated
  before update on public.call_sheets
  for each row execute function public.sync_call_sheet_last_updated();

-- ---------------------------------------------------------------------------
-- call_sheet_recipients — extended receipt metadata (extends 007)
-- ---------------------------------------------------------------------------
alter table public.call_sheet_recipients
  add column if not exists target_key text,
  add column if not exists target_type text,
  add column if not exists target_label text,
  add column if not exists acknowledged_user_agent text,
  add column if not exists acknowledged_ip text,
  add column if not exists acknowledged_notes text;

-- ---------------------------------------------------------------------------
-- production_report_department_notes — ensure unique dept per report
-- ---------------------------------------------------------------------------
create unique index if not exists uq_prod_report_dept_notes_report_dept
  on public.production_report_department_notes (report_id, department);
