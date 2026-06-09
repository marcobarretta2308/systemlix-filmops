import {
  CHUNKED_SCRIPT_MAX_CHARS,
  SINGLE_SHOT_MAX_CHARS,
} from "@/lib/script-breakdown/config";
import { shouldRequireChunkedPipeline } from "@/lib/script-breakdown/chunking";

export const SCRIPT_MIN_LENGTH = 100;
/** Legacy single-shot cap; chunked pipeline allows longer scripts. */
export const SCRIPT_MAX_LENGTH = SINGLE_SHOT_MAX_CHARS;
export const CHUNKED_MAX_LENGTH = CHUNKED_SCRIPT_MAX_CHARS;

export type ResolvedError = {
  message: string;
  details: string | null;
  stack: string | null;
};

export function resolveUnknownError(error: unknown): ResolvedError {
  if (error instanceof Error) {
    const withDetails = error as Error & { details?: unknown };
    return {
      message: error.message.trim() || "Unknown error",
      details:
        typeof withDetails.details === "string"
          ? withDetails.details
          : null,
      stack: error.stack ?? null,
    };
  }

  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    const nested =
      obj.error && typeof obj.error === "object"
        ? (obj.error as Record<string, unknown>)
        : null;

    const message = String(
      nested?.message ??
        obj.message ??
        obj.error ??
        obj.details ??
        obj.hint ??
        "Unknown error"
    ).trim();

    const details = [obj.details, obj.hint, obj.code, nested?.type]
      .filter((value) => value != null && String(value).trim())
      .map((value) => String(value))
      .join(" · ");

    return {
      message: message || "Unknown error",
      details: details || null,
      stack: null,
    };
  }

  return {
    message: String(error).trim() || "Unknown error",
    details: null,
    stack: null,
  };
}

export function validateScriptInputLength(
  scriptText: string,
  options?: { sceneCount?: number; estimatedPages?: number }
): { ok: true; chunked: boolean } | { ok: false; message: string } {
  const length = scriptText.trim().length;
  if (length < SCRIPT_MIN_LENGTH) {
    return {
      ok: false,
      message: "Paste at least 100 characters of script text.",
    };
  }

  if (length > CHUNKED_MAX_LENGTH) {
    return {
      ok: false,
      message:
        "Script exceeds maximum supported length. Please split the script into parts.",
    };
  }

  const chunked = shouldRequireChunkedPipeline({
    charCount: length,
    sceneCount: options?.sceneCount,
    estimatedPages: options?.estimatedPages,
  });

  return { ok: true, chunked };
}

export function formatBreakdownApiError(
  error: unknown,
  fallbackMessage = "An unexpected error occurred"
): { error: string; message: string; details: string | null } {
  const resolved = resolveUnknownError(error);
  return {
    error: "Script breakdown failed",
    message: resolved.message || fallbackMessage,
    details: resolved.details ?? resolved.stack,
  };
}
