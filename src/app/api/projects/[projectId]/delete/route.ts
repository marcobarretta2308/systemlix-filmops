import { canDeleteProject } from "@/lib/permissions";
import { softDeleteProjectRecord } from "@/lib/supabase/data";
import { mapProjectMember } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRole, User } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CONFIRM_TEXT = "ELIMINA";

async function resolveMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string
) {
  const { data } = await supabase
    .from("project_members")
    .select("*, profiles(email, full_name, global_role)")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("access_status", "active")
    .maybeSingle();
  return data ? mapProjectMember(data) : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    confirmText?: string;
  };

  if (body.confirmText?.trim() !== CONFIRM_TEXT) {
    return NextResponse.json(
      { error: "Type ELIMINA to confirm" },
      { status: 400 }
    );
  }

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, company_id, is_deleted")
    .eq("id", projectId)
    .maybeSingle();

  if (projectErr || !project) {
    return NextResponse.json({ error: "Progetto non trovato" }, { status: 404 });
  }

  if (project.is_deleted) {
    return NextResponse.json(
      { error: "Il progetto è già nel cestino" },
      { status: 409 }
    );
  }

  const membership = await resolveMembership(supabase, projectId, user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: companyMember } = await supabase
    .from("company_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("company_id", project.company_id)
    .eq("status", "active")
    .maybeSingle();

  const userRecord: User = {
    id: user.id,
    email: user.email ?? "",
    full_name: user.user_metadata?.full_name ?? "",
    global_role: (profile?.global_role ?? "user") as User["global_role"],
    auth_status: "active",
    created_at: user.created_at,
  };

  const companyRole = (companyMember?.role ?? "viewer") as CompanyRole;

  if (!canDeleteProject(userRecord, companyRole, membership?.role)) {
    return NextResponse.json(
      { error: "You do not have permission to delete this project" },
      { status: 403 }
    );
  }

  try {
    const deleted = await softDeleteProjectRecord(
      supabase,
      projectId,
      user.id,
      "Project moved to trash via FilmOps"
    );

    return NextResponse.json({
      ok: true,
      projectId: deleted.id,
      message: "Project moved to trash",
    });
  } catch (error) {
    console.error("[FilmOps] Soft delete project error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete project";
    return NextResponse.json(
      { error: `Failed to delete project: ${message}` },
      { status: 500 }
    );
  }
}
