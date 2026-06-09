"use client";

import { Button } from "@/components/ui/Button";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import type { ModuleCardDef } from "@/lib/utils/project-dashboard";
import Link from "next/link";

interface ProductionEmptyInsightsProps {
  modules: ModuleCardDef[];
}

export function ProductionEmptyInsights({
  modules,
}: ProductionEmptyInsightsProps) {
  const emptyModules = modules.filter(
    (m) =>
      m.key !== "assistant" &&
      m.key !== "archive" &&
      m.count === 0
  );

  if (emptyModules.length === 0) return null;

  const teamEmpty = emptyModules.some((m) => m.key === "cast");

  return (
    <section>
      <SectionTitle
        title="Recommended next steps"
        description="Complete these items to move production forward"
      />
      <div className="grid gap-[var(--card-gap)] sm:grid-cols-2">
        {emptyModules.slice(0, 4).map((mod) => (
          <PremiumCard
            key={mod.key}
            padding="md"
            className="border-dashed border-[var(--border-subtle)]"
          >
            <p className="text-[13px] font-medium text-[var(--text-primary)]">
              {mod.emptyTitle}
            </p>
            <p className="mt-2 text-[12px] text-[var(--text-muted)] leading-relaxed">
              {mod.emptyDescription}
            </p>
            <Link href={mod.href} className="inline-block mt-4">
              <Button variant="outline" size="sm">
                Open {mod.label}
              </Button>
            </Link>
          </PremiumCard>
        ))}
        {teamEmpty && (
          <PremiumCard
            padding="md"
            className="border-dashed border-[var(--border-subtle)]"
          >
            <p className="text-[13px] font-medium text-[var(--text-primary)]">
              No team members invited yet
            </p>
            <p className="mt-2 text-[12px] text-[var(--text-muted)] leading-relaxed">
              Add departments and crew to control project access.
            </p>
            <Link href="/admin/access" className="inline-block mt-4">
              <Button variant="outline" size="sm">
                Manage access
              </Button>
            </Link>
          </PremiumCard>
        )}
      </div>
    </section>
  );
}
