import type { SupabaseClient } from "@supabase/supabase-js";
import * as db from "@/lib/supabase/data";
import { formatSupabaseError, logSupabaseError } from "@/lib/supabase/errors";
import type {
  CallSheet,
  CallSheetDistribution,
  CallSheetRecipient,
  Project,
  ProjectMember,
  User,
} from "@/lib/types";
import {
  CALL_SHEET_RECIPIENT_GROUPS,
  memberMatchesRecipientGroup,
  type RecipientGroupKey,
} from "./constants";
import { normalizeCallSheetStatus } from "./constants";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SendDistributionInput {
  callSheet: CallSheet;
  project: Project;
  sender: User;
  recipientKeys: RecipientGroupKey[];
  specificUserIds?: string[];
  notes?: string;
}

export type SendDistributionResult =
  | {
      ok: true;
      distribution: CallSheetDistribution;
      recipients: CallSheetRecipient[];
    }
  | { ok: false; error: string };

export function resolveRecipientMembers(
  members: ProjectMember[],
  recipientKeys: RecipientGroupKey[],
  specificUserIds: string[] = []
): ProjectMember[] {
  const active = members.filter((m) => m.access_status === "active");
  const selected = new Map<string, ProjectMember>();

  if (recipientKeys.includes("all")) {
    active.forEach((m) => selected.set(m.user_id, m));
  } else {
    for (const key of recipientKeys) {
      if (key === "all") continue;
      active
        .filter((m) => memberMatchesRecipientGroup(m, key))
        .forEach((m) => selected.set(m.user_id, m));
    }
  }

  for (const uid of specificUserIds) {
    const m = active.find((x) => x.user_id === uid);
    if (m) selected.set(uid, m);
  }

  return [...selected.values()];
}

function buildRecipientRows(
  members: ProjectMember[],
  input: SendDistributionInput
) {
  return members.map((m) => ({
    company_id: input.project.company_id,
    project_id: input.project.id,
    user_id: m.user_id,
    email: m.email ?? null,
    full_name: m.full_name ?? null,
    department: m.department ?? (m.role === "cast_crew_user" ? "Cast" : null),
    recipient_type: "user" as const,
    target_key:
      input.recipientKeys.length === 1 ? input.recipientKeys[0] : "mixed",
  }));
}

/**
 * Internal platform distribution — email provider can be plugged in later.
 */
export async function sendCallSheetDistribution(
  supabase: SupabaseClient,
  input: SendDistributionInput,
  projectMembers: ProjectMember[]
): Promise<SendDistributionResult> {
  const status = normalizeCallSheetStatus(input.callSheet.status);
  if (status !== "approved" && status !== "sent") {
    return {
      ok: false,
      error: "Call sheet must be Approved before sending.",
    };
  }

  if (!UUID_RE.test(input.callSheet.id)) {
    return {
      ok: false,
      error:
        "Save the call sheet to the database before sending (invalid call sheet id).",
    };
  }

  const members = resolveRecipientMembers(
    projectMembers,
    input.recipientKeys,
    input.specificUserIds ?? []
  );

  if (members.length === 0) {
    return {
      ok: false,
      error:
        "No recipients selected. Check that project members have department set in project_members.",
    };
  }

  const recipientRows = buildRecipientRows(members, input);
  const distributionPayload = {
    company_id: input.project.company_id,
    workspace_id: input.project.workspace_id,
    project_id: input.project.id,
    call_sheet_id: input.callSheet.id,
    version_number: input.callSheet.version,
    sent_by: input.sender.id,
    notes: input.notes ?? null,
    recipients: recipientRows,
  };

  try {
    const result = await db.createCallSheetDistribution(
      supabase,
      distributionPayload
    );

    await db.markCallSheetSent(supabase, input.callSheet.id, input.sender.id);

    return {
      ok: true,
      distribution: result.distribution,
      recipients: result.recipients,
    };
  } catch (err) {
    logSupabaseError("sendCallSheetDistribution", err, {
      payload: {
        distribution: {
          company_id: distributionPayload.company_id,
          project_id: distributionPayload.project_id,
          call_sheet_id: distributionPayload.call_sheet_id,
          version_number: distributionPayload.version_number,
          sent_by: distributionPayload.sent_by,
        },
        recipients: recipientRows,
      },
    });
    return {
      ok: false,
      error: `Distribution failed: ${formatSupabaseError(err)}`,
    };
  }
}

export async function acknowledgeCallSheetReceipt(
  recipientId: string,
  projectId: string,
  userAgent?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch("/api/call-sheets/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, projectId, userAgent }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      const message = data.error ?? "Conferma non riuscita";
      console.error("[FilmOps] acknowledgeCallSheetReceipt:", message);
      return {
        ok: false,
        error: `Errore conferma presa visione: ${message}`,
      };
    }
    return { ok: true };
  } catch (err) {
    logSupabaseError("acknowledgeCallSheetReceipt", err, {
      recipientId,
      projectId,
    });
    return {
      ok: false,
      error: `Errore conferma presa visione: ${formatSupabaseError(err)}`,
    };
  }
}

export function getRecipientGroupOptions() {
  return CALL_SHEET_RECIPIENT_GROUPS;
}
