import type { PostgrestError } from "@supabase/supabase-js";

export function isPostgrestError(err: unknown): err is PostgrestError {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as PostgrestError).message === "string"
  );
}

export function isRlsError(err: unknown): boolean {
  if (!isPostgrestError(err)) return false;
  const msg = err.message.toLowerCase();
  return (
    err.code === "42501" ||
    err.code === "PGRST301" ||
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("violates row-level security")
  );
}

export function formatSupabaseError(err: unknown): string {
  if (isPostgrestError(err)) {
    const parts = [err.message];
    if (err.details) parts.push(err.details);
    if (err.hint) parts.push(`Hint: ${err.hint}`);
    if (err.code) parts.push(`(${err.code})`);
    const base = parts.join(" — ");
    return isRlsError(err) ? `RLS policy denied — ${base}` : base;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function logSupabaseError(
  context: string,
  err: unknown,
  extra?: Record<string, unknown>
): void {
  if (isPostgrestError(err)) {
    console.error(`[FilmOps] ${context}`, {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code,
      ...extra,
    });
    return;
  }
  console.error(`[FilmOps] ${context}`, err, extra ?? {});
}
