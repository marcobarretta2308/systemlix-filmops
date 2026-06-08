import { createClient } from "@/lib/supabase/server";
import type { CompanyRole } from "@/lib/types";

type AuthOk = {
  ok: true;
  userId: string;
  globalRole: string;
  companyRole?: CompanyRole;
};

type AuthFail = { ok: false; status: number; error: string };

export async function verifyPlatformOwner(): Promise<AuthOk | AuthFail> {
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

  return { ok: true, userId: user.id, globalRole: profile.global_role };
}

export async function verifyAdminForCompany(
  companyId?: string
): Promise<AuthOk | AuthFail> {
  const platform = await verifyPlatformOwner();
  if (platform.ok) return platform;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Non autenticato" };
  }

  if (!companyId) {
    return { ok: false, status: 403, error: "Autorizzazione negata" };
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("role, status")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    !membership ||
    membership.status !== "active" ||
    !["company_admin", "platform_owner"].includes(membership.role)
  ) {
    return { ok: false, status: 403, error: "Autorizzazione negata" };
  }

  return {
    ok: true,
    userId: user.id,
    globalRole: "user",
    companyRole: membership.role as CompanyRole,
  };
}
