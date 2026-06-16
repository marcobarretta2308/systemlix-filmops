-- Project / film metadata persistence

alter table public.projects
  add column if not exists production_title text,
  add column if not exists director_name text,
  add column if not exists producer_name text,
  add column if not exists production_company text,
  add column if not exists project_notes text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
