import { adminRouteErrorResponse } from "@/lib/api/admin-route";
import { requireAdminClient } from "@/lib/api/admin-service";
import { verifyPlatformOwner } from "@/lib/api/verify-admin";
import { logAdminEnvStatus } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await verifyPlatformOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    user_id?: string;
    company_id?: string;
    project_id?: string;
    scope?: "company" | "project" | "all";
  };

  const userId = body.user_id?.trim();
  const scope = body.scope ?? "project";

  if (!userId) {
    return NextResponse.json({ error: "user_id obbligatorio" }, { status: 400 });
  }

  try {
    logAdminEnvStatus("revoke access");
    const admin = requireAdminClient();
    let companyUpdated = 0;
    let projectUpdated = 0;

    if (scope === "company" || scope === "all") {
      let query = admin
        .from("company_members")
        .update({ status: "revoked" })
        .eq("user_id", userId);
      if (body.company_id) query = query.eq("company_id", body.company_id);
      const { data, error } = await query.select("id");
      if (error) throw error;
      companyUpdated = data?.length ?? 0;
    }

    if (scope === "project" || scope === "all") {
      let query = admin
        .from("project_members")
        .update({ access_status: "revoked" })
        .eq("user_id", userId);
      if (body.project_id) query = query.eq("project_id", body.project_id);
      const { data, error } = await query.select("id");
      if (error) throw error;
      projectUpdated = data?.length ?? 0;
    }

    if (scope === "all") {
      const { error: profileError } = await admin
        .from("profiles")
        .update({ auth_status: "revoked" })
        .eq("id", userId);
      if (profileError) throw profileError;
    }

    return NextResponse.json({
      success: true,
      company_members_revoked: companyUpdated,
      project_members_revoked: projectUpdated,
    });
  } catch (error) {
    return adminRouteErrorResponse("revoke access", error, "Revoca fallita");
  }
}
