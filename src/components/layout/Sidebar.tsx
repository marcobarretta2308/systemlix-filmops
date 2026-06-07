"use client";

import { useCompany, useProject } from "@/lib/context/PlatformContext";
import { cn } from "@/lib/utils/cn";
import {
  Archive,
  Bot,
  Building2,
  Calendar,
  Clapperboard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  Plus,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function projectNav(projectId: string) {
  return [
    { href: `/projects/${projectId}`, label: "Panoramica", icon: Clapperboard },
    { href: `/projects/${projectId}/script-breakdown`, label: "Script Breakdown", icon: ScrollText },
    { href: `/projects/${projectId}/scenes`, label: "Scene", icon: FileText },
    { href: `/projects/${projectId}/cast-crew`, label: "Cast & Crew", icon: Users },
    { href: `/projects/${projectId}/locations`, label: "Location", icon: MapPin },
    { href: `/projects/${projectId}/shooting-days`, label: "Giornate", icon: Calendar },
    { href: `/projects/${projectId}/call-sheets`, label: "Call Sheet", icon: FileText },
    { href: `/projects/${projectId}/set-assistant`, label: "Set Assistant", icon: Bot },
    { href: `/projects/${projectId}/archive`, label: "Archivio", icon: Archive },
  ];
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] transition-colors duration-150",
        active
          ? "text-[var(--text-primary)] bg-white/[0.05]"
          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.03]"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-[var(--accent-cyan)]" />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[var(--text-secondary)]" : "opacity-60")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { activeCompany } = useCompany();
  const { activeProject } = useProject();

  const platformNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/workspaces", label: "Workspace", icon: Building2, exact: true },
    { href: "/projects", label: "Progetti", icon: FolderKanban, exact: true },
    { href: "/projects/new", label: "Nuovo progetto", icon: Plus, exact: true },
  ];

  const projectLinks = activeProject ? projectNav(activeProject.id) : [];

  const isPlatformActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isProjectActive = (href: string) => {
    if (!activeProject) return false;
    if (href === `/projects/${activeProject.id}`) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-base)]"
      style={{ width: "var(--sidebar-width)" }}
    >
      <div className="flex h-[var(--topbar-height)] items-center gap-2.5 px-4 shrink-0 border-b border-[var(--border-subtle)]">
        <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <Clapperboard className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[var(--text-primary)] leading-none">Systemlix</p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)] mt-0.5">FilmOps</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Piattaforma
        </p>
        <ul className="space-y-0.5">
          {platformNav.map((item) => (
            <li key={item.href}>
              <NavItem
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isPlatformActive(item.href, item.exact)}
              />
            </li>
          ))}
        </ul>

        <div className="my-4 mx-2 h-px bg-[var(--border-subtle)]" />

        <p className="mb-2 px-2.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Progetto
        </p>

        {!activeProject ? (
          <p className="px-2.5 py-2 text-[12px] text-[var(--text-muted)] leading-relaxed">
            Seleziona un progetto per accedere agli strumenti.
          </p>
        ) : (
          <>
            <p
              className="mb-2 px-2.5 text-[12px] text-[var(--text-secondary)] leading-snug truncate"
              title={activeProject.title}
            >
              {activeProject.title}
            </p>
            <ul className="space-y-0.5">
              {projectLinks.map((item) => (
                <li key={item.href}>
                  <NavItem
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={isProjectActive(item.href)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-[var(--border-subtle)] px-4 py-3 shrink-0">
        <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Produzione attiva</p>
        <p className="mt-1 text-[12px] text-[var(--text-secondary)] truncate" title={activeCompany?.name}>
          {activeCompany?.name ?? "—"}
        </p>
      </div>
    </aside>
  );
}
