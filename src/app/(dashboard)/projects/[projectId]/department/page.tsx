"use client";

import { CallSheetInbox } from "@/components/call-sheets/CallSheetInbox";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useAuth, useProject } from "@/lib/context/PlatformContext";
import { isCostumiDepartment } from "@/lib/permissions/project-permissions";
import { Calendar, Clock, MapPin, Shirt, Users } from "lucide-react";
import Link from "next/link";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

export default function DepartmentDashboardPage() {
  const { projectId, isProjectReady } = useSyncProjectFromUrl();
  const { user } = useAuth();
  const {
    activeProjectMembership,
    isDepartmentDashboard,
    scenes,
    shootingDays,
    locations,
    callSheets,
    callSheetDistributions,
    callSheetRecipients,
    refreshCallSheetDistribution,
    projectPermissions,
  } = useProject();

  const department = activeProjectMembership?.department ?? "Reparto";
  const isCostumi = isCostumiDepartment(projectPermissions, isDepartmentDashboard);

  const upcomingDay = [...shootingDays]
    .filter((day) => new Date(day.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    ?? [...shootingDays].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0];

  const dayLocation = upcomingDay
    ? locations.find((l) => l.id === upcomingDay.location_id)
    : null;

  const daySceneIds = new Set(upcomingDay?.selected_scene_ids ?? []);
  const dayScenes =
    daySceneIds.size > 0
      ? scenes.filter((s) => daySceneIds.has(s.id))
      : scenes;

  const allCharacters = [
    ...new Set(dayScenes.flatMap((scene) => scene.characters).filter(Boolean)),
  ];
  const allCostumes = [
    ...new Set(dayScenes.flatMap((scene) => scene.costumes).filter(Boolean)),
  ];
  const activeCallSheet = callSheets[0] ?? null;

  const title = isCostumi ? "Dashboard Costumi" : `Dashboard ${department}`;
  const description = isCostumi
    ? "Scene, personaggi, costumi e call sheet del progetto assegnato."
    : `${activeProjectMembership?.role ?? "department_user"} · ${projectPermissions.permission_profile}`;

  const showCostumes = department === "Costumi";
  const showProps = department === "Props";
  const showMakeup = department === "Trucco";
  const showTransport = department === "Trasporti";
  const showLocation = department === "Location";

  if (!isProjectReady || !projectId) {
    return (
      <EmptyState
        icon={Shirt}
        title="Progetto non selezionato"
        description="Seleziona un progetto per aprire la dashboard reparto."
      />
    );
  }

  if (!isDepartmentDashboard) {
    return (
      <EmptyState
        icon={Shirt}
        title="Dashboard reparto non disponibile"
        description="Questa vista è riservata agli utenti department_user con reparto assegnato."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        badge={<Badge variant="violet">{department}</Badge>}
        actions={
          <div className="flex gap-2">
            {projectPermissions.can_view_call_sheets && (
              <Link href={`/projects/${projectId}/call-sheets`}>
                <Button variant="outline" size="sm">Call Sheet</Button>
              </Link>
            )}
            {projectPermissions.can_view_set_assistant && (
              <Link href={`/projects/${projectId}/set-assistant`}>
                <Button variant="secondary" size="sm">Set Assistant Costumi</Button>
              </Link>
            )}
          </div>
        }
      />

      {isCostumi && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {upcomingDay && (
            <PremiumCard padding="md">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
                  Prossima giornata
                </h3>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)]">
                {upcomingDay.day_number} · {formatDate(upcomingDay.date)}
              </p>
              {dayLocation && (
                <p className="text-[12px] text-[var(--text-muted)] mt-1">
                  {dayLocation.name}
                </p>
              )}
            </PremiumCard>
          )}

          {dayLocation && (
            <PremiumCard padding="md">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
                  Location
                </h3>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)]">{dayLocation.name}</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-1">
                {dayLocation.address || "—"}
              </p>
            </PremiumCard>
          )}

          {upcomingDay && (
            <PremiumCard padding="md">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
                  Orari principali
                </h3>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Crew: {upcomingDay.general_crew_call || "—"}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] mt-1">
                Trasporti: {upcomingDay.transport_notes || "—"}
              </p>
            </PremiumCard>
          )}

          <PremiumCard padding="md">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
                Personaggi
              </h3>
            </div>
            <p className="text-[12px] text-[var(--text-secondary)]">
              {allCharacters.length ? allCharacters.join(", ") : "—"}
            </p>
          </PremiumCard>
        </div>
      )}

      {!isCostumi && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(showCostumes || showMakeup || showTransport || showLocation) && upcomingDay && (
            <PremiumCard padding="md">
              <h3 className="text-[13px] font-medium text-[var(--text-primary)] mb-2">
                Prossima giornata
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)]">
                {upcomingDay.day_number} · {formatDate(upcomingDay.date)}
              </p>
            </PremiumCard>
          )}

          {(showCostumes || showLocation || showTransport || showProps) && dayLocation && (
            <PremiumCard padding="md">
              <h3 className="text-[13px] font-medium text-[var(--text-primary)] mb-2">
                Location
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)]">{dayLocation.name}</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-1">{dayLocation.address || "—"}</p>
            </PremiumCard>
          )}
        </div>
      )}

      {isCostumi && allCostumes.length > 0 && (
        <PremiumCard padding="md">
          <h3 className="text-[13px] font-medium text-[var(--text-primary)] mb-3">
            Costumi richiesti
          </h3>
          <div className="flex flex-wrap gap-2">
            {allCostumes.map((costume) => (
              <Badge key={costume} variant="default" size="sm">
                {costume}
              </Badge>
            ))}
          </div>
        </PremiumCard>
      )}

      <PremiumCard padding="md">
        <h3 className="text-[13px] font-medium text-[var(--text-primary)] mb-3">
          {isCostumi ? "Scene da girare" : "Scene"}
        </h3>
        {dayScenes.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)]">Nessuna scena disponibile.</p>
        ) : (
          <div className="space-y-3">
            {dayScenes.map((scene) => (
              <div
                key={scene.id}
                className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3"
              >
                <p className="text-[13px] font-medium text-[var(--text-primary)]">
                  Scena {scene.scene_number} · {scene.location}
                </p>
                <p className="text-[12px] text-[var(--text-muted)] mt-1">
                  {scene.short_description}
                </p>
                {(showCostumes || showMakeup) && (
                  <p className="text-[12px] text-[var(--text-secondary)] mt-2">
                    Personaggi: {scene.characters.join(", ") || "—"}
                  </p>
                )}
                {showCostumes && (
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                    Costumi: {scene.costumes.join(", ") || "—"}
                  </p>
                )}
                {showProps && (
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                    Props: {scene.props.join(", ") || "—"}
                  </p>
                )}
                {(showCostumes || showLocation) && scene.production_notes && (
                  <p className="text-[12px] text-[var(--text-muted)] mt-1">
                    Note costume/produzione: {scene.production_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </PremiumCard>

      {projectPermissions.can_view_call_sheets && user?.id && (
        <CallSheetInbox
          projectId={projectId}
          userId={user.id}
          memberDepartment={activeProjectMembership?.department}
          callSheets={callSheets}
          distributions={callSheetDistributions}
          recipients={callSheetRecipients}
          onAcknowledged={refreshCallSheetDistribution}
          variant="section"
          filter="all"
        />
      )}

      {projectPermissions.can_view_call_sheets && activeCallSheet && (
        <PremiumCard padding="md">
          <h3 className="text-[13px] font-medium text-[var(--text-primary)] mb-2">
            Ultima call sheet salvata
          </h3>
          <p className="text-[12px] text-[var(--text-secondary)]">
            v{activeCallSheet.version} · Giorno {activeCallSheet.day_number} · {activeCallSheet.location}
          </p>
          <Link
            href={`/projects/${projectId}/call-sheets?sheet=${activeCallSheet.id}`}
            className="inline-block mt-3 text-[12px] text-[var(--accent-cyan)] hover:underline"
          >
            Apri call sheet completo
          </Link>
        </PremiumCard>
      )}
    </div>
  );
}
