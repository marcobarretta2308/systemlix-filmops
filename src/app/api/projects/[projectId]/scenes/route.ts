import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProjectEditorAccess, insertScenes } from "@/lib/supabase/data";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import type { Complexity } from "@/lib/types";
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
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    scenes?: Array<Record<string, unknown>>;
  };

  if (!Array.isArray(body.scenes) || body.scenes.length === 0) {
    return NextResponse.json({ error: "Nessuna scena da salvare." }, { status: 400 });
  }

  const toInsert = body.scenes.map((s) => ({
    project_id: projectId,
    scene_number: String(s.scene_number ?? ""),
    int_ext: (s.int_ext as "INT" | "EXT") ?? "INT",
    day_night: (s.day_night as "DAY" | "NIGHT") ?? "DAY",
    location: String(s.location ?? ""),
    short_description: String(s.short_description ?? ""),
    characters: (s.characters as string[]) ?? [],
    props: (s.props as string[]) ?? [],
    costumes: (s.costumes as string[]) ?? [],
    vfx: (s.vfx as string[]) ?? [],
    stunts: (s.stunts as string[]) ?? [],
    vehicles: (s.vehicles as string[]) ?? [],
    animals: (s.animals as string[]) ?? [],
    special_requirements: (s.special_requirements as string[]) ?? [],
    complexity: (s.complexity as Complexity) ?? "medium",
    production_notes: String(s.production_notes ?? ""),
  }));

  const admin = createAdminClient();
  const client = admin ?? supabase;

  try {
    if (!admin) {
      await ensureProjectEditorAccess(supabase, user.id, projectId);
    }
    const created = await insertScenes(client, toInsert);
    return NextResponse.json({ scenes: created, saved: created.length });
  } catch (err) {
    console.error("[FilmOps] API insertScenes error:", err);
    const message = formatSupabaseError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
