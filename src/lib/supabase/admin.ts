import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase admin client.
 * NEVER import this file from client components.
 * Requires SUPABASE_SERVICE_ROLE_KEY in server env.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isAdminApiConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      /^https?:\/\//i.test(process.env.NEXT_PUBLIC_SUPABASE_URL)
  );
}
