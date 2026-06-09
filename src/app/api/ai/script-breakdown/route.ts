import {
  getOpenAiFallbackModel,
  getOpenAiModel,
  isOpenAiConfigured,
} from "@/lib/ai/script-breakdown";
import {
  parseProBreakdownJson,
  SCRIPT_BREAKDOWN_PRO_PROMPT,
  ScriptBreakdownParseError,
  type ProBreakdownResult,
} from "@/lib/ai/script-breakdown-pro";
import {
  formatBreakdownApiError,
  resolveUnknownError,
  validateScriptInputLength,
} from "@/lib/script-breakdown/errors";
import { insertScriptBreakdownRun, insertScriptRevision } from "@/lib/supabase/data";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { NextResponse } from "next/server";

function isModelUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { status?: number; code?: string; message?: string };
  if (err.status === 404) return true;
  const code = String(err.code ?? "").toLowerCase();
  const message = String(err.message ?? "").toLowerCase();
  return (
    code.includes("model") ||
    message.includes("model") ||
    message.includes("does not exist") ||
    message.includes("not found")
  );
}

function extractOpenAiErrorMessage(error: unknown): string {
  const resolved = resolveUnknownError(error);
  return resolved.message;
}

async function requestProBreakdown(
  scriptText: string
): Promise<{ rawJson: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const client = new OpenAI({ apiKey });
  const models = [...new Set([getOpenAiModel(), getOpenAiFallbackModel()])];
  let lastError: unknown;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SCRIPT_BREAKDOWN_PRO_PROMPT },
          {
            role: "user",
            content: `Analyze the following screenplay and produce the full production breakdown JSON:\n\n${scriptText}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("OpenAI returned an empty response");
      }
      return { rawJson: content, model };
    } catch (error) {
      lastError = error;
      const hasFallback = i < models.length - 1;
      if (hasFallback && isModelUnavailableError(error)) {
        console.warn(
          `[FilmOps AI] Model ${model} unavailable, fallback ${models[i + 1]}`
        );
        continue;
      }
      const openAiMessage = extractOpenAiErrorMessage(error);
      throw new Error(`OpenAI request failed: ${openAiMessage}`);
    }
  }

  const fallbackMessage = extractOpenAiErrorMessage(lastError);
  throw new Error(
    fallbackMessage
      ? `OpenAI request failed: ${fallbackMessage}`
      : "OpenAI request failed after trying all configured models"
  );
}

function logScriptBreakdownFailure(
  error: unknown,
  context: {
    payload: Record<string, unknown>;
    inputType?: string;
    projectId?: string;
    companyId?: string | null;
    workspaceId?: string | null;
    scriptLength?: number;
    selectedModel?: string;
    rawOpenAiResponse?: string;
    jsonParseError?: string;
  }
) {
  const resolved = resolveUnknownError(error);
  console.error("[FilmOps AI] Script breakdown failed", {
    error,
    errorMessage: resolved.message,
    errorDetails: resolved.details,
    errorStack: resolved.stack,
    payload: context.payload,
    input_type: context.inputType,
    project_id: context.projectId,
    company_id: context.companyId,
    workspace_id: context.workspaceId,
    script_length: context.scriptLength,
    selected_model: context.selectedModel,
    raw_openai_response: context.rawOpenAiResponse
      ? context.rawOpenAiResponse.slice(0, 4000)
      : undefined,
    json_parse_error: context.jsonParseError,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isOpenAiConfigured()) {
    return NextResponse.json(
      {
        error: "Script breakdown failed",
        message:
          "AI service is not configured. Contact your administrator to enable Script Breakdown.",
        details: "OPENAI_API_KEY is missing on the server.",
      },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    scriptText?: string;
    projectId?: string;
    inputType?: "paste" | "upload";
    documentId?: string | null;
    revisionName?: string | null;
    revisionDate?: string | null;
  };

  const scriptText = body.scriptText?.trim() ?? "";
  const projectId = body.projectId?.trim();
  const inputType = body.inputType ?? "paste";
  const payloadLog = {
    inputType,
    projectId,
    documentId: body.documentId ?? null,
    revisionName: body.revisionName ?? null,
    scriptLength: scriptText.length,
  };

  if (!scriptText) {
    return NextResponse.json(
      {
        error: "Script breakdown failed",
        message: "scriptText is required",
        details: null,
      },
      { status: 400 }
    );
  }

  const lengthCheck = validateScriptInputLength(scriptText);
  if (!lengthCheck.ok) {
    return NextResponse.json(
      {
        error: "Script breakdown failed",
        message: lengthCheck.message,
        details: null,
      },
      { status: 400 }
    );
  }

  if (!projectId) {
    return NextResponse.json(
      {
        error: "Script breakdown failed",
        message: "projectId is required",
        details: null,
      },
      { status: 400 }
    );
  }

  let companyId: string | null = null;
  let workspaceId: string | null = null;
  let selectedModel: string | undefined;
  let rawOpenAiResponse: string | undefined;

  try {
    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .select("company_id, workspace_id")
      .eq("id", projectId)
      .single();
    if (projectErr) throw projectErr;

    companyId = project.company_id;
    workspaceId = project.workspace_id;

    const aiResult = await requestProBreakdown(scriptText);
    selectedModel = aiResult.model;
    rawOpenAiResponse = aiResult.rawJson;

    const breakdown: ProBreakdownResult = parseProBreakdownJson(aiResult.rawJson);

    let scriptRevisionId: string | null = null;
    let persistWarning: string | null = null;

    try {
      const revision = await insertScriptRevision(supabase, {
        company_id: project.company_id,
        workspace_id: project.workspace_id,
        project_id: projectId,
        document_id: body.documentId ?? null,
        revision_name: body.revisionName ?? "Script breakdown",
        revision_date: body.revisionDate ?? new Date().toISOString().slice(0, 10),
        script_text: scriptText.slice(0, 500000),
        ai_summary: breakdown.project_summary as unknown as Record<string, unknown>,
        created_by: user.id,
      });
      scriptRevisionId = revision.id;

      await insertScriptBreakdownRun(supabase, {
        company_id: project.company_id,
        workspace_id: project.workspace_id,
        project_id: projectId,
        script_revision_id: revision.id,
        status: "completed",
        input_type: inputType,
        ai_result: breakdown as unknown as Record<string, unknown>,
        created_by: user.id,
      });
    } catch (persistErr) {
      const persistMessage = formatSupabaseError(persistErr);
      persistWarning = `Breakdown generated but revision history was not saved: ${persistMessage}`;
      console.error("[FilmOps AI] Script revision/run persist failed (non-fatal)", {
        error: persistErr,
        project_id: projectId,
        company_id: companyId,
        workspace_id: workspaceId,
      });
    }

    return NextResponse.json({
      ...breakdown,
      script_revision_id: scriptRevisionId,
      persist_warning: persistWarning,
      scenes: breakdown.scenes,
    });
  } catch (error) {
    const jsonParseError =
      error instanceof ScriptBreakdownParseError ? error.parseError : undefined;

    if (error instanceof ScriptBreakdownParseError) {
      console.error("[FilmOps AI] Invalid AI JSON response", {
        parseError: error.parseError,
        raw_openai_response: error.rawResponse.slice(0, 4000),
        input_type: inputType,
        project_id: projectId,
        company_id: companyId,
        workspace_id: workspaceId,
        script_length: scriptText.length,
        selected_model: selectedModel,
      });
    }

    logScriptBreakdownFailure(error, {
      payload: payloadLog,
      inputType,
      projectId,
      companyId,
      workspaceId,
      scriptLength: scriptText.length,
      selectedModel,
      rawOpenAiResponse,
      jsonParseError,
    });

    const resolved = formatBreakdownApiError(error);

    if (resolved.message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        {
          error: "Script breakdown failed",
          message:
            "AI service is not configured. Contact your administrator to enable Script Breakdown.",
          details: resolved.details,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: resolved.error,
        message: resolved.message,
        details: resolved.details,
      },
      { status: 500 }
    );
  }
}
