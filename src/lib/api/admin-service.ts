import { projectMemberPermissionPayload } from "@/lib/permissions/project-permissions";
import {
  ADMIN_KEY_ERROR,
  createSupabaseAdminClient,
  logAdminEnvStatus,
} from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccessStatus,
  CompanyRole,
  MemberStatus,
  ProjectRole,
} from "@/lib/types";

export { ADMIN_KEY_ERROR };

export function requireAdminClient(): SupabaseClient {
  logAdminEnvStatus("requireAdminClient");
  return createSupabaseAdminClient();
}

export async function resolveUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  return data?.id ?? null;
}

export async function upsertProfile(
  admin: SupabaseClient,
  userId: string,
  email: string,
  fullName: string
) {
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      global_role: "user",
      auth_status: "active",
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function upsertCompanyMember(
  admin: SupabaseClient,
  input: {
    company_id: string;
    user_id: string;
    role: CompanyRole;
    status?: MemberStatus;
    access_start_date?: string | null;
    access_end_date?: string | null;
  }
) {
  const { data: existing } = await admin
    .from("company_members")
    .select("id")
    .eq("company_id", input.company_id)
    .eq("user_id", input.user_id)
    .maybeSingle();

  const payload = {
    company_id: input.company_id,
    user_id: input.user_id,
    role: input.role,
    status: input.status ?? "active",
    access_start_date: input.access_start_date || null,
    access_end_date: input.access_end_date || null,
    joined_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await admin
      .from("company_members")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin
    .from("company_members")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function upsertProjectMember(
  admin: SupabaseClient,
  input: {
    project_id: string;
    user_id: string;
    role: ProjectRole;
    department?: string | null;
    permission_profile?: string | null;
    access_status?: AccessStatus;
    access_start_date?: string | null;
    access_end_date?: string | null;
  }
) {
  const permissionPayload = projectMemberPermissionPayload(
    input.role,
    input.department,
    input.permission_profile
  );

  const { data: existing } = await admin
    .from("project_members")
    .select("id")
    .eq("project_id", input.project_id)
    .eq("user_id", input.user_id)
    .maybeSingle();

  const payload = {
    project_id: input.project_id,
    user_id: input.user_id,
    access_status: input.access_status ?? "active",
    access_start_date: input.access_start_date || null,
    access_end_date: input.access_end_date || null,
    ...permissionPayload,
  };

  if (existing?.id) {
    const { error } = await admin
      .from("project_members")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin
    .from("project_members")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
