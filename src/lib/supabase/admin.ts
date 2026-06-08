import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase admin client.
 * NEVER import this file from client components.
 * Uses SUPABASE_SERVICE_ROLE_KEY (sb_secret_* or legacy service_role JWT).
 */

export const ADMIN_URL_ERROR = "NEXT_PUBLIC_SUPABASE_URL non configurata.";
export const ADMIN_KEY_ERROR = "SUPABASE_SERVICE_ROLE_KEY non configurata";
export const ADMIN_WRONG_KEY_ERROR =
  "SUPABASE_SERVICE_ROLE_KEY non valida: usa la Secret key (sb_secret_...) o la service_role JWT dal dashboard Supabase. Non usare publishable/anon key.";

export type AdminEnvStatus = {
  urlPresent: boolean;
  serviceKeyPresent: boolean;
  serviceKeyKind: "sb_secret" | "jwt" | "sb_publishable" | "missing" | "unknown";
};

function classifyServiceKey(key: string | undefined): AdminEnvStatus["serviceKeyKind"] {
  if (!key) return "missing";
  if (key.startsWith("sb_secret_")) return "sb_secret";
  if (key.startsWith("sb_publishable_")) return "sb_publishable";
  if (key.startsWith("eyJ")) return "jwt";
  return "unknown";
}

export function getAdminEnvStatus(): AdminEnvStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  return {
    urlPresent: Boolean(url && /^https?:\/\//i.test(url)),
    serviceKeyPresent: Boolean(serviceKey),
    serviceKeyKind: classifyServiceKey(serviceKey),
  };
}

export function logAdminEnvStatus(context: string): void {
  const status = getAdminEnvStatus();
  console.info(`[FilmOps Admin] ${context}`, {
    urlPresent: status.urlPresent,
    serviceKeyPresent: status.serviceKeyPresent,
    serviceKeyKind: status.serviceKeyKind,
  });
}

function getAnonOrPublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();
}

export function resolveAdminCredentials(): { url: string; serviceKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error(ADMIN_URL_ERROR);
  }

  if (!serviceKey) {
    throw new Error(ADMIN_KEY_ERROR);
  }

  const anonKey = getAnonOrPublishableKey();
  if (serviceKey === anonKey || serviceKey.startsWith("sb_publishable_")) {
    throw new Error(ADMIN_WRONG_KEY_ERROR);
  }

  return { url, serviceKey };
}

export function createSupabaseAdminClient(): SupabaseClient {
  const { url, serviceKey } = resolveAdminCredentials();

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/** @deprecated Prefer createSupabaseAdminClient() which throws on misconfiguration. */
export function createAdminClient(): SupabaseClient | null {
  try {
    return createSupabaseAdminClient();
  } catch {
    return null;
  }
}

export function isAdminApiConfigured(): boolean {
  try {
    resolveAdminCredentials();
    return true;
  } catch {
    return false;
  }
}

export function logSupabaseAdminError(
  context: string,
  error: { message?: string; status?: number; code?: string; name?: string } | null | undefined
): void {
  if (!error) return;
  console.error(`[FilmOps Admin] ${context}`, {
    message: error.message,
    status: error.status,
    code: error.code,
    name: error.name,
  });
}
