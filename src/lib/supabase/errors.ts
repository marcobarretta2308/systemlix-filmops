export function formatSupabaseError(err: unknown): string {
  if (!err || typeof err !== "object") {
    return "Errore durante il salvataggio scene";
  }

  const e = err as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  const parts = [e.message, e.details, e.hint, e.code].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" — ");
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return "Errore durante il salvataggio scene";
}
