-- Systemlix FilmOps — Optional seed (run AFTER creating users in Supabase Auth)
-- Replace USER_UUID with actual auth.users id after signup

-- Example: link existing user as platform owner of a demo company
-- insert into public.companies (name, type) values ('Produzione Demo', 'production_house');
-- insert into public.company_members (company_id, user_id, role, status, joined_at)
--   values ('COMPANY_UUID', 'USER_UUID', 'company_admin', 'active', now());
-- insert into public.workspaces (company_id, name, description)
--   values ('COMPANY_UUID', 'Workspace Principale', 'Workspace di default');
