import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseEnvConfigured } from "./env";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return isSupabaseEnvConfigured();
}

export function createClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("createClient() è disponibile solo nel browser");
  }

  if (browserClient) return browserClient;

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error(
      "Supabase non configurato. Imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in .env.local"
    );
  }

  browserClient = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

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
