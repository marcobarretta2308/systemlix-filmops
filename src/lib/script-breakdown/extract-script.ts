import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { chunkSceneBlocks } from "@/lib/script-breakdown/chunking";
import {
  normalizePdfExtractedText,
  normalizeScriptText,
} from "@/lib/script-breakdown/normalize-script";
import { extractTextFromPdfBuffer } from "@/lib/script-breakdown/pdf-extract";
import { countLikelySceneHeadings } from "@/lib/script-breakdown/scene-detection";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ScriptExtractionResult = {
  text: string;
  fileName?: string;
  estimatedPages?: number;
  characterCount: number;
  detectedScenesCount: number;
  estimatedChunks: number;
  source: "paste" | "txt" | "pdf";
  extractionStatus: "success" | "empty" | "failed";
  extractionWarning?: string;
};

export type ScriptExtractionError = {
  error: string;
  partialText?: string;
  estimatedPages?: number;
  characterCount?: number;
  extractionStatus: "empty" | "failed";
};

export async function extractScriptFromDocument(
  supabase: SupabaseClient,
  document: {
    file_path: string;
    original_file_name: string;
    mime_type: string | null;
    size_bytes?: number | null;
  }
): Promise<ScriptExtractionResult | ScriptExtractionError> {
  const logMeta = {
    file_name: document.original_file_name,
    mime_type: document.mime_type,
    file_size: document.size_bytes,
  };

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .download(document.file_path);

  if (downloadError || !fileData) {
    console.error("[FilmOps PDF] Download failed", {
      ...logMeta,
      error: downloadError?.message,
    });
    return {
      error: `PDF text extraction failed: ${downloadError?.message ?? "Could not download file"}`,
      extractionStatus: "failed",
    };
  }

  const buffer = await fileData.arrayBuffer();
  const lower = document.original_file_name.toLowerCase();
  const isPdf =
    lower.endsWith(".pdf") || document.mime_type === "application/pdf";
  const isDocx =
    lower.endsWith(".docx") ||
    lower.endsWith(".doc") ||
    document.mime_type?.includes("wordprocessingml") ||
    document.mime_type === "application/msword";

  if (isDocx) {
    return {
      error:
        "DOCX extraction is not supported server-side. Save as TXT/PDF or paste the script manually.",
      extractionStatus: "failed",
    };
  }

  if (isPdf) {
    const pdf = await extractTextFromPdfBuffer(buffer, {
      fileName: document.original_file_name,
      mimeType: document.mime_type ?? undefined,
      fileSize: document.size_bytes ?? undefined,
    });

    if (!pdf.ok) {
      return {
        error: pdf.message,
        partialText: pdf.partialText,
        estimatedPages: pdf.estimatedPages,
        characterCount: pdf.characterCount,
        extractionStatus: pdf.extractionStatus,
      };
    }

    const text = normalizePdfExtractedText(pdf.text);
    const chunks = chunkSceneBlocks(text, {
      estimatedPages: pdf.estimatedPages,
      detectedSceneHeadings: pdf.detectedScenesCount,
    });

    return {
      text,
      fileName: document.original_file_name,
      estimatedPages: pdf.estimatedPages,
      characterCount: pdf.characterCount,
      detectedScenesCount: pdf.detectedScenesCount,
      estimatedChunks: chunks.length,
      source: "pdf",
      extractionStatus: "success",
      extractionWarning: pdf.extractionWarning,
    };
  }

  const text = normalizeScriptText(await fileData.text());
  if (text.length < 100) {
    return {
      error:
        "No readable text found in this file. Please paste the script manually.",
      partialText: text.length > 0 ? text : undefined,
      characterCount: text.length,
      extractionStatus: "empty",
    };
  }

  const detectedScenesCount = countLikelySceneHeadings(text);
  const chunks = chunkSceneBlocks(text, {
    detectedSceneHeadings: detectedScenesCount,
  });

  return {
    text,
    fileName: document.original_file_name,
    characterCount: text.length,
    detectedScenesCount,
    estimatedChunks: chunks.length,
    source: "txt",
    extractionStatus: "success",
  };
}
