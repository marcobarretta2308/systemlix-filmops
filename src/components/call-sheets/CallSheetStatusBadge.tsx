import { Badge } from "@/components/ui/Badge";
import type { CallSheetStatus } from "@/lib/types";
import {
  CALL_SHEET_STATUS_LABELS,
  CALL_SHEET_STATUS_VARIANTS,
  normalizeCallSheetStatus,
} from "@/lib/call-sheets/constants";

export function CallSheetStatusBadge({ status }: { status: CallSheetStatus | string }) {
  const normalized = normalizeCallSheetStatus(String(status));
  const variant = CALL_SHEET_STATUS_VARIANTS[normalized] ?? "draft";
  return (
    <Badge variant={variant} size="md">
      {CALL_SHEET_STATUS_LABELS[normalized] ?? normalized}
    </Badge>
  );
}
