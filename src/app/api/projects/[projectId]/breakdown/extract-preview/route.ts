import { extractScriptFromDocument } from "@/lib/script-breakdown/extract-script";
import {
  assertProjectBreakdownAccess,
  getBreakdownAuthContext,
} from "@/lib/script-breakdown/api-auth";
import { fetchProjectDocumentById } from "@/lib/supabase/data";
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
    documentId?: string;
  };

  if (!body.documentId) {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 }
    );
  }

  const client = auth.admin ?? auth.supabase;

  try {
    await assertProjectBreakdownAccess(auth.supabase, auth.user.id, projectId);

    const doc = await fetchProjectDocumentById(auth.supabase, body.documentId);
    if (!doc || doc.project_id !== projectId) {
      return NextResponse.json(
        { error: "Document not found for this project" },
        { status: 404 }
      );
    }

    const extracted = await extractScriptFromDocument(client, {
      file_path: doc.file_path,
      original_file_name: doc.original_file_name,
      mime_type: doc.mime_type,
      size_bytes: doc.size_bytes,
    });

    if ("error" in extracted) {
      return NextResponse.json({
        ok: false,
        extractionStatus: extracted.extractionStatus,
        message: extracted.error,
        partialText: extracted.partialText,
        file_name: doc.original_file_name,
        mime_type: doc.mime_type,
        file_size: doc.size_bytes,
        estimated_pages: extracted.estimatedPages,
        character_count: extracted.characterCount ?? 0,
      });
    }

    return NextResponse.json({
      ok: true,
      extractionStatus: extracted.extractionStatus,
      file_name: extracted.fileName ?? doc.original_file_name,
      mime_type: doc.mime_type,
      file_size: doc.size_bytes,
      estimated_pages: extracted.estimatedPages,
      character_count: extracted.characterCount,
      detected_scenes_count: extracted.detectedScenesCount,
      estimated_chunks: extracted.estimatedChunks,
      extraction_warning: extracted.extractionWarning,
      preview_text: extracted.text.slice(0, 8000),
      text_length: extracted.text.length,
    });
  } catch (err) {
    console.error("[FilmOps PDF] Extract preview failed", {
      project_id: projectId,
      document_id: body.documentId,
      error: err instanceof Error ? err.message : err,
    });
    return NextResponse.json(
      {
        error: "PDF text extraction failed",
        message: formatSupabaseError(err),
      },
      { status: 500 }
    );
  }
}
