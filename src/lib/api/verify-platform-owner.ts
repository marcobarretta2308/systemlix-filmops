import { createClient } from "@/lib/supabase/server";

export async function verifyPlatformOwner(): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: "Non autenticato" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("global_role, auth_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: "Errore verifica profilo" };
  }

  if (profile?.global_role !== "platform_owner") {
    return { ok: false, status: 403, error: "Solo Platform Owner autorizzato" };
  }

  if (profile.auth_status && profile.auth_status !== "active") {
    return { ok: false, status: 403, error: "Account non attivo" };
  }

  return { ok: true, userId: user.id };
}
