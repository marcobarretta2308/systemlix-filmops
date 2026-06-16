import { canEditProject } from "@/lib/permissions";
import { updateProjectDetailsRecord } from "@/lib/supabase/data";
import { mapProfile, mapProject, mapProjectMember } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRole, Project, User } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function resolveAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string
) {
  const [{ data: projectRow }, { data: memberRow }, { data: profileRow }, { data: companyMemberRow }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
      supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("access_status", "active")
        .maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("company_members")
        .select("role, company_id")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);

  const project = projectRow ? mapProject(projectRow) : null;
  const membership = memberRow ? mapProjectMember(memberRow) : null;
  const user = profileRow ? mapProfile(profileRow) : null;

  let companyRole: CompanyRole = "viewer";
  if (user?.global_role === "platform_owner") {
    companyRole = "platform_owner";
  } else if (companyMemberRow?.length && project) {
    const match = companyMemberRow.find(
      (row) => row.company_id === project.company_id
    );
    if (match?.role) companyRole = match.role as CompanyRole;
  }

  return { project, membership, user, companyRole };
}

export async function GET(
  _request: Request,
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

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Progetto non trovato" }, { status: 404 });
  }

  const project = mapProject(data);

  if (process.env.NODE_ENV === "development") {
    console.log("[FilmOps] Project loaded:", projectId, project);
  }

  return NextResponse.json({ project });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { project, membership, user, companyRole } = await resolveAccess(
    supabase,
    projectId,
    authUser.id
  );

  if (!project) {
    return NextResponse.json({ error: "Progetto non trovato" }, { status: 404 });
  }

  if (
    !canEditProject(
      project,
      user,
      companyRole,
      membership?.role,
      membership ?? undefined
    )
  ) {
    return NextResponse.json(
      { error: "You do not have permission to edit this project" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const payload = {
    title: typeof body.title === "string" ? body.title : undefined,
    production_title:
      body.production_title === null || typeof body.production_title === "string"
        ? (body.production_title as string | null)
        : undefined,
    production_type:
      body.production_type === null || typeof body.production_type === "string"
        ? (body.production_type as string | null)
        : undefined,
    director_name:
      body.director_name === null || typeof body.director_name === "string"
        ? (body.director_name as string | null)
        : undefined,
    producer_name:
      body.producer_name === null || typeof body.producer_name === "string"
        ? (body.producer_name as string | null)
        : undefined,
    production_company:
      body.production_company === null || typeof body.production_company === "string"
        ? (body.production_company as string | null)
        : undefined,
    description:
      body.description === null || typeof body.description === "string"
        ? (body.description as string | null)
        : undefined,
    project_notes:
      body.project_notes === null || typeof body.project_notes === "string"
        ? (body.project_notes as string | null)
        : undefined,
    start_date:
      body.start_date === null || typeof body.start_date === "string"
        ? (body.start_date as string | null)
        : undefined,
    end_date:
      body.end_date === null || typeof body.end_date === "string"
        ? (body.end_date as string | null)
        : undefined,
  };

  if (process.env.NODE_ENV === "development") {
    console.log("[FilmOps] Project save:", { projectId, payload });
  }

  try {
    const updated = await updateProjectDetailsRecord(supabase, projectId, payload);

    if (process.env.NODE_ENV === "development") {
      console.log("[FilmOps] Project save result:", updated);
    }

    return NextResponse.json({ project: updated });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save project";
    const details =
      error && typeof error === "object" && "details" in error
        ? String((error as { details?: string }).details ?? "")
        : "";
    const hint =
      error && typeof error === "object" && "hint" in error
        ? String((error as { hint?: string }).hint ?? "")
        : "";
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code ?? "")
        : "";

    if (process.env.NODE_ENV === "development") {
      console.warn("[FilmOps] Project save failed:", {
        projectId,
        message,
        details,
        hint,
        code,
      });
    }

    return NextResponse.json(
      { error: `Failed to save project: ${message}` },
      { status: 400 }
    );
  }
}
