import type { LogActivityInput } from "@/lib/activity-log/types";

export async function logActivity(input: LogActivityInput): Promise<void> {
  if (!input.projectId || !input.action || !input.area) return;

  try {
    const response = await fetch(
      `/api/projects/${input.projectId}/activity-log`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: input.action,
          area: input.area,
          entityType: input.entityType,
          entityId: input.entityId,
          entityLabel: input.entityLabel,
          metadata: input.metadata ?? {},
        }),
      }
    );

    if (!response.ok && process.env.NODE_ENV === "development") {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      console.warn(
        "[FilmOps] Activity log failed:",
        payload.error ?? response.status
      );
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[FilmOps] Activity log failed:", error);
    }
  }
}
