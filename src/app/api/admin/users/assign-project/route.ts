import { adminRouteErrorResponse } from "@/lib/api/admin-route";
import {
  requireAdminClient,
  resolveUserIdByEmail,
  upsertProjectMember,
} from "@/lib/api/admin-service";
import { verifyAdminForCompany, verifyPlatformOwner } from "@/lib/api/verify-admin";
import { logAdminEnvStatus } from "@/lib/supabase/admin";
import type { AccessStatus, ProjectRole } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    user_id?: string;
    email?: string;
    project_id?: string;
    role?: ProjectRole;
    department?: string;
    permission_profile?: string;
    access_status?: AccessStatus;
    access_start_date?: string;
    access_end_date?: string;
  };

  const projectId = body.project_id?.trim();
  if (!projectId) {
    return NextResponse.json({ error: "project_id obbligatorio" }, { status: 400 });
  }

  try {
    logAdminEnvStatus("assign project");
    const admin = requireAdminClient();

    const { data: project } = await admin
      .from("projects")
      .select("company_id")
      .eq("id", projectId)
      .single();

    if (!project?.company_id) {
      return NextResponse.json({ error: "Progetto non trovato" }, { status: 404 });
    }

    const auth = await verifyAdminForCompany(project.company_id);
    if (!auth.ok) {
      const platform = await verifyPlatformOwner();
      if (!platform.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    }

    let userId = body.user_id?.trim();
    if (!userId && body.email) {
      userId = (await resolveUserIdByEmail(admin, body.email)) ?? undefined;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Utente non trovato (user_id o email validi)" },
        { status: 404 }
      );
    }

    const memberId = await upsertProjectMember(admin, {
      project_id: projectId,
      user_id: userId,
      role: (body.role ?? "department_user") as ProjectRole,
      department: body.department,
      permission_profile: body.permission_profile,
      access_status: body.access_status ?? "active",
      access_start_date: body.access_start_date,
      access_end_date: body.access_end_date,
    });

    return NextResponse.json({ success: true, project_member_id: memberId, user_id: userId });
  } catch (error) {
    return adminRouteErrorResponse("assign project", error, "Assegnazione progetto fallita");
  }
}
