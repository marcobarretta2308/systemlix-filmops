import { rebuildLocationsFromScenes } from "@/lib/locations/rebuild";
import {
  assertProjectBreakdownAccess,
  getBreakdownAuthContext,
} from "@/lib/script-breakdown/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatSupabaseError } from "@/lib/supabase/errors";
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
    const summary = await rebuildLocationsFromScenes(client, projectId);

    return NextResponse.json({
      ok: true,
      message: `${summary.activeLocations} active locations, ${summary.archivedSuggestions + summary.orphansArchived} archived suggestions, ${summary.sceneLinksRebuilt} scene links rebuilt.`,
      summary,
    });
  } catch (err) {
    console.error("[FilmOps] rebuild locations error:", err);
    return NextResponse.json(
      {
        error: "Rebuild locations failed",
        message: formatSupabaseError(err),
      },
      { status: 500 }
    );
  }
}
