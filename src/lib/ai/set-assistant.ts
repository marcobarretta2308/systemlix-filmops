import {
  getOpenAiFallbackModel,
  getOpenAiModel,
  isOpenAiConfigured,
} from "@/lib/ai/script-breakdown";
import {
  buildSetAssistantContextText,
  CALL_SHEET_FALLBACK_MESSAGE,
  ROLE_CONTEXT_INSTRUCTIONS,
  sanitizeSetAssistantResponse,
  SET_ASSISTANT_SYSTEM_PROMPT,
  type SetAssistantLoadedContext,
} from "@/lib/ai/set-assistant-context";
import type { SetAssistantRole } from "@/lib/types";
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

export async function requestSetAssistantResponse(
  message: string,
  roleContext: SetAssistantRole,
  loadedContext: SetAssistantLoadedContext
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY non configurata");
  }

  const client = new OpenAI({ apiKey });
  const models = [...new Set([getOpenAiModel(), getOpenAiFallbackModel()])];
  const contextText = buildSetAssistantContextText(loadedContext, roleContext);
  const roleInstruction =
    ROLE_CONTEXT_INSTRUCTIONS[roleContext] ??
    ROLE_CONTEXT_INSTRUCTIONS.crew;

  const fallbackHint =
    roleContext === "costumi"
      ? "Per questo ruolo, il fallback va usato solo se non esiste alcun dato utile in SCENES."
      : `Se nessun dato utile è presente, usa: "${CALL_SHEET_FALLBACK_MESSAGE}"`;

  let lastError: unknown;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SET_ASSISTANT_SYSTEM_PROMPT },
          {
            role: "system",
            content: roleInstruction,
          },
          {
            role: "system",
            content: fallbackHint,
          },
          {
            role: "user",
            content: `CONTESTO PROGETTO:\n\n${contextText}\n\nDOMANDA UTENTE:\n${message}`,
          },
        ],
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("Risposta AI vuota");
      }
      return sanitizeSetAssistantResponse(content, roleContext);
    } catch (error) {
      lastError = error;
      const hasFallback = i < models.length - 1;
      if (hasFallback && isModelUnavailableError(error)) {
        console.warn(
          `[FilmOps AI] Set Assistant: modello ${model} non disponibile, fallback su ${models[i + 1]}`
        );
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Risposta Set Assistant fallita");
}

export { isOpenAiConfigured };
