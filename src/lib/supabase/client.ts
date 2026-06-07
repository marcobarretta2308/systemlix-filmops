import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && /^https?:\/\//i.test(url));
}

export function createClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("createClient() è disponibile solo nel browser");
  }

  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || !/^https?:\/\//i.test(url)) {
    throw new Error(
      "Supabase non configurato. Imposta NEXT_PUBLIC_SUPABASE_URL (https://...) e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  browserClient = createBrowserClient(url, key);
  return browserClient;
}

export function getClientOrNull(): SupabaseClient | null {
  if (typeof window === "undefined" || !isSupabaseConfigured()) return null;
  try {
    return createClient();
  } catch {
    return null;
  }
}
