import type { ProBreakdownResult } from "@/lib/ai/script-breakdown-pro";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureProjectEditorAccess,
  fetchProjectBreakdownEntities,
  insertScriptBreakdownRun,
} from "@/lib/supabase/data";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  formatSaveSummary,
  saveBreakdownToProjectDb,
  type SaveBreakdownOptions,
} from "@/lib/script-breakdown/save-to-project";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    breakdown?: ProBreakdownResult;
    options?: Partial<SaveBreakdownOptions>;
    scriptRevisionId?: string | null;
    inputType?: string;
  };

  if (!body.breakdown?.scenes?.length) {
    return NextResponse.json(
      { error: "No breakdown scenes to save." },
      { status: 400 }
    );
  }

  const options: SaveBreakdownOptions = {
    createScenes: body.options?.createScenes ?? true,
    updateExistingScenes: body.options?.updateExistingScenes ?? false,
    createCharacters: body.options?.createCharacters ?? false,
    createLocations: body.options?.createLocations ?? false,
    applyDepartmentNotes: body.options?.applyDepartmentNotes ?? false,
  };

  const admin = createAdminClient();
  const client = admin ?? supabase;

  try {
    if (!admin) {
      await ensureProjectEditorAccess(supabase, user.id, projectId);
    }

    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .select("company_id, workspace_id")
      .eq("id", projectId)
      .single();
    if (projectErr) throw projectErr;

    const existing = await fetchProjectBreakdownEntities(client, projectId);
    const summary = await saveBreakdownToProjectDb(
      client,
      projectId,
      body.breakdown,
      options,
      existing
    );

    await insertScriptBreakdownRun(client, {
      company_id: project.company_id,
      workspace_id: project.workspace_id,
      project_id: projectId,
      script_revision_id: body.scriptRevisionId ?? null,
      status: "saved",
      input_type: body.inputType ?? "review_save",
      ai_result: body.breakdown as unknown as Record<string, unknown>,
      created_by: user.id,
    });

    return NextResponse.json({
      summary,
      message: formatSaveSummary(summary),
    });
  } catch (err) {
    console.error("[FilmOps] save breakdown error:", err);
    const message = formatSupabaseError(err);
    return NextResponse.json(
      { error: `Save breakdown failed: ${message}` },
      { status: 500 }
    );
  }
}
