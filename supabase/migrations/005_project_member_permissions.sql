-- Granular project member permissions for FilmOps access control

alter table public.project_members
  add column if not exists department text,
  add column if not exists permission_profile text,
  add column if not exists can_view_breakdown boolean default false,
  add column if not exists can_edit_breakdown boolean default false,
  add column if not exists can_view_scenes boolean default false,
  add column if not exists can_edit_scenes boolean default false,
  add column if not exists can_view_cast_crew boolean default false,
  add column if not exists can_edit_cast_crew boolean default false,
  add column if not exists can_view_locations boolean default false,
  add column if not exists can_edit_locations boolean default false,
  add column if not exists can_view_shooting_days boolean default false,
  add column if not exists can_edit_shooting_days boolean default false,
  add column if not exists can_view_call_sheets boolean default false,
  add column if not exists can_edit_call_sheets boolean default false,
  add column if not exists can_view_set_assistant boolean default false,
  add column if not exists can_manage_access boolean default false;

comment on column public.project_members.permission_profile is 'Named permission preset applied to the member';
