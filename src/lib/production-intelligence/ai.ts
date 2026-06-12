import {
  getOpenAiFallbackModel,
  getOpenAiModel,
  isOpenAiConfigured,
} from "@/lib/ai/script-breakdown";
import type { ProductionIntelligenceContext } from "./context";
import { buildContextSummary } from "./context";
import type {
  CallSheetCheckResult,
  ProductionCheckResult,
  ProductionIssue,
  ProjectSearchResult,
} from "./types";
import type { CallSheet } from "@/lib/types";
import OpenAI from "openai";

function parseJsonBlock<T>(text: string): T | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function chatJson<T>(
  system: string,
  user: string
): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const models = [...new Set([getOpenAiModel(), getOpenAiFallbackModel()])];

  for (const model of models) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });
      const content = response.choices[0]?.message?.content?.trim();
      if (!content) continue;
      return parseJsonBlock<T>(content);
    } catch {
      continue;
    }
  }
  return null;
}

export { isOpenAiConfigured };

export async function enhanceProductionCheckWithAi(
  ctx: ProductionIntelligenceContext,
  base: ProductionCheckResult
): Promise<ProductionCheckResult> {
  const parsed = await chatJson<{
    health_score?: number;
    issues?: ProductionIssue[];
    suggested_next_actions?: string[];
  }>(
    `You are a film production supervisor for FilmOps.
Analyze project data and return JSON:
{
  "health_score": number 0-100,
  "issues": [{ "id": string, "title": string, "description": string, "affected_area": string, "suggested_action": string, "severity": "critical"|"warning"|"info" }],
  "suggested_next_actions": string[]
}
Merge deterministic findings with your analysis. Be practical and concise. Max 12 issues.`,
    `PROJECT DATA:\n${buildContextSummary(ctx)}\n\nEXISTING CHECK:\n${JSON.stringify(base, null, 2)}`
  );

  if (!parsed?.issues?.length) {
    return {
      ...base,
      fallback_message: "AI analysis failed, showing basic checks instead.",
    };
  }

  return {
    ...base,
    health_score: parsed.health_score ?? base.health_score,
    issues: parsed.issues.map((i, idx) => ({
      ...i,
      id: i.id || `ai-${idx}`,
    })),
    critical_count: parsed.issues.filter((i) => i.severity === "critical")
      .length,
    warning_count: parsed.issues.filter((i) => i.severity === "warning")
      .length,
    info_count: parsed.issues.filter((i) => i.severity === "info").length,
    suggested_next_actions:
      parsed.suggested_next_actions ?? base.suggested_next_actions,
    ai_enhanced: true,
  };
}

export async function enhanceCallSheetCheckWithAi(
  ctx: ProductionIntelligenceContext,
  sheet: CallSheet,
  base: CallSheetCheckResult
): Promise<CallSheetCheckResult> {
  const parsed = await chatJson<{
    quality_score?: number;
    ready_to_send?: boolean;
    missing_fields?: string[];
    risk_notes?: string[];
    suggestions?: string[];
    safety_warnings?: string[];
    department_notes?: string[];
  }>(
    `You are a 1st AD reviewing a call sheet. Return JSON:
{
  "quality_score": number 0-100,
  "ready_to_send": boolean,
  "missing_fields": string[],
  "risk_notes": string[],
  "suggestions": string[],
  "safety_warnings": string[],
  "department_notes": string[]
}
Do not invent data not supported by context.`,
    `CALL SHEET:\n${JSON.stringify(sheet, null, 2)}\n\nPROJECT CONTEXT:\n${buildContextSummary(ctx)}\n\nBASE CHECK:\n${JSON.stringify(base, null, 2)}`
  );

  if (!parsed) {
    return {
      ...base,
      fallback_message: "AI analysis failed, showing basic checks instead.",
    };
  }

  return {
    ...base,
    quality_score: parsed.quality_score ?? base.quality_score,
    ready_to_send: parsed.ready_to_send ?? base.ready_to_send,
    missing_fields: parsed.missing_fields ?? base.missing_fields,
    risk_notes: [...base.risk_notes, ...(parsed.risk_notes ?? [])],
    suggestions: [...new Set([...base.suggestions, ...(parsed.suggestions ?? [])])],
    safety_warnings: [
      ...new Set([...base.safety_warnings, ...(parsed.safety_warnings ?? [])]),
    ],
    department_notes: parsed.department_notes ?? base.department_notes,
    ai_enhanced: true,
  };
}

export async function runProjectSearchWithAi(
  ctx: ProductionIntelligenceContext,
  question: string
): Promise<ProjectSearchResult> {
  const parsed = await chatJson<{
    answer?: string;
    sources?: string[];
    actions?: string[];
  }>(
    `You are FilmOps production intelligence. Answer operational questions about the project.
Return JSON: { "answer": string, "sources": string[], "actions": string[] }
If insufficient data, answer must state clearly that data is missing.
Keep answer short and practical. Cite areas: scenes, locations, call sheets, documents, reports.`,
    `QUESTION: ${question}\n\nPROJECT DATA:\n${buildContextSummary(ctx)}`
  );

  if (!parsed?.answer) {
    return {
      answer:
        "Non ho trovato dati sufficienti nel progetto per rispondere in modo affidabile.",
      sources: [],
      actions: [],
      ai_enhanced: false,
      fallback_message: "AI analysis failed, showing basic checks instead.",
    };
  }

  return {
    answer: parsed.answer,
    sources: parsed.sources ?? [],
    actions: parsed.actions ?? [],
    ai_enhanced: true,
  };
}
