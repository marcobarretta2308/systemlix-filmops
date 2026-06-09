import { departmentsMatch } from "@/lib/call-sheets/constants";
import type {
  CallSheet,
  CallSheetDistribution,
  CallSheetRecipient,
} from "@/lib/types";

export interface CallSheetInboxItem {
  recipient: CallSheetRecipient;
  distribution: CallSheetDistribution;
  sheet: CallSheet | null;
  /** True when user can acknowledge (own row or claimable dept row) */
  canAcknowledge: boolean;
}

export function isRecipientForUser(
  recipient: CallSheetRecipient,
  userId: string,
  memberDepartment?: string | null
): boolean {
  if (recipient.user_id === userId) return true;
  if (
    !recipient.user_id &&
    recipient.department &&
    memberDepartment &&
    departmentsMatch(recipient.department, memberDepartment)
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves one inbox card per distribution for the current user.
 * Prefers a row with user_id over a generic department row.
 */
export function resolveCallSheetInboxItems(
  userId: string,
  memberDepartment: string | null | undefined,
  distributions: CallSheetDistribution[],
  recipients: CallSheetRecipient[],
  callSheets: CallSheet[]
): CallSheetInboxItem[] {
  const visible = recipients.filter((r) =>
    isRecipientForUser(r, userId, memberDepartment)
  );

  const byDistribution = new Map<string, CallSheetRecipient[]>();
  for (const r of visible) {
    const list = byDistribution.get(r.distribution_id) ?? [];
    list.push(r);
    byDistribution.set(r.distribution_id, list);
  }

  const items: CallSheetInboxItem[] = [];

  for (const [distributionId, rows] of byDistribution) {
    const distribution = distributions.find((d) => d.id === distributionId);
    if (!distribution) continue;

    const userRow = rows.find(
      (r) => r.user_id === userId && !r.acknowledged_at
    );
    const userRowAcked = rows.find(
      (r) => r.user_id === userId && r.acknowledged_at
    );
    const deptRow = rows.find((r) => !r.user_id);

    const recipient = userRow ?? userRowAcked ?? deptRow ?? rows[0];
    const sheet = callSheets.find((s) => s.id === distribution.call_sheet_id) ?? null;

    const canAcknowledge =
      Boolean(recipient) &&
      !recipient.acknowledged_at &&
      (recipient.user_id === userId || !recipient.user_id);

    items.push({
      recipient,
      distribution,
      sheet,
      canAcknowledge,
    });
  }

  return items.sort(
    (a, b) =>
      new Date(b.distribution.sent_at ?? b.distribution.created_at).getTime() -
      new Date(a.distribution.sent_at ?? a.distribution.created_at).getTime()
  );
}

export function getAcknowledgedInboxItems(items: CallSheetInboxItem[]) {
  return items.filter((i) => i.recipient.acknowledged_at);
}

export function getPendingInboxItems(items: CallSheetInboxItem[]) {
  return items.filter((i) => !i.recipient.acknowledged_at);
}
