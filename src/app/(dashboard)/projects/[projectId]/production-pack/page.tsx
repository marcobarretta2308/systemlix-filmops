"use client";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Toast } from "@/components/ui/Toast";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useProject } from "@/lib/context/PlatformContext";
import { canGenerateProductionPack } from "@/lib/production-pack/permissions";
import {
  DEFAULT_PRODUCTION_PACK_SECTIONS,
  PRODUCTION_PACK_SECTION_IDS,
  PRODUCTION_PACK_SECTION_LABELS,
  type ProductionPackSectionId,
} from "@/lib/production-pack/types";
import { FileDown, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export default function ProductionPackPage() {
  const { projectId, isProjectReady } = useSyncProjectFromUrl();
  const { projectRole, activeProject } = useProject();

  const canGenerate = canGenerateProductionPack(projectRole);

  const [sections, setSections] = useState<Set<ProductionPackSectionId>>(
    () => new Set(DEFAULT_PRODUCTION_PACK_SECTIONS)
  );
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  const allSelected = useMemo(
    () => PRODUCTION_PACK_SECTION_IDS.every((id) => sections.has(id)),
    [sections]
  );

  const toggleSection = useCallback((id: ProductionPackSectionId) => {
    setSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSections(
      allSelected
        ? new Set<ProductionPackSectionId>()
        : new Set(DEFAULT_PRODUCTION_PACK_SECTIONS)
    );
  }, [allSelected]);

  const handleGenerate = useCallback(async () => {
    if (!projectId || sections.size === 0) return;

    setLoading(true);
    setToast(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/production-pack`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: [...sections] }),
        }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          payload.error ?? `Request failed (${response.status})`
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] ??
        `systemlix-production-pack-${activeProject?.title ?? "project"}.pdf`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setToast({
        message: "Production pack downloaded successfully.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      if (process.env.NODE_ENV === "development") {
        console.error("[FilmOps] Production pack generation failed:", error);
      }
      setToast({
        message: `Failed to generate production pack: ${message}`,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [activeProject?.title, projectId, sections]);

  if (!isProjectReady) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-zinc-500">
        Loading project…
      </div>
    );
  }

  if (!canGenerate) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="One-Click Production Pack"
          description="Generate a clean, production-ready PDF package from your project data."
        />
        <PremiumCard>
          <p className="text-sm text-zinc-400">
            You do not have access to generate a production pack for this
            project.
          </p>
        </PremiumCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toast
        message={toast?.message ?? ""}
        open={Boolean(toast)}
        variant={toast?.variant ?? "info"}
        onClose={() => setToast(null)}
      />

      <PageHeader
        title="One-Click Production Pack"
        description="Generate a clean, production-ready PDF package from your project data."
      />

      <PremiumCard>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-zinc-200">
              Pack configuration
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Select which sections to include in your PDF export. Data is
              read-only — nothing in the project will be modified.
            </p>
          </div>

          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Sections
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {PRODUCTION_PACK_SECTION_IDS.map((id) => (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition hover:border-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={sections.has(id)}
                  onChange={() => toggleSection(id)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500/40"
                />
                <span className="text-sm text-zinc-200">
                  {PRODUCTION_PACK_SECTION_LABELS[id]}
                </span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4">
            <Button
              onClick={handleGenerate}
              disabled={loading || sections.size === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating production pack…
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Generate Production Pack PDF
                </>
              )}
            </Button>
            {sections.size === 0 && (
              <span className="text-xs text-amber-400">
                Select at least one section to generate the pack.
              </span>
            )}
          </div>
        </div>
      </PremiumCard>
    </div>
  );
}
