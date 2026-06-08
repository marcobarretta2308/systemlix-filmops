import { adminRouteErrorResponse } from "@/lib/api/admin-route";
import { requireAdminClient } from "@/lib/api/admin-service";
import { verifyPlatformOwner } from "@/lib/api/verify-admin";
import { logAdminEnvStatus } from "@/lib/supabase/admin";
import { mapCompany, mapProject, mapProjectMember } from "@/lib/supabase/mappers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await verifyPlatformOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    logAdminEnvStatus("list users");
    const admin = requireAdminClient();

    const [profilesRes, companyMembersRes, projectMembersRes, companiesRes, projectsRes] =
      await Promise.all([
        admin.from("profiles").select("*").order("created_at", { ascending: false }),
        admin.from("company_members").select("*"),
        admin.from("project_members").select("*"),
        admin.from("companies").select("*").order("name"),
        admin.from("projects").select("*").order("title"),
      ]);

    for (const res of [
      profilesRes,
      companyMembersRes,
      projectMembersRes,
      companiesRes,
      projectsRes,
    ]) {
      if (res.error) throw res.error;
    }

    const companies = (companiesRes.data ?? []).map(mapCompany);
    const projects = (projectsRes.data ?? []).map(mapProject);
    const projectMembers = (projectMembersRes.data ?? []).map(mapProjectMember);

    const users = (profilesRes.data ?? []).map((profile) => {
      const companyMemberships = (companyMembersRes.data ?? []).filter(
        (m) => m.user_id === profile.id
      );
      const projectMemberships = projectMembers.filter((m) => m.user_id === profile.id);

      return {
        id: profile.id,
        email: profile.email ?? "",
        full_name: profile.full_name ?? "",
        global_role: profile.global_role ?? "user",
        auth_status: profile.auth_status ?? "active",
        company_memberships: companyMemberships.map((m) => ({
          company_id: m.company_id,
          role: m.role,
          status: m.status,
          company_name:
            companies.find((c) => c.id === m.company_id)?.name ?? "—",
        })),
        project_memberships: projectMemberships.map((m) => ({
          project_id: m.project_id,
          role: m.role,
          department: m.department,
          access_status: m.access_status,
          project_title:
            projects.find((p) => p.id === m.project_id)?.title ?? "—",
        })),
      };
    });

    return NextResponse.json({ users, companies, projects });
  } catch (error) {
    return adminRouteErrorResponse("list users", error, "Caricamento utenti fallito");
  }
}
