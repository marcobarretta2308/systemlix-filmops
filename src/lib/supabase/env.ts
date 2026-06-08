export function getSupabaseUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !/^https?:\/\//i.test(url)) return undefined;
  return url;
}

export function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function isSupabaseEnvConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
