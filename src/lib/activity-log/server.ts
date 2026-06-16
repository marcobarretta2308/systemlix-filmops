import type {
  ActivityLogEntry,
  ActivityLogFilters,
  LogActivityInput,
} from "@/lib/activity-log/types";
import { mapProjectMember } from "@/lib/supabase/mappers";
import type { SupabaseClient } from "@supabase/supabase-js";

function mapActivityLogRow(row: Record<string, unknown>): ActivityLogEntry {
  return {
    id: row.id as string,
    company_id: (row.company_id as string | null) ?? null,
    workspace_id: (row.workspace_id as string | null) ?? null,
    project_id: row.project_id as string,
    user_id: (row.user_id as string | null) ?? null,
    user_email: (row.user_email as string | null) ?? null,
    user_name: (row.user_name as string | null) ?? null,
    department: (row.department as string | null) ?? null,
    role: (row.role as string | null) ?? null,
    action: row.action as string,
    area: row.area as string,
    entity_type: (row.entity_type as string | null) ?? null,
    entity_id: (row.entity_id as string | null) ?? null,
    entity_label: (row.entity_label as string | null) ?? null,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    ip_address: (row.ip_address as string | null) ?? null,
    user_agent: (row.user_agent as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

export function resolveClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

async function resolveProjectContext(
  supabase: SupabaseClient,
  projectId: string
) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, company_id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  return data as {
    id: string;
    company_id: string;
    workspace_id: string;
  } | null;
}

async function resolveActorContext(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  userEmail?: string | null
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const { data: memberRow } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("access_status", "active")
    .maybeSingle();

  const member = memberRow ? mapProjectMember(memberRow) : null;

  return {
    user_email: profile?.email ?? userEmail ?? null,
    user_name: profile?.full_name ?? null,
    department: member?.department ?? null,
    role: member?.role ?? null,
  };
}

export async function insertActivityLog(
  supabase: SupabaseClient,
  request: Request,
  userId: string,
  userEmail: string | undefined,
  input: LogActivityInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const project = await resolveProjectContext(supabase, input.projectId);
  if (!project) {
    return { ok: false, error: "Progetto non trovato" };
  }

  const actor = await resolveActorContext(
    supabase,
    input.projectId,
    userId,
    userEmail
  );

  const { error } = await supabase.from("activity_logs").insert({
    company_id: project.company_id,
    workspace_id: project.workspace_id,
    project_id: input.projectId,
    user_id: userId,
    user_email: actor.user_email,
    user_name: actor.user_name,
    department: actor.department,
    role: actor.role,
    action: input.action,
    area: input.area,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    entity_label: input.entityLabel ?? null,
    metadata: input.metadata ?? {},
    ip_address: resolveClientIp(request),
    user_agent: request.headers.get("user-agent"),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function fetchActivityLogs(
  supabase: SupabaseClient,
  projectId: string,
  filters: ActivityLogFilters = {}
): Promise<{ logs: ActivityLogEntry[]; total: number }> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);

  let query = supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (filters.department && filters.department !== "all") {
    query = query.eq("department", filters.department);
  }
  if (filters.userId && filters.userId !== "all") {
    query = query.eq("user_id", filters.userId);
  }
  if (filters.action && filters.action !== "all") {
    query = query.eq("action", filters.action);
  }
  if (filters.area && filters.area !== "all") {
    query = query.eq("area", filters.area);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    query = query.or(
      [
        `user_name.ilike.%${q}%`,
        `user_email.ilike.%${q}%`,
        `entity_label.ilike.%${q}%`,
        `action.ilike.%${q}%`,
        `area.ilike.%${q}%`,
      ].join(",")
    );
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    logs: (data ?? []).map((row) =>
      mapActivityLogRow(row as Record<string, unknown>)
    ),
    total: count ?? 0,
  };
}
