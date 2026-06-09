"use client";

import { PremiumCard } from "@/components/ui/PremiumCard";
import type { BreakdownProgressStage } from "@/lib/script-breakdown/types";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

const STAGES: { key: BreakdownProgressStage; label: string }[] = [
  { key: "extracting", label: "Extracting text from PDF" },
  { key: "detecting_scenes", label: "Detecting scene headings" },
  { key: "splitting_chunks", label: "Splitting into chunks" },
  { key: "analyzing_chunk", label: "Analyzing chunks" },
  { key: "merging", label: "Merging breakdown" },
  { key: "quality_check", label: "Running quality check" },
  { key: "ready", label: "Ready for review" },
];

function stageIndex(stage: BreakdownProgressStage): number {
  const idx = STAGES.findIndex((s) => s.key === stage);
  return idx >= 0 ? idx : 0;
}

function formatFileSize(bytes?: number): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BreakdownProgressPanel({
  stage,
  currentChunk,
  totalChunks,
  message,
  extraction,
  uploadStatus,
}: {
  stage: BreakdownProgressStage;
  currentChunk?: number;
  totalChunks?: number;
  message: string;
  extraction?: {
    file_name?: string;
    mime_type?: string;
    file_size?: number;
    estimated_pages?: number;
    character_count?: number;
    detected_scenes_count?: number;
    chunk_count?: number;
    large_script_warning?: boolean;
    extraction_warning?: string;
  };
  uploadStatus?: string;
}) {
  const activeIdx = stageIndex(stage);

  return (
    <PremiumCard padding="md" className="space-y-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Analysis progress
        </p>
        {uploadStatus && (
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">{uploadStatus}</p>
        )}
        <p className="mt-1 text-[13px] text-[var(--accent-cyan)]">{message}</p>
        {stage === "analyzing_chunk" && totalChunks ? (
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            Analyzing chunk {currentChunk ?? 0} of {totalChunks}
          </p>
        ) : null}
      </div>

      {extraction && (
        <div className="grid gap-2 text-[11px] text-[var(--text-muted)] sm:grid-cols-2">
          {extraction.file_name && <p>File: {extraction.file_name}</p>}
          {extraction.mime_type && <p>Type: {extraction.mime_type}</p>}
          {formatFileSize(extraction.file_size) && (
            <p>Size: {formatFileSize(extraction.file_size)}</p>
          )}
          {extraction.estimated_pages != null && extraction.estimated_pages > 0 && (
            <p>Pages: {extraction.estimated_pages}</p>
          )}
          {extraction.character_count != null && (
            <p>Characters extracted: {extraction.character_count.toLocaleString()}</p>
          )}
          {extraction.detected_scenes_count != null && (
            <p>Scene headings: {extraction.detected_scenes_count}</p>
          )}
          {extraction.chunk_count != null && extraction.chunk_count > 0 && (
            <p>Estimated chunks: {extraction.chunk_count}</p>
          )}
        </div>
      )}

      {extraction?.extraction_warning && (
        <p className="text-[12px] text-[var(--accent-amber)]">
          {extraction.extraction_warning}
        </p>
      )}

      {extraction?.large_script_warning && (
        <p className="text-[12px] text-[var(--accent-amber)]">
          Large script detected. Analysis may take several minutes.
        </p>
      )}

      <ul className="space-y-2">
        {STAGES.map((item, idx) => {
          const done = idx < activeIdx || stage === "ready";
          const active = idx === activeIdx && stage !== "ready";
          const label =
            item.key === "analyzing_chunk" && totalChunks
              ? `Analyzing chunk ${currentChunk ?? "…"} of ${totalChunks}`
              : item.label;

          return (
            <li key={item.key} className="flex items-center gap-2 text-[12px]">
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
              ) : active ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-cyan)]" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              )}
              <span
                className={
                  active || done
                    ? "text-[var(--text-secondary)]"
                    : "text-[var(--text-muted)]"
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </PremiumCard>
  );
}
