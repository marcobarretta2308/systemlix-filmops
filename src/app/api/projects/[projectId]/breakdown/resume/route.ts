import {
  assertProjectBreakdownAccess,
  getBreakdownAuthContext,
} from "@/lib/script-breakdown/api-auth";
import { fetchScriptBreakdownChunks } from "@/lib/supabase/data";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const auth = await getBreakdownAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const runId = new URL(request.url).searchParams.get("runId");
  if (!runId) {
    return NextResponse.json(
      { error: "runId query parameter is required" },
      { status: 400 }
    );
  }

  const client = auth.admin ?? auth.supabase;

  try {
    await assertProjectBreakdownAccess(auth.supabase, auth.user.id, projectId);
    const chunks = await fetchScriptBreakdownChunks(client, runId);

    return NextResponse.json({
      run_id: runId,
      chunks: chunks.map((c) => ({
        id: c.id,
        chunk_index: c.chunk_index,
        scene_range: c.scene_range,
        status: c.status,
        error_message: c.error_message,
      })),
      completed: chunks.filter((c) => c.status === "completed").length,
      failed: chunks.filter((c) => c.status === "failed").length,
      pending: chunks.filter((c) => c.status === "pending").length,
      total: chunks.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}
