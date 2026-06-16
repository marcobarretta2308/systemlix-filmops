import { canViewActivityLog } from "@/lib/activity-log/permissions";
import {
  fetchActivityLogs,
  insertActivityLog,
} from "@/lib/activity-log/server";
import { mapProfile, mapProjectMember } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRole } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function resolveAccessContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string
) {
  const [{ data: profileRow }, { data: memberRow }, { data: companyMemberRow }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("access_status", "active")
        .maybeSingle(),
      supabase
        .from("company_members")
        .select("role, company_id")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);

  const user = profileRow ? mapProfile(profileRow) : null;
  const membership = memberRow ? mapProjectMember(memberRow) : null;

  let companyRole: CompanyRole = "viewer";
  if (user?.global_role === "platform_owner") {
    companyRole = "platform_owner";
  } else if (companyMemberRow?.length) {
    const { data: projectRow } = await supabase
      .from("projects")
      .select("company_id")
      .eq("id", projectId)
      .maybeSingle();
    const match = companyMemberRow.find(
      (row) => row.company_id === projectRow?.company_id
    );
    if (match?.role) {
      companyRole = match.role as CompanyRole;
    }
  }

  return { user, membership, companyRole };
}

function parseFilters(url: URL) {
  return {
    department: url.searchParams.get("department") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    area: url.searchParams.get("area") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? "50"),
    offset: Number(url.searchParams.get("offset") ?? "0"),
  };
}

export async function GET(
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

  const { user, membership, companyRole } = await resolveAccessContext(
    supabase,
    projectId,
    authUser.id
  );

  if (!canViewActivityLog(user, companyRole, membership?.role)) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  try {
    const filters = parseFilters(new URL(request.url));
    const result = await fetchActivityLogs(supabase, projectId, filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[FilmOps] Activity log fetch error:", error);
    return NextResponse.json(
      { error: "Impossibile caricare activity log" },
      { status: 500 }
    );
  }
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
    action?: string;
    area?: string;
    entityType?: string;
    entityId?: string;
    entityLabel?: string;
    metadata?: Record<string, unknown>;
  };

  if (!body.action?.trim() || !body.area?.trim()) {
    return NextResponse.json({ error: "action e area richiesti" }, { status: 400 });
  }

  const result = await insertActivityLog(supabase, request, user.id, user.email, {
    projectId,
    action: body.action.trim(),
    area: body.area.trim(),
    entityType: body.entityType,
    entityId: body.entityId,
    entityLabel: body.entityLabel,
    metadata: body.metadata,
  });

  if (!result.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[FilmOps] Activity log insert failed:", result.error);
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
