import { adminRouteErrorResponse } from "@/lib/api/admin-route";
import {
  requireAdminClient,
  upsertCompanyMember,
  upsertProfile,
  upsertProjectMember,
} from "@/lib/api/admin-service";
import { verifyPlatformOwner } from "@/lib/api/verify-admin";
import { logAdminEnvStatus, logSupabaseAdminError } from "@/lib/supabase/admin";
import type { CompanyRole, ProjectRole } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await verifyPlatformOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    logAdminEnvStatus("create user");
    const admin = requireAdminClient();

    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      full_name?: string;
      company_id?: string;
      project_id?: string;
      role?: ProjectRole;
      department?: string;
      company_role?: CompanyRole;
      access_start_date?: string;
      access_end_date?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const fullName = body.full_name?.trim();
    const companyId = body.company_id?.trim();
    const projectId = body.project_id?.trim();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "email, password e full_name sono obbligatori" },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "company_id obbligatorio" },
        { status: 400 }
      );
    }

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError || !created.user) {
      logSupabaseAdminError("createUser", createError);
      return NextResponse.json(
        { error: createError?.message ?? "Creazione utente fallita" },
        { status: 500 }
      );
    }

    const userId = created.user.id;
    await upsertProfile(admin, userId, email, fullName);

    const companyRole = (body.company_role ?? "producer") as CompanyRole;
    await upsertCompanyMember(admin, {
      company_id: companyId,
      user_id: userId,
      role: companyRole,
      access_start_date: body.access_start_date,
      access_end_date: body.access_end_date,
    });

    let projectMemberId: string | null = null;
    const projectRole = (body.role ?? "department_user") as ProjectRole;

    if (projectId) {
      projectMemberId = await upsertProjectMember(admin, {
        project_id: projectId,
        user_id: userId,
        role: projectRole,
        department: body.department,
        access_start_date: body.access_start_date,
        access_end_date: body.access_end_date,
      });
    }

    const { data: company } = await admin
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    const { data: project } = projectId
      ? await admin.from("projects").select("title").eq("id", projectId).single()
      : { data: null };

    return NextResponse.json({
      success: true,
      user_id: userId,
      email,
      password,
      full_name: fullName,
      company_id: companyId,
      company_name: company?.name ?? "—",
      project_id: projectId ?? null,
      project_title: project?.title ?? null,
      role: projectRole,
      department: body.department ?? null,
      access_end_date: body.access_end_date ?? null,
      project_member_id: projectMemberId,
    });
  } catch (error) {
    return adminRouteErrorResponse("create user", error, "Creazione utente fallita");
  }
}
