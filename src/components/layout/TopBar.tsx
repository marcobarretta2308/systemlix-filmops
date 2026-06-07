"use client";

import { CompanySwitcher } from "@/components/layout/CompanySwitcher";
import { ProjectSwitcher } from "@/components/layout/ProjectSwitcher";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { COMPANY_ROLE_LABELS } from "@/lib/permissions";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function TopBar() {
  const { user, logout } = useAuth();
  const { companyRole } = useCompany();
  const { activeProject } = useProject();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 h-[var(--topbar-height)] shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/90 backdrop-blur-md">
      <div className="flex h-full items-center justify-between gap-4 px-[var(--page-padding)] lg:px-8">
        <div className="flex flex-1 items-end gap-4 min-w-0 overflow-hidden">
          <CompanySwitcher />
          <div className="hidden h-7 w-px bg-[var(--border-subtle)] md:block shrink-0" />
          <ProjectSwitcher />
          {activeProject && (
            <div className="hidden lg:block pb-0.5 shrink-0">
              <StatusBadge status={activeProject.status} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden xl:block text-right">
            <p className="text-[10px] text-[var(--text-muted)]">
              {companyRole ? COMPANY_ROLE_LABELS[companyRole] : ""}
            </p>
            <p className="text-[13px] text-[var(--text-secondary)] leading-tight max-w-[160px] truncate">
              {user?.full_name}
            </p>
          </div>
          {user && <UserAvatar name={user.full_name} />}
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="rounded-[var(--radius-sm)] p-2 text-[var(--text-muted)] transition-colors duration-150 hover:bg-white/[0.04] hover:text-[var(--text-secondary)]"
            title="Esci"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
