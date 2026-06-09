import { ignoreLocationSuggestion } from "@/lib/locations/suggestion-actions";
import {
  assertProjectBreakdownAccess,
  getBreakdownAuthContext,
} from "@/lib/script-breakdown/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string; suggestionId: string }> }
) {
  const { projectId, suggestionId } = await context.params;
  const auth = await getBreakdownAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const client = auth.admin ?? createAdminClient() ?? auth.supabase;

  try {
    await assertProjectBreakdownAccess(auth.supabase, auth.user.id, projectId);
    await ignoreLocationSuggestion(client, projectId, suggestionId);

    return NextResponse.json({
      ok: true,
      message: "Suggestion archived.",
    });
  } catch (err) {
    console.error("[FilmOps] ignore suggestion error:", err);
    return NextResponse.json(
      {
        error: "Ignore suggestion failed",
        message: formatSupabaseError(err),
      },
      { status: 500 }
    );
  }
}
