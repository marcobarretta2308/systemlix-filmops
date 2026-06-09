import {
  parseProBreakdownChunkJson,
  ScriptBreakdownParseError,
} from "@/lib/ai/script-breakdown-pro";
import {
  assertProjectBreakdownAccess,
  getBreakdownAuthContext,
} from "@/lib/script-breakdown/api-auth";
import { requestOpenAiBreakdownJson } from "@/lib/script-breakdown/openai-breakdown";
import { resolveUnknownError } from "@/lib/script-breakdown/errors";
import {
  fetchScriptBreakdownChunks,
  updateScriptBreakdownChunk,
} from "@/lib/supabase/data";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { isOpenAiConfigured } from "@/lib/ai/script-breakdown";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const auth = await getBreakdownAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isOpenAiConfigured()) {
    return NextResponse.json(
      {
        error: "Chunk analysis failed",
        message:
          "AI service is not configured. Contact your administrator to enable Script Breakdown.",
      },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    runId?: string;
    chunkId?: string;
    totalChunks?: number;
  };

  const client = auth.admin ?? auth.supabase;

  try {
    await assertProjectBreakdownAccess(auth.supabase, auth.user.id, projectId);

    if (!body.runId || !body.chunkId) {
      return NextResponse.json(
        {
          error: "Chunk analysis failed",
          message: "runId and chunkId are required",
        },
        { status: 400 }
      );
    }

    const chunks = await fetchScriptBreakdownChunks(client, body.runId);
    const chunk = chunks.find((c) => c.id === body.chunkId);
    if (!chunk || !chunk.input_text?.trim()) {
      return NextResponse.json(
        {
          error: "Chunk analysis failed",
          message: "Chunk not found or has no input text",
        },
        { status: 404 }
      );
    }

    await updateScriptBreakdownChunk(client, chunk.id, {
      status: "processing",
      error_message: null,
    });

    const { rawJson, model } = await requestOpenAiBreakdownJson(
      chunk.input_text,
      {
        chunkMode: true,
        chunkIndex: chunk.chunk_index,
        totalChunks: body.totalChunks ?? chunks.length,
        sceneRange: chunk.scene_range,
      }
    );

    const breakdown = parseProBreakdownChunkJson(rawJson, chunk.chunk_index);

    await updateScriptBreakdownChunk(client, chunk.id, {
      status: "completed",
      ai_result: breakdown as unknown as Record<string, unknown>,
      error_message: null,
    });

    console.info("[FilmOps AI] Chunk analyzed", {
      project_id: projectId,
      run_id: body.runId,
      chunk_index: chunk.chunk_index,
      model,
      scenes: breakdown.scenes.length,
      input_length: chunk.input_text.length,
    });

    return NextResponse.json({
      chunk_id: chunk.id,
      chunk_index: chunk.chunk_index,
      status: "completed",
      scenes_count: breakdown.scenes.length,
    });
  } catch (err) {
    const resolved = resolveUnknownError(err);
    const message =
      err instanceof ScriptBreakdownParseError
        ? err.message
        : resolved.message.startsWith("OpenAI")
          ? resolved.message
          : `Chunk analysis failed: ${resolved.message}`;

    if (body.chunkId) {
      try {
        await updateScriptBreakdownChunk(client, body.chunkId, {
          status: "failed",
          error_message: message,
        });
      } catch {
        /* ignore persist error */
      }
    }

    if (err instanceof ScriptBreakdownParseError) {
      console.error("[FilmOps AI] Invalid chunk JSON", {
        project_id: projectId,
        chunk_id: body.chunkId,
        parse_error: err.parseError,
        raw_length: err.rawResponse.length,
      });
    } else {
      console.error("[FilmOps AI] Chunk analysis failed", {
        project_id: projectId,
        run_id: body.runId,
        chunk_id: body.chunkId,
        error: err,
        message: resolved.message,
      });
    }

    const chunkIndex =
      body.chunkId != null
        ? (await fetchScriptBreakdownChunks(client, body.runId!).catch(() => []))
            .find((c) => c.id === body.chunkId)?.chunk_index
        : undefined;

    const chunkLabel =
      chunkIndex != null ? chunkIndex + 1 : body.totalChunks ?? "?";

    return NextResponse.json(
      {
        error: "Chunk analysis failed",
        message: `PDF analysis failed at chunk ${chunkLabel}: ${message}`,
        details: resolved.details,
        chunk_id: body.chunkId,
        chunk_index: chunkIndex,
      },
      { status: 500 }
    );
  }
}
