"use client";

import { Button } from "@/components/ui/Button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import type { ProjectPermissions } from "@/lib/permissions/project-permissions";
import type { DashboardViewMode } from "@/lib/utils/project-dashboard";
import {
  Bot,
  Calendar,
  ClipboardList,
  FileText,
  MapPin,
  ScrollText,
  Send,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

interface QuickActionsBarProps {
  projectId: string;
  permissions: ProjectPermissions;
  viewMode: DashboardViewMode;
  canManageAccess: boolean;
  canUploadDocuments?: boolean;
  canSendCallSheet?: boolean;
  latestSendableSheetId?: string | null;
}

export function QuickActionsBar({
  projectId,
  permissions,
  viewMode,
  canManageAccess,
  canUploadDocuments = false,
  canSendCallSheet = false,
  latestSendableSheetId = null,
}: QuickActionsBarProps) {
  if (viewMode === "readonly") return null;

  const base = `/projects/${projectId}`;
  const actions = [
    {
      label: "Generate Script Breakdown",
      href: `${base}/script-breakdown`,
      icon: ScrollText,
      visible: permissions.can_view_breakdown && viewMode === "full",
    },
    {
      label: "Add Cast/Crew",
      href: `${base}/cast-crew`,
      icon: Users,
      visible: permissions.can_edit_cast_crew || permissions.can_view_cast_crew,
    },
    {
      label: "Add Location",
      href: `${base}/locations`,
      icon: MapPin,
      visible: permissions.can_edit_locations || permissions.can_view_locations,
    },
    {
      label: "Plan Shooting Day",
      href: `${base}/shooting-days`,
      icon: Calendar,
      visible:
        permissions.can_edit_shooting_days || permissions.can_view_shooting_days,
    },
    {
      label: "Create Call Sheet",
      href: `${base}/call-sheets`,
      icon: FileText,
      visible:
        permissions.can_edit_call_sheets || permissions.can_view_call_sheets,
    },
    {
      label: "Create Production Report",
      href: `${base}/production-reports`,
      icon: ClipboardList,
      visible:
        permissions.can_edit_production_reports ||
        permissions.can_view_production_reports,
    },
    {
      label: "Send latest call sheet",
      href: latestSendableSheetId
        ? `${base}/call-sheets?sheet=${latestSendableSheetId}`
        : `${base}/call-sheets`,
      icon: Send,
      visible: canSendCallSheet && Boolean(latestSendableSheetId),
    },
    {
      label: "Ask Set Assistant",
      href: `${base}/set-assistant`,
      icon: Bot,
      visible: permissions.can_view_set_assistant,
    },
    {
      label: "Invite Team Member",
      href: "/admin/access",
      icon: UserPlus,
      visible: canManageAccess && viewMode === "full",
    },
    {
      label: "Upload Project Document",
      href: `${base}/documents?upload=1`,
      icon: Upload,
      visible: canUploadDocuments,
    },
  ].filter((a) => a.visible);

  if (actions.length === 0) return null;

  return (
    <section>
      <SectionTitle title="Quick actions" description="Jump to production workflows" />
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link key={action.href + action.label} href={action.href}>
            <Button variant="subtle" size="sm">
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          </Link>
        ))}
      </div>
    </section>
  );
}
