"use client";

import { AccessDenied } from "@/components/access/AccessDenied";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import {
  getAuthDenialReason,
  hasActiveCompanyAccess,
  isProjectFinished,
  isProjectMembershipActive,
} from "@/lib/access-control";
import { canViewProject } from "@/lib/permissions";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const PUBLIC_PATHS = ["/login", "/select-company", "/no-access", "/request-access", "/onboarding"];
const PLATFORM_ADMIN_PREFIX = "/admin";

/** Platform owner accede anche senza company_members o activeCompany */
const PLATFORM_OWNER_ALLOWED = [
  "/dashboard",
  "/admin",
  "/workspaces",
  "/projects",
  "/select-company",
  "/platform-setup",
];

function isPlatformOwnerPath(pathname: string) {
  return PLATFORM_OWNER_ALLOWED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function ProjectGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, authReady, profileLoading, isPlatformOwner } =
    useAuth();
  const {
    activeCompany,
    companyRole,
    userCompanies,
    isLoading: companyLoading,
    activeCompanyMembership,
  } = useCompany();
  const { activeProject, projectRole, activeProjectMembership } = useProject();
  const router = useRouter();
  const pathname = usePathname();

  const isAdminRoute = pathname.startsWith(PLATFORM_ADMIN_PREFIX);
  const isProjectRoute =
    pathname.includes("/projects/") &&
    !pathname.endsWith("/projects") &&
    !pathname.endsWith("/projects/new");

  const authDenial = getAuthDenialReason(user);

  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && user && authDenial && pathname !== "/login") {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && user && !companyLoading) {
      if (isPlatformOwner) {
        if (pathname === "/no-access") {
          router.replace("/dashboard");
        }
        return;
      }

      if (userCompanies.length === 0 && pathname !== "/no-access") {
        router.replace("/no-access");
        return;
      }

      if (
        userCompanies.length > 0 &&
        !activeCompany &&
        !PUBLIC_PATHS.includes(pathname) &&
        !isAdminRoute
      ) {
        router.replace("/select-company");
      }
    }
  }, [
    authReady,
    isAuthenticated,
    authDenial,
    activeCompany,
    userCompanies.length,
    companyLoading,
    pathname,
    router,
    isPlatformOwner,
    isAdminRoute,
  ]);

  if (!authReady || profileLoading || (isAuthenticated && companyLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) return null;

  if (
    authReady &&
    !profileLoading &&
    isAuthenticated &&
    !user &&
    !PUBLIC_PATHS.includes(pathname)
  ) {
    return (
      <AccessDenied message="Sessione attiva ma profilo non configurato. Contatta il team FilmOps o verifica public.profiles." />
    );
  }

  if (isAuthenticated && user && authDenial) {
    return (
      <AccessDenied
        message="Il tuo account non è abilitato o l'accesso è stato revocato. Contatta il team FilmOps."
      />
    );
  }

  if (
    isAuthenticated &&
    !isPlatformOwner &&
    userCompanies.length === 0 &&
    pathname !== "/no-access"
  ) {
    return null;
  }

  if (isPlatformOwner && pathname === "/no-access") {
    return null;
  }

  if (
    isAuthenticated &&
    !activeCompany &&
    !PUBLIC_PATHS.includes(pathname) &&
    !isAdminRoute &&
    !(isPlatformOwner && isPlatformOwnerPath(pathname))
  ) {
    return null;
  }

  if (isAdminRoute && !isPlatformOwner) {
    return (
      <AccessDenied message="Questa sezione è riservata al Platform Owner FilmOps." />
    );
  }

  if (
    activeCompany &&
    user &&
    !isPlatformOwner &&
    companyRole !== "platform_owner" &&
    companyRole !== "company_admin" &&
    activeCompanyMembership &&
    !hasActiveCompanyAccess([activeCompanyMembership], activeCompany.id)
  ) {
    return (
      <AccessDenied message="Il tuo account non è abilitato per questa produzione o l'accesso è stato revocato." />
    );
  }

  if (isProjectRoute && activeProject && user && companyRole) {
    const canView = canViewProject(
      activeProject,
      user,
      companyRole,
      projectRole ?? undefined,
      activeProjectMembership ?? undefined,
      activeCompanyMembership ?? undefined
    );

    if (!canView) {
      if (isProjectFinished(activeProject.status)) {
        return (
          <AccessDenied
            title="Accesso progetto non disponibile"
            message="Questo progetto è stato archiviato o bloccato. Contatta il team FilmOps o la produzione per maggiori informazioni."
            showContact={false}
          />
        );
      }
      return (
        <AccessDenied message="Il tuo account non è abilitato per questo progetto o l'accesso è stato revocato." />
      );
    }

    if (
      activeProjectMembership &&
      !isProjectMembershipActive(activeProjectMembership) &&
      !isPlatformOwner &&
      companyRole !== "company_admin"
    ) {
      if (isProjectFinished(activeProject.status)) {
        return (
          <AccessDenied
            title="Accesso progetto non disponibile"
            message="Questo progetto è stato archiviato o bloccato. Contatta il team FilmOps o la produzione per maggiori informazioni."
            showContact={false}
          />
        );
      }
      return (
        <AccessDenied message="Il tuo account non è abilitato per questo progetto o l'accesso è stato revocato." />
      );
    }
  }

  return <>{children}</>;
}
