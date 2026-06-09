import { chunkSceneBlocks } from "@/lib/script-breakdown/chunking";
import {
  CHUNKED_SCRIPT_MAX_CHARS,
  LARGE_SCRIPT_WARNING_CHARS,
} from "@/lib/script-breakdown/config";
import { validateScriptInputLength } from "@/lib/script-breakdown/errors";
import { extractScriptFromDocument } from "@/lib/script-breakdown/extract-script";
import { normalizeScriptText } from "@/lib/script-breakdown/normalize-script";
import { countLikelySceneHeadings } from "@/lib/script-breakdown/scene-detection";
import {
  assertProjectBreakdownAccess,
  getBreakdownAuthContext,
} from "@/lib/script-breakdown/api-auth";
import {
  fetchProjectDocumentById,
  insertScriptBreakdownChunks,
  insertScriptBreakdownRun,
  insertScriptRevision,
} from "@/lib/supabase/data";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { NextResponse } from "next/server";

export const maxDuration = 60;

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
    scriptText?: string;
    documentId?: string | null;
    inputType?: "paste" | "upload";
    revisionName?: string | null;
    revisionDate?: string | null;
  };

  const client = auth.admin ?? auth.supabase;

  try {
    const project = await assertProjectBreakdownAccess(
      auth.supabase,
      auth.user.id,
      projectId
    );

    let scriptText = body.scriptText?.trim() ?? "";
    let fileName: string | undefined;
    let estimatedPages: number | undefined;
    let source: "paste" | "txt" | "pdf" = "paste";
    let extractionWarning: string | undefined;

    if (body.documentId) {
      const doc = await fetchProjectDocumentById(auth.supabase, body.documentId);
      if (!doc || doc.project_id !== projectId) {
        return NextResponse.json(
          {
            error: "Prepare breakdown failed",
            message: "Document not found for this project",
          },
          { status: 404 }
        );
      }

      console.info("[FilmOps PDF] Prepare extraction start", {
        project_id: projectId,
        document_id: body.documentId,
        file_name: doc.original_file_name,
        mime_type: doc.mime_type,
        file_size: doc.size_bytes,
      });

      const extracted = await extractScriptFromDocument(client, {
        file_path: doc.file_path,
        original_file_name: doc.original_file_name,
        mime_type: doc.mime_type,
        size_bytes: doc.size_bytes,
      });

      if ("error" in extracted) {
        console.warn("[FilmOps PDF] Prepare extraction failed", {
          project_id: projectId,
          document_id: body.documentId,
          file_name: doc.original_file_name,
          mime_type: doc.mime_type,
          file_size: doc.size_bytes,
          extraction_status: extracted.extractionStatus,
          extracted_char_count: extracted.characterCount ?? 0,
          error: extracted.error,
        });
        return NextResponse.json(
          {
            error: "Prepare breakdown failed",
            message: extracted.error,
            extractionStatus: extracted.extractionStatus,
            partialText: extracted.partialText,
          },
          { status: 400 }
        );
      }

      if (!scriptText) {
        scriptText = extracted.text;
      }
      fileName = extracted.fileName;
      estimatedPages = extracted.estimatedPages;
      source = extracted.source;
      extractionWarning = extracted.extractionWarning;
    }

    scriptText = normalizeScriptText(scriptText);
    const lengthCheck = validateScriptInputLength(scriptText);
    if (!lengthCheck.ok) {
      return NextResponse.json(
        { error: "Prepare breakdown failed", message: lengthCheck.message },
        { status: 400 }
      );
    }

    if (scriptText.length > CHUNKED_SCRIPT_MAX_CHARS) {
      return NextResponse.json(
        {
          error: "Prepare breakdown failed",
          message:
            "Script exceeds maximum supported length. Please split the script into parts.",
        },
        { status: 400 }
      );
    }

    const detectedScenesCount = countLikelySceneHeadings(scriptText);
    const chunks = chunkSceneBlocks(scriptText, {
      estimatedPages,
      detectedSceneHeadings: detectedScenesCount,
    });

    const revision = await insertScriptRevision(client, {
      company_id: project.company_id,
      workspace_id: project.workspace_id,
      project_id: projectId,
      document_id: body.documentId ?? null,
      revision_name: body.revisionName ?? "Script breakdown",
      revision_date: body.revisionDate ?? new Date().toISOString().slice(0, 10),
      script_text: scriptText.slice(0, 500000),
      ai_summary: {
        character_count: scriptText.length,
        detected_scenes: detectedScenesCount,
        chunk_count: chunks.length,
      },
      created_by: auth.user.id,
    });

    const run = await insertScriptBreakdownRun(client, {
      company_id: project.company_id,
      workspace_id: project.workspace_id,
      project_id: projectId,
      script_revision_id: revision.id,
      status: "processing",
      input_type: body.inputType ?? "paste",
      ai_result: null,
      created_by: auth.user.id,
    });

    const chunkRows = await insertScriptBreakdownChunks(
      client,
      chunks.map((chunk) => ({
        run_id: run.id,
        project_id: projectId,
        chunk_index: chunk.chunk_index,
        scene_range: chunk.scene_range,
        input_text: chunk.input_text,
        status: "pending",
      }))
    );

    console.info("[FilmOps AI] Breakdown prepared", {
      project_id: projectId,
      run_id: run.id,
      file_name: fileName,
      mime_type: body.documentId ? "vault" : undefined,
      extracted_char_count: scriptText.length,
      page_count: estimatedPages,
      chunk_count: chunks.length,
      detected_scenes: detectedScenesCount,
      input_type: body.inputType,
      source,
    });

    return NextResponse.json({
      run_id: run.id,
      script_revision_id: revision.id,
      total_chunks: chunks.length,
      chunks: chunkRows.map((row) => ({
        id: row.id,
        chunk_index: row.chunk_index,
        scene_range: chunks[row.chunk_index]?.scene_range ?? null,
        status: "pending",
      })),
      extraction: {
        file_name: fileName,
        estimated_pages: estimatedPages,
        character_count: scriptText.length,
        detected_scenes_count: detectedScenesCount,
        chunk_count: chunks.length,
        large_script_warning: scriptText.length >= LARGE_SCRIPT_WARNING_CHARS,
        extraction_warning: extractionWarning,
      },
      script_text_length: scriptText.length,
    });
  } catch (err) {
    console.error("[FilmOps AI] Prepare breakdown failed", {
      project_id: projectId,
      error: err,
    });
    return NextResponse.json(
      {
        error: "Prepare breakdown failed",
        message: formatSupabaseError(err),
      },
      { status: 500 }
    );
  }
}
