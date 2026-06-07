"use client";

import { useAuth, useCompany } from "@/lib/context/PlatformContext";
import { useRouter } from "next/navigation";

interface CompanySwitcherProps {
  showWorkspace?: boolean;
}

export function CompanySwitcher({ showWorkspace = true }: CompanySwitcherProps) {
  const { isPlatformOwner } = useAuth();
  const { activeCompany, activeWorkspace, needsPlatformSetup } = useCompany();
  const router = useRouter();

  if (needsPlatformSetup && isPlatformOwner) {
    return (
      <button
        onClick={() => router.push("/platform-setup")}
        className="group flex min-w-[180px] flex-col text-left rounded-[var(--radius-sm)] border border-[rgba(34,211,238,0.2)] bg-[rgba(34,211,238,0.04)] px-3 py-2 transition-colors hover:border-[rgba(34,211,238,0.35)]"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--accent-cyan)]">
          Platform Setup
        </span>
        <span className="mt-0.5 text-[13px] text-[var(--text-primary)]">
          Configura la prima produzione
        </span>
      </button>
    );
  }

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
          {activeCompany?.name ?? "Seleziona produzione"}
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
