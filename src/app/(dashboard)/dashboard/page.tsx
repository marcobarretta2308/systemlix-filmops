"use client";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { Building2, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    activeCompany,
    activeWorkspace,
    companyWorkspaces,
    canCreateWorkspace,
    canCreateProject,
    canManagePlatform,
  } = useCompany();
  const { accessibleProjects, activeProject } = useProject();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={
          activeCompany
            ? `${activeCompany.name}${activeWorkspace ? ` · ${activeWorkspace.name}` : ""}`
            : "Seleziona una produzione"
        }
      />

      <PremiumCard padding="lg" variant="ghost" className="border-[var(--border-subtle)]">
        <h2 className="text-[16px] font-medium text-[var(--text-primary)] tracking-tight leading-relaxed max-w-xl">
          Gestisci produzioni, progetti e strumenti AI per breakdown, call sheet e assistenza al set.
        </h2>
        <p className="mt-2 text-[13px] text-[var(--text-muted)]">
          Benvenuto, {user?.full_name}. {companyWorkspaces.length} workspace · {accessibleProjects.length} progetti
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {canManagePlatform && (
            <Link href="/select-company">
              <Button variant="secondary" size="sm">
                <Building2 className="h-3.5 w-3.5" />Gestisci produzione
              </Button>
            </Link>
          )}
          {canCreateWorkspace && (
            <Link href="/workspaces">
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5" />Crea workspace
              </Button>
            </Link>
          )}
          {canCreateProject && (
            <Link href="/projects/new">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />Crea nuovo progetto
              </Button>
            </Link>
          )}
          {activeProject && (
            <Link href={`/projects/${activeProject.id}`}>
              <Button variant="ghost" size="sm">
                <FolderKanban className="h-3.5 w-3.5" />Apri progetto
              </Button>
            </Link>
          )}
        </div>
      </PremiumCard>

      <div className="grid gap-[var(--card-gap)] lg:grid-cols-2">
        <PremiumCard padding="md">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mb-4">Workspace</p>
          <ul className="space-y-1">
            {companyWorkspaces.map((ws) => (
              <li
                key={ws.id}
                className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 transition-colors hover:bg-white/[0.02]"
              >
                <span className="text-[13px] text-[var(--text-secondary)]">{ws.name}</span>
                {activeWorkspace?.id === ws.id && (
                  <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Attivo</span>
                )}
              </li>
            ))}
            {companyWorkspaces.length === 0 && (
              <p className="text-[13px] text-[var(--text-muted)]">Nessun workspace.</p>
            )}
          </ul>
          <Link href="/workspaces" className="mt-4 inline-block text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            Gestisci workspace →
          </Link>
        </PremiumCard>

        <PremiumCard padding="md">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mb-4">Progetti recenti</p>
          <ul className="space-y-1">
            {accessibleProjects.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 transition-all hover:bg-white/[0.02]"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] text-[var(--text-primary)] truncate">{p.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{p.production_type}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
            {accessibleProjects.length === 0 && (
              <p className="text-[13px] text-[var(--text-muted)]">Nessun progetto.</p>
            )}
          </ul>
          <Link href="/projects" className="mt-4 inline-block text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            Tutti i progetti →
          </Link>
        </PremiumCard>
      </div>
    </div>
  );
}
