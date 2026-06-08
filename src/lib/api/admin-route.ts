import {
  ADMIN_KEY_ERROR,
  ADMIN_URL_ERROR,
  ADMIN_WRONG_KEY_ERROR,
} from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const CONFIG_ERRORS = [ADMIN_KEY_ERROR, ADMIN_URL_ERROR, ADMIN_WRONG_KEY_ERROR];

export function adminRouteErrorResponse(
  context: string,
  error: unknown,
  fallbackMessage: string
): NextResponse {
  if (error && typeof error === "object" && "message" in error) {
    const supabaseError = error as {
      message?: string;
      status?: number;
      code?: string;
      name?: string;
    };
    console.error(`[FilmOps Admin] ${context}`, {
      message: supabaseError.message,
      status: supabaseError.status,
      code: supabaseError.code,
      name: supabaseError.name,
    });
  } else {
    console.error(`[FilmOps Admin] ${context}:`, error);
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  const status = CONFIG_ERRORS.some((fragment) => message.includes(fragment))
    ? 503
    : 500;

  return NextResponse.json({ error: message }, { status });
}
