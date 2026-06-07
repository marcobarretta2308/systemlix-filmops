import { createAdminClient } from "./admin";
import { mapProfile } from "./mappers";

const PROFILE_COLUMNS =
  "id, email, full_name, avatar_url, global_role, auth_status, created_at";

export async function syncProfileForAuthUser(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<{ profile: ReturnType<typeof mapProfile> | null; error: string | null }> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      profile: null,
      error: `Profilo non trovato per id ${authUser.id}. Aggiungi SUPABASE_SERVICE_ROLE_KEY in .env.local oppure crea il profilo in Supabase SQL Editor.`,
    };
  }

  const { data: existing, error: readError } = await admin
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", authUser.id)
    .maybeSingle();

  if (readError) {
    return { profile: null, error: readError.message };
  }
  if (existing) {
    return { profile: mapProfile(existing), error: null };
  }

  const fullName =
    (authUser.user_metadata?.full_name as string | undefined) ??
    authUser.email?.split("@")[0] ??
    "User";

  const { data, error } = await admin
    .from("profiles")
    .insert({
      id: authUser.id,
      email: authUser.email,
      full_name: fullName,
      global_role: "user",
      auth_status: "active",
    })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    return { profile: null, error: error.message };
  }
  return { profile: mapProfile(data), error: null };
}
