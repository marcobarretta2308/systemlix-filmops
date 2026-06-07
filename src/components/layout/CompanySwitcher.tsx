"use client";

import { useCompany } from "@/lib/context/PlatformContext";
import { useRouter } from "next/navigation";

interface CompanySwitcherProps {
  showWorkspace?: boolean;
}

export function CompanySwitcher({ showWorkspace = true }: CompanySwitcherProps) {
  const { activeCompany, activeWorkspace } = useCompany();
  const router = useRouter();

  return (
    <div className="flex items-end gap-5 min-w-0">
      <button
        onClick={() => router.push("/select-company")}
        className="group flex min-w-[130px] max-w-[180px] flex-col text-left transition-opacity duration-150 hover:opacity-80"
        title={activeCompany?.name}
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Produzione
        </span>
        <span className="mt-0.5 text-[13px] text-[var(--text-secondary)] truncate">
          {activeCompany?.name ?? "—"}
        </span>
      </button>

      {showWorkspace && activeWorkspace && (
        <>
          <div className="hidden h-7 w-px bg-[var(--border-subtle)] sm:block shrink-0" />
          <div className="hidden sm:flex flex-col min-w-[120px] max-w-[160px]" title={activeWorkspace.name}>
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Workspace
            </span>
            <span className="mt-0.5 text-[13px] text-[var(--text-secondary)] truncate">
              {activeWorkspace.name}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
