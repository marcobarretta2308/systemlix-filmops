import {
  getDepartmentReferenceScenes,
  loadSetAssistantContext,
} from "@/lib/ai/set-assistant-context";
import {
  isOpenAiConfigured,
  requestSetAssistantResponse,
} from "@/lib/ai/set-assistant";
import { createClient } from "@/lib/supabase/server";
import { generateAssistantResponse } from "@/lib/utils/assistant";
import type { SetAssistantRole } from "@/lib/types";
import { NextResponse } from "next/server";

const VALID_ROLES: (SetAssistantRole | string)[] = [
  "producer",
  "assistant_director",
  "actor",
  "crew",
  "driver",
  "extra",
  "costumi",
  "trucco",
  "props",
  "trasporti",
  "location_department",
];

function toAssistantContext(
  loaded: Awaited<ReturnType<typeof loadSetAssistantContext>>,
  role: SetAssistantRole
) {
  const reference =
    role === "costumi" ? getDepartmentReferenceScenes(loaded) : null;

  return {
    project: loaded.project,
    scenes: reference?.scenes ?? loaded.scenes,
    shootingDay: reference?.shootingDay ?? loaded.activeShootingDay,
    callSheet: loaded.activeCallSheet,
    locations: loaded.locations,
    castCrew: loaded.castCrew,
    role,
    usingAllScenes: reference?.usingAllScenes,
  };
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

  const body = (await request.json().catch(() => ({}))) as {
    projectId?: string;
    message?: string;
    roleContext?: string;
    selectedShootingDayId?: string;
  };

  const projectId = body.projectId?.trim();
  const message = body.message?.trim();
  const roleContext = (body.roleContext?.trim() ??
    "producer") as SetAssistantRole;
  const selectedShootingDayId = body.selectedShootingDayId?.trim();

  if (!projectId) {
    return NextResponse.json({ error: "projectId mancante" }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json(
      { error: "message mancante o vuoto" },
      { status: 400 }
    );
  }

  if (!VALID_ROLES.includes(roleContext as SetAssistantRole)) {
    return NextResponse.json({ error: "roleContext non valido" }, { status: 400 });
  }

  try {
    const loadedContext = await loadSetAssistantContext(
      supabase,
      projectId,
      selectedShootingDayId
    );

    if (!isOpenAiConfigured()) {
      const response = generateAssistantResponse(
        message,
        toAssistantContext(loadedContext, roleContext)
      );

      return NextResponse.json({
        response,
        fallback: true,
        devNote:
          "AI service unavailable. Showing a local fallback response.",
      });
    }

    const response = await requestSetAssistantResponse(
      message,
      roleContext,
      loadedContext
    );

    // TODO: persistere user/assistant messages in assistant_threads / assistant_messages

    return NextResponse.json({ response, fallback: false });
  } catch (error) {
    console.error("[FilmOps AI] Set Assistant error:", error);
    const messageText =
      error instanceof Error ? error.message : "Risposta Set Assistant fallita";
    const status = messageText.includes("accesso negato") ? 403 : 500;
    return NextResponse.json({ error: messageText }, { status });
  }
}
