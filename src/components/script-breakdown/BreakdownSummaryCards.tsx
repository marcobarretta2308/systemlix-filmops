"use client";

import { PremiumCard } from "@/components/ui/PremiumCard";
import type { ProBreakdownResult } from "@/lib/ai/script-breakdown-pro";
import { AlertTriangle, FileText, MapPin, Users } from "lucide-react";

export function BreakdownSummaryCards({
  breakdown,
}: {
  breakdown: ProBreakdownResult;
}) {
  const s = breakdown.project_summary;
  const cards = [
    {
      label: "Scenes",
      value: s.total_scenes || breakdown.scenes.length,
      icon: FileText,
    },
    {
      label: "Characters",
      value: s.detected_characters_count || breakdown.characters.length,
      icon: Users,
    },
    {
      label: "Locations",
      value: s.detected_locations_count || breakdown.locations.length,
      icon: MapPin,
    },
    {
      label: "Warnings",
      value: s.production_warnings.length,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid gap-[var(--card-gap)] sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <PremiumCard key={card.label} padding="md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {card.label}
              </p>
              <p className="mt-1.5 text-2xl font-medium text-[var(--text-primary)] tabular-nums">
                {card.value}
              </p>
              {card.label === "Scenes" && s.title_guess && (
                <p className="mt-1 text-[11px] text-[var(--text-muted)] truncate" title={s.title_guess}>
                  {s.title_guess}
                </p>
              )}
            </div>
            <card.icon className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
          </div>
        </PremiumCard>
      ))}
    </div>
  );
}
