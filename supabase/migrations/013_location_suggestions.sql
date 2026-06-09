-- Location suggestions lifecycle — separate AI candidates from active production locations
-- Run after 012_location_normalization.sql

alter table public.locations
  add column if not exists raw_name text,
  add column if not exists confidence_score numeric;

create index if not exists idx_locations_source_status
  on public.locations(project_id, source, status);

-- Orphan AI-generated rows with no scene links → suggestions (not active production list)
update public.locations l
set status = 'suggestion'
where l.status not in ('archived', 'suggestion')
  and coalesce(l.source, '') in ('script_breakdown', 'backfill', 'ai')
  and coalesce(l.scene_count, 0) = 0
  and not exists (
    select 1 from public.scene_locations sl where sl.location_id = l.id
  );

-- Manual locations without scenes stay active (source null or manual)
