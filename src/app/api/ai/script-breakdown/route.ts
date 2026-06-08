import {
  getOpenAiFallbackModel,
  getOpenAiModel,
  isOpenAiConfigured,
  parseAiBreakdownJson,
  SCRIPT_BREAKDOWN_SYSTEM_PROMPT,
} from "@/lib/ai/script-breakdown";
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

async function requestBreakdown(scriptText: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY non configurata");
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
          { role: "system", content: SCRIPT_BREAKDOWN_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analizza la seguente sceneggiatura e produci il breakdown operativo:\n\n${scriptText}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("Risposta AI vuota");
      }
      return content;
    } catch (error) {
      lastError = error;
      const hasFallback = i < models.length - 1;
      if (hasFallback && isModelUnavailableError(error)) {
        console.warn(
          `[FilmOps AI] Modello ${model} non disponibile, fallback su ${models[i + 1]}`
        );
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Generazione breakdown fallita");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  if (!isOpenAiConfigured()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY non configurata" },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    scriptText?: string;
    projectId?: string;
  };

  const scriptText = body.scriptText?.trim();
  const projectId = body.projectId?.trim();

  if (!scriptText) {
    return NextResponse.json(
      { error: "scriptText mancante o vuoto" },
      { status: 400 }
    );
  }

  if (!projectId) {
    return NextResponse.json({ error: "projectId mancante" }, { status: 400 });
  }

  try {
    const rawJson = await requestBreakdown(scriptText);
    const breakdown = parseAiBreakdownJson(rawJson);
    return NextResponse.json(breakdown);
  } catch (error) {
    console.error("[FilmOps AI] Script breakdown error:", error);

    const message =
      error instanceof Error ? error.message : "Generazione breakdown fallita";

    if (message === "OPENAI_API_KEY non configurata") {
      return NextResponse.json({ error: message }, { status: 503 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
