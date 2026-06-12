-- FilmOps — Access control migration
-- Run after schema.sql on existing databases

alter table public.profiles
  add column if not exists global_role text default 'user',
  add column if not exists auth_status text default 'active';

alter table public.company_members
  add column if not exists access_start_date date,
  add column if not exists access_end_date date;

alter table public.project_members
  add column if not exists access_start_date date,
  add column if not exists access_end_date date;

-- Restrict company member status values (active | suspended | revoked)
comment on column public.profiles.global_role is 'platform_owner | user';
comment on column public.profiles.auth_status is 'active | suspended | revoked | banned';
comment on column public.company_members.status is 'active | suspended | revoked';
comment on column public.project_members.access_status is 'active | suspended | revoked';

-- Update profile trigger for invite-only defaults
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, global_role, auth_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'global_role', 'user'),
    'active'
  );
  return new;
end;
$$;
