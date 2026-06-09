import { PDF_MIN_EXTRACTED_CHARS } from "@/lib/script-breakdown/config";
import { normalizePdfExtractedText } from "@/lib/script-breakdown/normalize-script";
import { countLikelySceneHeadings } from "@/lib/script-breakdown/scene-detection";

export type PdfExtractionStatus = "success" | "empty" | "failed";

export type PdfExtractSuccess = {
  ok: true;
  extractionStatus: "success";
  text: string;
  estimatedPages: number;
  characterCount: number;
  detectedScenesCount: number;
  extractionWarning?: string;
};

export type PdfExtractFailure = {
  ok: false;
  extractionStatus: "empty" | "failed";
  message: string;
  partialText?: string;
  estimatedPages?: number;
  characterCount?: number;
  extractionWarning?: string;
};

export type PdfExtractResult = PdfExtractSuccess | PdfExtractFailure;

const SCANNED_PDF_MESSAGE =
  "Could not extract readable text from this PDF. It may be scanned. Upload a text-based PDF or paste the script manually.";

export async function extractTextFromPdfBuffer(
  buffer: ArrayBuffer,
  meta?: { fileName?: string; mimeType?: string; fileSize?: number }
): Promise<PdfExtractResult> {
  const logBase = {
    file_name: meta?.fileName,
    mime_type: meta?.mimeType,
    file_size: meta?.fileSize,
  };

  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    const merged = Array.isArray(text)
      ? text.join("\n\n")
      : String(text ?? "");

    const normalized = normalizePdfExtractedText(merged);
    const estimatedPages = totalPages ?? 0;

    console.info("[FilmOps PDF] Extraction complete", {
      ...logBase,
      page_count: estimatedPages,
      extracted_char_count: normalized.length,
      detected_scenes: countLikelySceneHeadings(normalized),
    });

    if (normalized.length < PDF_MIN_EXTRACTED_CHARS) {
      const partial = normalized.length > 0 ? normalized : undefined;
      return {
        ok: false,
        extractionStatus: "empty",
        message: partial
          ? "No readable text found in this PDF."
          : SCANNED_PDF_MESSAGE,
        partialText: partial,
        estimatedPages,
        characterCount: normalized.length,
        extractionWarning: partial
          ? "Very little text extracted — PDF may be scanned or image-based."
          : undefined,
      };
    }

    const detectedScenesCount = countLikelySceneHeadings(normalized);
    const extractionWarning =
      detectedScenesCount === 0
        ? "No scene headings detected — verify sluglines after extraction."
        : undefined;

    return {
      ok: true,
      extractionStatus: "success",
      text: normalized,
      estimatedPages,
      characterCount: normalized.length,
      detectedScenesCount,
      extractionWarning,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown PDF extraction error";
    console.error("[FilmOps PDF] Extraction failed", {
      ...logBase,
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return {
      ok: false,
      extractionStatus: "failed",
      message: `PDF text extraction failed: ${message}`,
    };
  }
}

/** Alias for requirement naming. */
export const extractTextFromPdf = extractTextFromPdfBuffer;
