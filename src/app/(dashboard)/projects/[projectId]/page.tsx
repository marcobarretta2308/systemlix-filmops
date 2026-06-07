"use client";

import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ToolCard } from "@/components/ui/ToolCard";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useCompany, useProject } from "@/lib/context/PlatformContext";
import { PROJECT_ROLE_LABELS } from "@/lib/permissions";
import {
  Bot,
  Calendar,
  FileText,
  MapPin,
  ScrollText,
  Users,
  Activity,
} from "lucide-react";
import Link from "next/link";

export default function ProjectDetailPage() {
  const { projectId, project } = useSyncProjectFromUrl();
  const { activeCompany, activeWorkspace } = useCompany();
  const {
    scenes,
    castCrew,
    shootingDays,
    callSheets,
    locations,
    projectRole,
    canEditProject,
  } = useProject();

  if (!project || !projectId) {
    return (
      <p className="text-[13px] text-[var(--text-muted)]">
        Progetto non trovato o accesso non autorizzato.
      </p>
    );
  }

  const tools = [
    {
      title: "Script Breakdown AI",
      description: "Analisi copione e estrazione automatica delle scene",
      href: `/projects/${projectId}/script-breakdown`,
      icon: ScrollText,
      meta: `${scenes.length} scene nel database`,
    },
    {
      title: "Call Sheet Generator",
      description: "Genera e gestisci fogli di lavoro professionali",
      href: `/projects/${projectId}/call-sheets`,
      icon: FileText,
      meta: `${callSheets.length} versioni salvate`,
    },
    {
      title: "Set Assistant",
      description: "Assistente interno con dati del progetto attivo",
      href: `/projects/${projectId}/set-assistant`,
      icon: Bot,
      meta: "Risposte operative contestuali",
    },
  ];

  const modules = [
    { label: "Scene", href: `/projects/${projectId}/scenes`, icon: FileText, count: scenes.length, hint: "Database scene" },
    { label: "Cast & Crew", href: `/projects/${projectId}/cast-crew`, icon: Users, count: castCrew.length, hint: "Persone" },
    { label: "Location", href: `/projects/${projectId}/locations`, icon: MapPin, count: locations.length, hint: "Set" },
    { label: "Giornate", href: `/projects/${projectId}/shooting-days`, icon: Calendar, count: shootingDays.length, hint: "Riprese" },
    { label: "Call Sheet", href: `/projects/${projectId}/call-sheets`, icon: FileText, count: callSheets.length, hint: "Versioni" },
  ];

  const activities = [
    { label: "Progetto creato", time: project.created_at ? new Date(project.created_at).toLocaleDateString("it-IT") : "—" },
    { label: "Breakdown aggiornato", time: scenes.length > 0 ? "Recente" : "—" },
    { label: "Call sheet generato", time: callSheets.length > 0 ? `${callSheets.length} versioni` : "—" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: activeCompany?.name ?? "Produzione", href: "/dashboard" },
              { label: activeWorkspace?.name ?? "Workspace", href: "/workspaces" },
              { label: project.title },
            ]}
          />
        }
        title={project.title}
        description={project.description}
        badge={<StatusBadge status={project.status} />}
        actions={
          <div className="flex gap-2">
            <Link href={`/projects/${projectId}/script-breakdown`}>
              <Button size="sm">Apri strumenti</Button>
            </Link>
            <Link href={`/projects/${projectId}/archive`}>
              <Button variant="outline" size="sm">Archivia progetto</Button>
            </Link>
          </div>
        }
      />

      {/* Overview row */}
      <div className="grid gap-[var(--card-gap)] grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Produzione", value: activeCompany?.name ?? "—" },
          { label: "Tipo", value: project.production_type },
          { label: "Stato", value: null, badge: true },
          { label: "Ruolo", value: projectRole ? PROJECT_ROLE_LABELS[projectRole] : "—" },
        ].map((item) => (
          <PremiumCard key={item.label} padding="sm">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {item.label}
            </p>
            {item.badge ? (
              <div className="mt-2"><StatusBadge status={project.status} /></div>
            ) : (
              <p className="mt-1.5 text-[13px] text-[var(--text-primary)] truncate" title={item.value ?? ""}>
                {item.value}
              </p>
            )}
          </PremiumCard>
        ))}
      </div>

      {/* Tools */}
      <section>
        <SectionTitle title="Strumenti principali" />
        <div className="grid gap-[var(--card-gap)] sm:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.href} {...tool} />
          ))}
        </div>
      </section>

      {/* Database */}
      <section>
        <SectionTitle title="Database progetto" />
        <div className="grid gap-[var(--card-gap)] grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {modules.map((mod) => (
            <StatCard key={mod.href} label={mod.label} value={mod.count} icon={mod.icon} href={mod.href} hint={mod.hint} />
          ))}
        </div>
      </section>

      {/* Activity */}
      <section>
        <SectionTitle title="Ultime attività" />
        <PremiumCard padding="md">
          <ul className="divide-y divide-[var(--border-subtle)]">
            {activities.map((a) => (
              <li key={a.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <Activity className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span className="text-[13px] text-[var(--text-secondary)]">{a.label}</span>
                </div>
                <span className="text-[12px] text-[var(--text-muted)]">{a.time}</span>
              </li>
            ))}
          </ul>
        </PremiumCard>
      </section>

      {!canEditProject && (
        <p className="text-[12px] text-[var(--text-muted)]">
          Modalità limitata — modifica non disponibile per il tuo ruolo o stato progetto.
        </p>
      )}
    </div>
  );
}
