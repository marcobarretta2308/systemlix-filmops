import { buildProductionPackData } from "@/lib/production-pack/build-data";
import { canGenerateProductionPack } from "@/lib/production-pack/permissions";
import {
  DEFAULT_PRODUCTION_PACK_SECTIONS,
  PRODUCTION_PACK_SECTION_IDS,
  type ProductionPackSectionId,
} from "@/lib/production-pack/types";
import { generateProductionPackPdfBuffer } from "@/lib/pdf/generate-production-pack-pdf";
import { productionPackFilename } from "@/lib/pdf/production-pack-types";
import { mapProjectMember } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseSections(raw: unknown): ProductionPackSectionId[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_PRODUCTION_PACK_SECTIONS;
  }
  const allowed = new Set<string>(PRODUCTION_PACK_SECTION_IDS);
  const filtered = raw.filter(
    (s): s is ProductionPackSectionId =>
      typeof s === "string" && allowed.has(s)
  );
  return filtered.length > 0 ? filtered : DEFAULT_PRODUCTION_PACK_SECTIONS;
}

async function resolveMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string
) {
  const { data } = await supabase
    .from("project_members")
    .select("*, profiles(email, full_name, global_role)")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("access_status", "active")
    .maybeSingle();
  return data ? mapProjectMember(data) : null;
}

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

  const membership = await resolveMembership(supabase, projectId, user.id);
  if (!canGenerateProductionPack(membership?.role)) {
    return NextResponse.json(
      { error: "Accesso al progetto non autorizzato" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    sections?: string[];
  };
  const sections = parseSections(body.sections);

  try {
    const data = await buildProductionPackData(supabase, projectId, sections);
    if (!data) {
      return NextResponse.json(
        { error: "Progetto non trovato o accesso negato" },
        { status: 404 }
      );
    }

    const pdfBuffer = await generateProductionPackPdfBuffer(data);
    const filename = productionPackFilename(data.projectTitle);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[FilmOps] Production pack PDF error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Generazione Production Pack fallita";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
