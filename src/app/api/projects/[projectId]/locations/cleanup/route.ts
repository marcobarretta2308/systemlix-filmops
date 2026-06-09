import { cleanupGeneratedLocations } from "@/lib/locations/cleanup";
import {
  assertProjectBreakdownAccess,
  getBreakdownAuthContext,
} from "@/lib/script-breakdown/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatSupabaseError } from "@/lib/supabase/errors";
import type { Scene } from "@/lib/types";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const auth = await getBreakdownAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const client = auth.admin ?? createAdminClient() ?? auth.supabase;

  try {
    await assertProjectBreakdownAccess(auth.supabase, auth.user.id, projectId);

    const scenesRes = await client
      .from("scenes")
      .select("*")
      .eq("project_id", projectId);
    if (scenesRes.error) throw scenesRes.error;

    const scenes = (scenesRes.data ?? []) as Scene[];
    const summary = await cleanupGeneratedLocations(client, projectId, scenes);

    return NextResponse.json({
      ok: true,
      message: `Cleanup: ${summary.movedToSuggestions} moved to suggestions, ${summary.archivedOrphans} archived, ${summary.mergedDuplicates} duplicates merged, ${summary.countsUpdated} counts updated.`,
      summary,
    });
  } catch (err) {
    console.error("[FilmOps] cleanup locations error:", err);
    return NextResponse.json(
      {
        error: "Cleanup locations failed",
        message: formatSupabaseError(err),
      },
      { status: 500 }
    );
  }
}
