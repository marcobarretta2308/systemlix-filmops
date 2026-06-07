"use client";

import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { canViewProject, isProjectRestricted } from "@/lib/permissions";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const PUBLIC_PATHS = ["/login", "/select-company"];

export function ProjectGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { activeCompany, companyRole } = useCompany();
  const { activeProject, projectRole } = useProject();
  const router = useRouter();
  const pathname = usePathname();

  const isProjectRoute = pathname.includes("/projects/") && !pathname.endsWith("/projects") && !pathname.endsWith("/projects/new");

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!activeCompany && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/select-company");
    }
  }, [isAuthenticated, activeCompany, pathname, router]);

  if (!isAuthenticated) return null;

  if (!activeCompany && !PUBLIC_PATHS.includes(pathname)) return null;

  if (
    isProjectRoute &&
    activeProject &&
    isProjectRestricted(activeProject.status) &&
    companyRole &&
    !canViewProject(activeProject, companyRole, projectRole ?? undefined)
  ) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-8">
        <div className="max-w-md rounded-lg border border-red-500/30 bg-red-500/10 p-8">
          <h2 className="text-xl font-semibold text-red-300">
            Progetto non accessibile
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Questo progetto è stato archiviato o bloccato. L&apos;accesso è
            disabilitato per il tuo ruolo. Contatta un amministratore.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
