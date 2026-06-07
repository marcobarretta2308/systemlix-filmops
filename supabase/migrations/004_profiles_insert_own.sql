-- Allow authenticated users to create their own profile row (e.g. if auth trigger missed)
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
