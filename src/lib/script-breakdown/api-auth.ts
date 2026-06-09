import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type BreakdownAuthContext = {
  supabase: SupabaseClient;
  user: User;
  admin: SupabaseClient | null;
};

export async function getBreakdownAuthContext(): Promise<
  BreakdownAuthContext | { error: string; status: number }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated", status: 401 };
  }

  return { supabase, user, admin: createAdminClient() };
}

export async function assertProjectBreakdownAccess(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{ company_id: string; workspace_id: string | null }> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("company_id, workspace_id")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    throw new Error("Project not found or access denied");
  }

  const [{ data: member }, { data: companyMember }, { data: profile }] =
    await Promise.all([
      supabase
        .from("project_members")
        .select("role, can_edit_breakdown")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("company_members")
        .select("role")
        .eq("company_id", project.company_id)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("global_role")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  const companyRole = companyMember?.role;
  const canEdit =
    profile?.global_role === "platform_owner" ||
    companyRole === "platform_owner" ||
    companyRole === "company_admin" ||
    member?.can_edit_breakdown === true ||
    ["project_admin", "producer", "assistant_director"].includes(
      member?.role ?? ""
    );

  if (!canEdit) {
    throw new Error("You do not have permission to run script breakdown");
  }

  return project;
}
