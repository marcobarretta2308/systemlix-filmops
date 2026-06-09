import { approveLocationSuggestion } from "@/lib/locations/suggestion-actions";
import {
  assertProjectBreakdownAccess,
  getBreakdownAuthContext,
} from "@/lib/script-breakdown/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatSupabaseError } from "@/lib/supabase/errors";
import type { Scene } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string; suggestionId: string }> }
) {
  const { projectId, suggestionId } = await context.params;
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
    const result = await approveLocationSuggestion(
      client,
      projectId,
      suggestionId,
      scenes
    );

    return NextResponse.json({
      ok: true,
      message: `Location approved with ${result.linksCreated} scene links.`,
      ...result,
    });
  } catch (err) {
    console.error("[FilmOps] approve suggestion error:", err);
    return NextResponse.json(
      {
        error: "Approve suggestion failed",
        message: formatSupabaseError(err),
      },
      { status: 500 }
    );
  }
}
