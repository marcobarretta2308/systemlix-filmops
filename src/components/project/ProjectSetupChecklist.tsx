"use client";

import { PremiumCard, CardTitle, CardDescription } from "@/components/ui/PremiumCard";
import type { ProjectSetupState } from "@/lib/utils/project-setup-checklist";
import { cn } from "@/lib/utils/cn";
import { Check, Circle } from "lucide-react";

interface ProjectSetupChecklistProps {
  setup: ProjectSetupState;
  compact?: boolean;
}

export function ProjectSetupChecklist({
  setup,
  compact = false,
}: ProjectSetupChecklistProps) {
  return (
    <PremiumCard padding="md" variant="elevated">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <CardTitle>Project setup</CardTitle>
          <CardDescription className="mt-1">
            Readiness based on live production data
          </CardDescription>
        </div>
        <div className="text-right">
          <p className="text-2xl font-medium text-[var(--text-primary)] tabular-nums tracking-tight">
            {setup.percent}%
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {setup.completedCount} of {setup.totalCount} complete
          </p>
        </div>
      </div>

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
        <div
          className="h-full rounded-full bg-[var(--accent-cyan)] transition-all duration-500"
          style={{ width: `${setup.percent}%` }}
        />
      </div>

      <ul
        className={cn(
          "grid gap-2",
          compact ? "grid-cols-1" : "sm:grid-cols-2"
        )}
      >
        {setup.items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2.5",
              item.complete
                ? "border-[rgba(52,211,153,0.12)] bg-[rgba(52,211,153,0.04)]"
                : "border-[var(--border-subtle)] bg-white/[0.02]"
            )}
          >
            {item.complete ? (
              <Check className="h-3.5 w-3.5 text-[var(--accent-green)] shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[12px] font-medium",
                  item.complete
                    ? "text-[var(--text-secondary)]"
                    : "text-[var(--text-primary)]"
                )}
              >
                {item.label}
              </p>
              {!compact && item.description && (
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)] leading-snug">
                  {item.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </PremiumCard>
  );
}
