import type { ProBreakdownResult } from "@/lib/ai/script-breakdown-pro";
import {
  assertProjectBreakdownAccess,
  getBreakdownAuthContext,
} from "@/lib/script-breakdown/api-auth";
import { mergeChunkResults } from "@/lib/script-breakdown/merge-breakdown";
import { validateBreakdownCompleteness } from "@/lib/script-breakdown/quality-check";
import {
  fetchScriptBreakdownChunks,
  insertScriptBreakdownQualityCheck,
  updateScriptBreakdownRun,
} from "@/lib/supabase/data";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const auth = await getBreakdownAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    runId?: string;
    scriptRevisionId?: string | null;
    extraction?: Record<string, unknown>;
    allowPartial?: boolean;
  };

  const client = auth.admin ?? auth.supabase;

  try {
    await assertProjectBreakdownAccess(auth.supabase, auth.user.id, projectId);

    if (!body.runId) {
      return NextResponse.json(
        {
          error: "Merge breakdown failed",
          message: "runId is required",
        },
        { status: 400 }
      );
    }

    const chunks = await fetchScriptBreakdownChunks(client, body.runId);
    const completed = chunks.filter((c) => c.status === "completed" && c.ai_result);
    const failed = chunks.filter((c) => c.status === "failed");

    if (completed.length === 0) {
      return NextResponse.json(
        {
          error: "Merge breakdown failed",
          message: "No completed chunks to merge",
        },
        { status: 400 }
      );
    }

    if (failed.length > 0 && !body.allowPartial) {
      return NextResponse.json(
        {
          error: "Merge breakdown failed",
          message: `${failed.length} chunk(s) failed. Retry failed chunks or continue with partial results.`,
          failed_chunks: failed.map((c) => ({
            chunk_index: c.chunk_index,
            error: c.error_message,
            id: c.id,
          })),
          can_continue_partial: true,
        },
        { status: 409 }
      );
    }

    const chunkResults = completed.map(
      (c) => c.ai_result as unknown as ProBreakdownResult
    );

    const merged = mergeChunkResults(chunkResults, {
      totalChunksPlanned: chunks.length,
      chunksCompleted: completed.length,
      failedChunks: failed.map((c) => ({
        chunk_index: c.chunk_index,
        error: c.error_message ?? "Unknown error",
      })),
      chunkSummaries: chunks.map((c) => ({
        chunk_index: c.chunk_index,
        scene_range: c.scene_range,
        status: c.status,
        scenes_count:
          c.status === "completed" && c.ai_result
            ? ((c.ai_result as { scenes?: unknown[] }).scenes?.length ?? 0)
            : undefined,
      })),
    });

    const quality_check = validateBreakdownCompleteness(merged, {
      incompleteChunks: failed.length,
    });

    merged.quality_check = quality_check;
    if (body.extraction) {
      merged.extraction_meta = body.extraction as ProBreakdownResult["extraction_meta"];
    }
    merged.script_revision_id = body.scriptRevisionId ?? null;
    merged.breakdown_run_id = body.runId;

    await updateScriptBreakdownRun(client, body.runId, {
      status: failed.length > 0 ? "partial" : "completed",
      ai_result: merged as unknown as Record<string, unknown>,
    });

    try {
      await insertScriptBreakdownQualityCheck(client, {
        run_id: body.runId,
        project_id: projectId,
        quality_status: quality_check.quality_status,
        issues: quality_check.issues as unknown as Record<string, unknown>[],
      });
    } catch (persistErr) {
      console.error("[FilmOps AI] Quality check persist failed (non-fatal)", persistErr);
    }

    console.info("[FilmOps AI] Breakdown merged", {
      project_id: projectId,
      run_id: body.runId,
      scenes: merged.scenes.length,
      chunks_completed: completed.length,
      chunks_failed: failed.length,
      quality: quality_check.quality_status,
    });

    return NextResponse.json(merged);
  } catch (err) {
    console.error("[FilmOps AI] Merge breakdown failed", {
      project_id: projectId,
      run_id: body.runId,
      error: err,
    });
    return NextResponse.json(
      {
        error: "Merge breakdown failed",
        message: formatSupabaseError(err),
      },
      { status: 500 }
    );
  }
}
