"use client";

import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProjectSwitcher() {
  const { isPlatformOwner } = useAuth();
  const { needsPlatformSetup } = useCompany();
  const { activeProject, accessibleProjectsAll, setActiveProject } = useProject();
  const router = useRouter();
  const singleProject = accessibleProjectsAll.length === 1 ? accessibleProjectsAll[0] : null;

  if (needsPlatformSetup && isPlatformOwner) {
    return (
      <button
        onClick={() => router.push("/platform-setup?step=project")}
        className="hidden sm:flex min-w-[180px] max-w-[280px] flex-1 flex-col text-left rounded-[var(--radius-sm)] border border-dashed border-[var(--border-subtle)] px-3 py-1.5 transition-colors hover:border-[var(--border-default)]"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Progetto
        </span>
        <span className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
          Crea il primo progetto
        </span>
      </button>
    );
  }

  return (
    <div className="min-w-[180px] max-w-[280px] flex-1 hidden sm:block">
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
        Progetto
      </label>
      <div className="relative">
        <select
          value={activeProject?.id ?? ""}
          onChange={(e) => {
            if (e.target.value) {
              setActiveProject(e.target.value);
              router.push(`/projects/${e.target.value}`);
            }
          }}
          className="h-8 w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-3 pr-8 text-[13px] text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-default)] focus:border-[rgba(34,211,238,0.35)] focus:outline-none focus:ring-2 focus:ring-[rgba(34,211,238,0.08)]"
        >
          <option value="">
            {accessibleProjectsAll.length === 0
              ? "Nessun progetto assegnato"
              : singleProject
                ? singleProject.title
                : "Seleziona progetto"}
          </option>
          {accessibleProjectsAll.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
      </div>
    </div>
  );
}
