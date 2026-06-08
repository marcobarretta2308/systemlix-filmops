import { generateCallSheetPdfBuffer } from "@/lib/pdf/generate-call-sheet-pdf";
import { loadCallSheetPdfData } from "@/lib/pdf/load-call-sheet-pdf-data";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    callSheetId?: string;
    shootingDayId?: string;
    projectId?: string;
  };

  const projectId = body.projectId?.trim();
  const callSheetId = body.callSheetId?.trim();
  const shootingDayId = body.shootingDayId?.trim();

  if (!projectId) {
    return NextResponse.json({ error: "projectId mancante" }, { status: 400 });
  }

  if (!callSheetId && !shootingDayId) {
    return NextResponse.json(
      { error: "Specificare callSheetId o shootingDayId" },
      { status: 400 }
    );
  }

  try {
    const { data, filename } = await loadCallSheetPdfData(supabase, {
      projectId,
      callSheetId,
      shootingDayId,
    });

    const pdfBuffer = await generateCallSheetPdfBuffer(data);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[FilmOps] Call sheet PDF export error:", error);
    const message =
      error instanceof Error ? error.message : "Generazione PDF fallita";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
