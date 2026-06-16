"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "@/components/ui/Table";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { FolderKanban, Plus } from "lucide-react";
import Link from "next/link";

export default function ProjectsPage() {
  const { isPlatformOwner } = useAuth();
  const {
    activeCompany,
    activeWorkspace,
    canCreateProject,
    needsPlatformSetup,
    isLoading: companyLoading,
  } = useCompany();
  const {
    accessibleProjectsAll,
    setActiveProject,
    projectsLoading,
    projectsLoadError,
  } = useProject();

  const isLoadingProjects = companyLoading || projectsLoading;

  const newProjectHref =
    needsPlatformSetup && isPlatformOwner
      ? "/platform-setup?step=project"
      : "/projects/new";

  const filtered = activeWorkspace
    ? accessibleProjectsAll.filter((p) => p.workspace_id === activeWorkspace.id)
    : accessibleProjectsAll;

  return (
    <div>
      {projectsLoadError && (
        <PremiumCard padding="md" variant="ghost" className="mb-6 border-red-500/30 bg-red-500/5">
          <p className="text-[13px] text-red-300">{projectsLoadError}</p>
        </PremiumCard>
      )}

      <PageHeader
        title="Progetti"
        description={
          activeWorkspace
            ? `${activeWorkspace.name} · ${activeCompany?.name}`
            : `Tutti i progetti · ${activeCompany?.name}`
        }
        actions={
          canCreateProject && (
            <Link href={newProjectHref}>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Crea nuovo progetto
              </Button>
            </Link>
          )
        }
      />

      {isLoadingProjects ? (
        <PremiumCard padding="lg" variant="ghost" className="border-[var(--border-subtle)]">
          <p className="text-[13px] text-[var(--text-muted)]">Caricamento progetti…</p>
        </PremiumCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nessun progetto presente"
          description="Crea il primo progetto in questo workspace per iniziare."
          action={
            canCreateProject && (
              <Link href={newProjectHref}>
                <Button size="sm">Crea nuovo progetto</Button>
              </Link>
            )
          }
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Progetto</TableTh>
              <TableTh>Tipo</TableTh>
              <TableTh>Stato</TableTh>
              <TableTh>Date</TableTh>
              <TableTh className="text-right">Azioni</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableTd>
                  <p className="font-medium text-slate-200">{p.title}</p>
                  <p className="text-[12px] text-slate-600 mt-0.5 line-clamp-1">{p.description}</p>
                </TableTd>
                <TableTd className="text-slate-400">{p.production_type}</TableTd>
                <TableTd>
                  <StatusBadge status={p.status} />
                </TableTd>
                <TableTd className="text-[12px] text-slate-500">
                  {p.start_date && new Date(p.start_date).toLocaleDateString("it-IT")}
                  {p.end_date && ` — ${new Date(p.end_date).toLocaleDateString("it-IT")}`}
                </TableTd>
                <TableTd className="text-right">
                  <Link
                    href={`/projects/${p.id}`}
                    onClick={() => setActiveProject(p.id)}
                    className="text-[13px] text-slate-500 hover:text-cyan-400/90 transition-colors"
                  >
                    Apri →
                  </Link>
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
