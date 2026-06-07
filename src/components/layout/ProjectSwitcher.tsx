"use client";

import { useProject } from "@/lib/context/PlatformContext";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProjectSwitcher() {
  const { activeProject, accessibleProjectsAll, setActiveProject } = useProject();
  const router = useRouter();

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
          <option value="">Seleziona progetto</option>
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
