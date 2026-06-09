import {
  getOpenAiFallbackModel,
  getOpenAiModel,
  isOpenAiConfigured,
} from "@/lib/ai/script-breakdown";
import {
  SCRIPT_BREAKDOWN_CHUNK_PROMPT,
  SCRIPT_BREAKDOWN_PRO_PROMPT,
} from "@/lib/ai/script-breakdown-pro";
import { resolveUnknownError } from "@/lib/script-breakdown/errors";
import OpenAI from "openai";

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

export async function requestOpenAiBreakdownJson(
  scriptText: string,
  options?: {
    chunkMode?: boolean;
    chunkIndex?: number;
    totalChunks?: number;
    sceneRange?: string | null;
  }
): Promise<{ rawJson: string; model: string }> {
  if (!isOpenAiConfigured()) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const client = new OpenAI({ apiKey });
  const models = [...new Set([getOpenAiModel(), getOpenAiFallbackModel()])];
  let lastError: unknown;

  const systemPrompt = options?.chunkMode
    ? SCRIPT_BREAKDOWN_CHUNK_PROMPT
    : SCRIPT_BREAKDOWN_PRO_PROMPT;

  const chunkNum = (options?.chunkIndex ?? 0) + 1;
  const total = options?.totalChunks ?? "?";
  const range = options?.sceneRange?.trim();

  const userPrefix = options?.chunkMode
    ? [
        `Script section for breakdown (chunk ${chunkNum} of ${total}).`,
        range ? `Scene range in this chunk: ${range}.` : null,
        "Analyze ONLY scenes in this section. Preserve scene numbers from sluglines. Do not invent missing scenes.",
        "",
      ]
        .filter(Boolean)
        .join("\n") + "\n\n"
    : "Analyze the following screenplay and produce the full production breakdown JSON:\n\n";

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${userPrefix}${scriptText}` },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) throw new Error("OpenAI returned an empty response");
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
      const msg = resolveUnknownError(error).message;
      throw new Error(`OpenAI request failed: ${msg}`);
    }
  }

  const msg = resolveUnknownError(lastError).message;
  throw new Error(
    msg
      ? `OpenAI request failed: ${msg}`
      : "OpenAI request failed after trying all configured models"
  );
}
