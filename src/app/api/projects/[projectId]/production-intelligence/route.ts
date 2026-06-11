import {
  enhanceCallSheetCheckWithAi,
  enhanceProductionCheckWithAi,
  isOpenAiConfigured,
  runProjectSearchWithAi,
} from "@/lib/production-intelligence/ai";
import { runDeterministicCallSheetCheck } from "@/lib/production-intelligence/call-sheet-check";
import { runDeterministicProductionCheck } from "@/lib/production-intelligence/checks";
import {
  getCallSheetById,
  loadProductionIntelligenceContext,
} from "@/lib/production-intelligence/context";
import {
  canUseFullProductionIntelligence,
  canUseProjectSearch,
} from "@/lib/production-intelligence/permissions";
import type { ProductionIntelligenceAction } from "@/lib/production-intelligence/types";
import { mapProjectMember } from "@/lib/supabase/mappers";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

  const body = (await request.json().catch(() => ({}))) as {
    action?: ProductionIntelligenceAction;
    callSheetId?: string;
    question?: string;
  };

  const action = body.action;
  if (
    !action ||
    !["production_check", "call_sheet_check", "project_search"].includes(action)
  ) {
    return NextResponse.json({ error: "action non valida" }, { status: 400 });
  }

  try {
    const ctx = await loadProductionIntelligenceContext(supabase, projectId);
    if (!ctx) {
      return NextResponse.json(
        { error: "Progetto non trovato o accesso negato" },
        { status: 404 }
      );
    }

    const membership = await resolveMembership(supabase, projectId, user.id);
    const projectRole = membership?.role ?? null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .maybeSingle();

    const { data: companyMember } = await supabase
      .from("company_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", ctx.project.company_id)
      .eq("status", "active")
      .maybeSingle();

    const userRecord = {
      id: user.id,
      email: user.email ?? "",
      full_name: user.user_metadata?.full_name ?? "",
      global_role: (profile?.global_role ?? "user") as "user" | "platform_owner",
      auth_status: "active" as const,
      created_at: user.created_at,
    };

    const companyRole = companyMember?.role as
      | "platform_owner"
      | "company_admin"
      | "producer"
      | "viewer"
      | undefined;

    const fullAccess = canUseFullProductionIntelligence(
      userRecord,
      companyRole ?? null,
      projectRole
    );

    if (action === "production_check") {
      if (!fullAccess) {
        return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
      }

      let result = runDeterministicProductionCheck(ctx);
      if (isOpenAiConfigured()) {
        result = await enhanceProductionCheckWithAi(ctx, result);
      } else {
        result = {
          ...result,
          fallback_message: "AI analysis failed, showing basic checks instead.",
        };
      }
      return NextResponse.json(result);
    }

    if (action === "call_sheet_check") {
      if (!fullAccess) {
        return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
      }

      const callSheetId = body.callSheetId?.trim();
      if (!callSheetId) {
        return NextResponse.json(
          { error: "callSheetId obbligatorio" },
          { status: 400 }
        );
      }

      const sheet = getCallSheetById(ctx, callSheetId);
      if (!sheet) {
        return NextResponse.json(
          { error: "Call sheet non trovata" },
          { status: 404 }
        );
      }

      let result = runDeterministicCallSheetCheck(ctx, sheet);
      if (isOpenAiConfigured()) {
        result = await enhanceCallSheetCheckWithAi(ctx, sheet, result);
      } else {
        result = {
          ...result,
          fallback_message: "AI analysis failed, showing basic checks instead.",
        };
      }
      return NextResponse.json(result);
    }

    if (!canUseProjectSearch(projectRole)) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const question = body.question?.trim();
    if (!question) {
      return NextResponse.json(
        { error: "question obbligatoria" },
        { status: 400 }
      );
    }

    if (isOpenAiConfigured()) {
      const result = await runProjectSearchWithAi(ctx, question);
      return NextResponse.json(result);
    }

    return NextResponse.json({
      answer: `Progetto: ${ctx.project.title}. Scene: ${ctx.scenes.length}, location: ${ctx.locations.length}, call sheet: ${ctx.callSheets.length}, documenti: ${ctx.documents.length}. AI analysis failed, showing basic checks instead.`,
      sources: ["project summary"],
      actions: [
        "Run Production Check (admin) for full analysis",
        "Review call sheets and locations manually",
      ],
      ai_enhanced: false,
      fallback_message: "AI analysis failed, showing basic checks instead.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseError(error) },
      { status: 500 }
    );
  }
}
