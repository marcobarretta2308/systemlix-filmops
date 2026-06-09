import { generateProductionReportPdfBuffer } from "@/lib/pdf/generate-production-report-pdf";
import { loadProductionReportPdfData } from "@/lib/pdf/load-production-report-pdf-data";
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
    reportId?: string;
    projectId?: string;
  };

  const projectId = body.projectId?.trim();
  const reportId = body.reportId?.trim();

  if (!projectId || !reportId) {
    return NextResponse.json(
      { error: "projectId e reportId sono obbligatori" },
      { status: 400 }
    );
  }

  try {
    const { data, filename } = await loadProductionReportPdfData(supabase, {
      projectId,
      reportId,
    });

    const pdfBuffer = await generateProductionReportPdfBuffer(data);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[FilmOps] Production report PDF export error:", error);
    const message =
      error instanceof Error ? error.message : "Generazione PDF fallita";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
