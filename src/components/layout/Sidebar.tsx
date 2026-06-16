"use client";

import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { canViewActivityLog } from "@/lib/activity-log/permissions";
import { canViewDocuments } from "@/lib/documents/permissions";
import {
  getDepartmentDashboardLabel,
  shouldShowProjectNavItem,
  type ProjectPermissions,
} from "@/lib/permissions/project-permissions";
import { cn } from "@/lib/utils/cn";
import {
  Archive,
  Bot,
  Brain,
  Building2,
  Package,
  Calendar,
  Clapperboard,
  ClipboardList,
  FileText,
  FolderOpen,
  History,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  Plus,
  ScrollText,
  Shield,
  Shirt,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItemDef = {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  visible?: (permissions: ProjectPermissions, isDepartment: boolean) => boolean;
};

function projectNav(
  projectId: string,
  department?: string | null,
  canShowArchive = false,
  canShowActivityLog = false
): NavItemDef[] {
  const departmentLabel = getDepartmentDashboardLabel(department);

  return [
    {
      key: "overview",
      href: `/projects/${projectId}`,
      label: "Dashboard",
      icon: Clapperboard,
      visible: (_p, isDept) => !isDept,
    },
    {
      key: "department",
      href: `/projects/${projectId}/department`,
      label: departmentLabel,
      icon: Shirt,
      visible: (_p, isDept) => isDept,
    },
    {
      key: "script-breakdown",
      href: `/projects/${projectId}/script-breakdown`,
      label: "Script Breakdown",
      icon: ScrollText,
      visible: (p) => p.can_view_breakdown,
    },
    {
      key: "scenes",
      href: `/projects/${projectId}/scenes`,
      label: "Scenes",
      icon: FileText,
      visible: (p) => p.can_view_scenes,
    },
    {
      key: "cast-crew",
      href: `/projects/${projectId}/cast-crew`,
      label: "Cast & Crew",
      icon: Users,
      visible: (p) => p.can_view_cast_crew,
    },
    {
      key: "locations",
      href: `/projects/${projectId}/locations`,
      label: "Locations",
      icon: MapPin,
      visible: (p) => p.can_view_locations,
    },
    {
      key: "shooting-days",
      href: `/projects/${projectId}/shooting-days`,
      label: "Shooting Days",
      icon: Calendar,
      visible: (p) => p.can_view_shooting_days,
    },
    {
      key: "call-sheets",
      href: `/projects/${projectId}/call-sheets`,
      label: "Call Sheets",
      icon: FileText,
      visible: (p) => p.can_view_call_sheets,
    },
    {
      key: "documents",
      href: `/projects/${projectId}/documents`,
      label: "Documents",
      icon: FolderOpen,
      visible: () => true,
    },
    {
      key: "production-reports",
      href: `/projects/${projectId}/production-reports`,
      label: "Production Reports",
      icon: ClipboardList,
      visible: (p) => p.can_view_production_reports,
    },
    {
      key: "production-intelligence",
      href: `/projects/${projectId}/production-intelligence`,
      label: "Production Intelligence",
      icon: Brain,
      visible: (p) => p.can_view_set_assistant || p.can_view_call_sheets,
    },
    {
      key: "production-pack",
      href: `/projects/${projectId}/production-pack`,
      label: "Production Pack",
      icon: Package,
      visible: (p) =>
        p.can_view_call_sheets ||
        p.can_view_scenes ||
        p.can_view_production_reports,
    },
    {
      key: "set-assistant",
      href: `/projects/${projectId}/set-assistant`,
      label: "Set Assistant",
      icon: Bot,
      visible: (p) => p.can_view_set_assistant,
    },
    {
      key: "activity-log",
      href: `/projects/${projectId}/activity-log`,
      label: "Activity Log",
      icon: History,
      visible: (_p, isDept) => !isDept && canShowActivityLog,
    },
    {
      key: "archive",
      href: `/projects/${projectId}/archive`,
      label: "Archive / Lock",
      icon: Archive,
      visible: (_p, isDept) => !isDept && canShowArchive,
    },
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
  const { isPlatformOwner, user } = useAuth();
  const { activeCompany, canCreateProject, needsPlatformSetup, isLoading, companyRole } =
    useCompany();
  const {
    activeProject,
    projectPermissions,
    isDepartmentDashboard,
    canManageAccess,
    canArchiveProject,
    canDeleteProject,
    accessibleProjectsAll,
    projectRole,
  } = useProject();

  const canViewProjectActivityLog = canViewActivityLog(
    user,
    companyRole ?? "viewer",
    projectRole ?? undefined
  );

  const showDocumentsNav = canViewDocuments(user, companyRole, projectRole);

  const isDepartmentNav = isDepartmentDashboard;

  const newProjectHref =
    needsPlatformSetup && isPlatformOwner ? "/platform-setup?step=project" : "/projects/new";

  const platformNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ...(needsPlatformSetup && isPlatformOwner
      ? [{ href: "/platform-setup", label: "Platform Setup", icon: Plus, exact: true }]
      : []),
    { href: "/workspaces", label: "Workspace", icon: Building2, exact: true },
    { href: "/projects", label: "Progetti", icon: FolderKanban, exact: true },
    ...(canCreateProject
      ? [{ href: newProjectHref, label: "Nuovo progetto", icon: Plus, exact: true }]
      : []),
    ...(isPlatformOwner || canManageAccess
      ? [{ href: "/admin/access", label: "Gestione accessi", icon: Shield, exact: true }]
      : []),
  ];

  const projectLinks = activeProject
    ? projectNav(
        activeProject.id,
        projectPermissions.department,
        canArchiveProject || canDeleteProject,
        canViewProjectActivityLog
      ).filter((item) => {
        if (item.key === "documents" && !showDocumentsNav) return false;
        const defaultVisible = item.visible
          ? item.visible(projectPermissions, isDepartmentDashboard)
          : true;
        return shouldShowProjectNavItem(
          item.key,
          projectPermissions,
          isDepartmentDashboard,
          defaultVisible
        );
      })
    : [];

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
          <p className="text-[13px] font-medium text-[var(--text-primary)] leading-none">FilmOps</p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)] mt-0.5">FilmOps</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {!isDepartmentNav && (
          <>
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
          </>
        )}

        <p className="mb-2 px-2.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Progetto
        </p>

        {!activeProject ? (
          <p className="px-2.5 py-2 text-[12px] text-[var(--text-muted)] leading-relaxed">
            {accessibleProjectsAll.length === 0
              ? "Nessun progetto assegnato."
              : "Seleziona un progetto per accedere agli strumenti."}
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
          {activeCompany?.name ??
            (needsPlatformSetup && isPlatformOwner && !isLoading
              ? "Configura produzione"
              : "—")}
        </p>
      </div>
    </aside>
  );
}
