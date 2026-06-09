"use client";

import { PremiumCard } from "@/components/ui/PremiumCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import type { ModuleCardDef } from "@/lib/utils/project-dashboard";
import { cn } from "@/lib/utils/cn";
import {
  Archive,
  Bot,
  Calendar,
  FileText,
  FolderOpen,
  MapPin,
  ScrollText,
  Users,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  breakdown: ScrollText,
  scenes: FileText,
  cast: Users,
  locations: MapPin,
  days: Calendar,
  callsheets: FileText,
  assistant: Bot,
  documents: FolderOpen,
  archive: Archive,
};

interface ModuleNavGridProps {
  modules: ModuleCardDef[];
  title?: string;
}

export function ModuleNavGrid({
  modules,
  title = "Production modules",
}: ModuleNavGridProps) {
  if (modules.length === 0) return null;

  return (
    <section>
      <SectionTitle title={title} description="Access tools and datasets for this project" />
      <div className="grid gap-[var(--card-gap)] sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((mod) => {
          const Icon = ICONS[mod.key] ?? FileText;
          const showCount =
            mod.key !== "assistant" && mod.key !== "archive";
          const isEmpty = showCount && mod.count === 0;

          return (
            <Link key={mod.key} href={mod.href} className="group block h-full">
              <PremiumCard
                padding="md"
                hover
                className={cn(
                  "h-full flex flex-col",
                  isEmpty && "border-dashed"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                    <Icon className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[13px] font-medium text-[var(--text-primary)]">
                  {mod.label}
                </p>
                {showCount && (
                  <p className="mt-1 text-xl font-medium text-[var(--text-primary)] tabular-nums">
                    {mod.count}
                  </p>
                )}
                {isEmpty ? (
                  <p className="mt-2 text-[11px] text-[var(--text-muted)] leading-relaxed flex-1">
                    {mod.emptyDescription}
                  </p>
                ) : mod.key === "assistant" ? (
                  <p className="mt-2 text-[11px] text-[var(--text-muted)] leading-relaxed flex-1">
                    {mod.emptyDescription}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                    Open module
                  </p>
                )}
              </PremiumCard>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
