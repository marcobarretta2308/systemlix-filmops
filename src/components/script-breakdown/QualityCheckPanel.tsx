"use client";

import { Badge } from "@/components/ui/Badge";
import { PremiumCard } from "@/components/ui/PremiumCard";
import type { BreakdownQualityCheck } from "@/lib/script-breakdown/types";

function statusVariant(
  status: BreakdownQualityCheck["quality_status"]
): "active" | "pending" | "issue" {
  if (status === "good") return "active";
  if (status === "needs_review") return "pending";
  return "issue";
}

function statusLabel(status: BreakdownQualityCheck["quality_status"]): string {
  if (status === "good") return "Good";
  if (status === "needs_review") return "Needs review";
  return "Critical issues";
}

export function QualityCheckPanel({
  qualityCheck,
}: {
  qualityCheck?: BreakdownQualityCheck;
}) {
  if (!qualityCheck) return null;

  const topIssues = qualityCheck.issues.slice(0, 8);

  return (
    <PremiumCard padding="md">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Breakdown Quality Check
        </p>
        <Badge variant={statusVariant(qualityCheck.quality_status)} size="sm">
          {statusLabel(qualityCheck.quality_status)}
        </Badge>
        <span className="text-[11px] text-[var(--text-muted)]">
          {qualityCheck.issues.length} issue
          {qualityCheck.issues.length === 1 ? "" : "s"}
        </span>
      </div>
      {topIssues.length > 0 ? (
        <ul className="space-y-1 text-[12px] text-[var(--text-muted)]">
          {topIssues.map((issue, idx) => (
            <li key={`${issue.type}-${idx}`}>• {issue.message}</li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-[var(--text-muted)]">
          No quality issues detected.
        </p>
      )}
    </PremiumCard>
  );
}
