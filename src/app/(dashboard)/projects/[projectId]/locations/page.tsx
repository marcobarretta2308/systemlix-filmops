"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Textarea } from "@/components/ui/Textarea";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { filterLocationsForDepartmentUser } from "@/lib/locations/department-filter";
import {
  filterActiveOperationalLocations,
  isArchivedLocation,
  isSuggestionLocation,
  sceneCountForLocation,
} from "@/lib/locations/location-status";
import { scenesForLocation } from "@/lib/locations/scene-counts";
import { useProject } from "@/lib/context/PlatformContext";
import type { Location, LocationStatus } from "@/lib/types";
import Link from "next/link";
import {
  Car,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

type LocationTab = "active" | "suggestions" | "archived";

const STATUS_LABELS: Record<string, string> = {
  scouting: "Scouting",
  confirmed: "Confirmed",
  permit_pending: "Permit pending",
  ready: "Ready",
  suggestion: "Suggestion",
  archived: "Archived",
};

function typeLabel(type?: string) {
  if (type === "interior") return "INT";
  if (type === "exterior") return "EXT";
  if (type === "mixed") return "MIXED";
  if (type === "vehicle") return "VEHICLE";
  return "—";
}

function statusVariant(status?: string): "pending" | "active" | "draft" | "issue" {
  if (status === "confirmed" || status === "ready") return "active";
  if (status === "permit_pending") return "pending";
  if (status === "archived" || status === "suggestion") return "draft";
  return "pending";
}

type LocationGroup = {
  canonical: string;
  locations: Location[];
  sceneCount: number;
  shootingDays: number;
  warningCount: number;
};

async function postLocationAction(
  projectId: string,
  path: string,
  body?: Record<string, string>
) {
  const res = await fetch(`/api/projects/${projectId}/locations/${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }
  return data;
}

export default function LocationsPage() {
  const { isProjectReady, projectId } = useSyncProjectFromUrl();
  const {
    locations,
    scenes,
    shootingDays,
    addLocation,
    canEditProject,
    isLoadingProjectData,
    isDepartmentDashboard,
    activeProjectMembership,
    refreshProjectData,
  } = useProject();

  const [tab, setTab] = useState<LocationTab>("active");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [warningsOnly, setWarningsOnly] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    maps_link: "",
    parking_notes: "",
    access_notes: "",
    production_notes: "",
  });

  const activeOperational = useMemo(
    () => filterActiveOperationalLocations(locations, scenes),
    [locations, scenes]
  );

  const suggestions = useMemo(
    () => locations.filter((l) => isSuggestionLocation(l)),
    [locations]
  );

  const archived = useMemo(
    () => locations.filter((l) => isArchivedLocation(l)),
    [locations]
  );

  const tabLocations = useMemo(() => {
    if (tab === "suggestions") return suggestions;
    if (tab === "archived") return archived;
    if (isDepartmentDashboard) {
      return filterLocationsForDepartmentUser(
        activeOperational,
        scenes,
        shootingDays,
        activeProjectMembership?.department
      );
    }
    return activeOperational;
  }, [
    tab,
    activeOperational,
    suggestions,
    archived,
    isDepartmentDashboard,
    scenes,
    shootingDays,
    activeProjectMembership?.department,
  ]);

  const activeTargetsForMerge = useMemo(
    () => activeOperational.filter((l) => !l.sub_location),
    [activeOperational]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, LocationGroup>();

    for (const loc of tabLocations) {
      const canonical = loc.canonical_name || loc.name;
      const group = map.get(canonical) ?? {
        canonical,
        locations: [],
        sceneCount: 0,
        shootingDays: 0,
        warningCount: 0,
      };
      group.locations.push(loc);
      group.shootingDays += shootingDays.filter((d) => d.location_id === loc.id).length;
      group.warningCount += loc.metadata?.warnings?.length ?? 0;
      map.set(canonical, group);
    }

    for (const group of map.values()) {
      const primary = group.locations[0];
      group.sceneCount = sceneCountForLocation(primary, locations, scenes);
    }

    return [...map.values()].sort((a, b) => {
      if (tab === "active") {
        if (b.sceneCount !== a.sceneCount) return b.sceneCount - a.sceneCount;
        if (b.warningCount !== a.warningCount) return b.warningCount - a.warningCount;
      }
      return a.canonical.localeCompare(b.canonical, "it");
    });
  }, [tabLocations, locations, scenes, shootingDays, tab]);

  const filteredGroups = useMemo(() => {
    return grouped.filter((group) => {
      const matchesSearch =
        !search.trim() ||
        group.canonical.toLowerCase().includes(search.toLowerCase()) ||
        group.locations.some((l) =>
          (l.sub_location || l.name || l.raw_name || "")
            .toLowerCase()
            .includes(search.toLowerCase())
        );

      const matchesStatus =
        statusFilter === "all" ||
        group.locations.some((l) => (l.status ?? "scouting") === statusFilter);

      const matchesType =
        typeFilter === "all" ||
        group.locations.some((l) => l.location_type === typeFilter);

      const matchesWarnings =
        !warningsOnly ||
        group.locations.some(
          (l) =>
            (l.metadata?.warnings?.length ?? 0) > 0 ||
            Boolean(l.notes?.trim())
        );

      return matchesSearch && matchesStatus && matchesType && matchesWarnings;
    });
  }, [grouped, search, statusFilter, typeFilter, warningsOnly]);

  const runAction = async (key: string, path: string, body?: Record<string, string>) => {
    if (!projectId || busy) return;
    setBusy(key);
    setActionMessage(null);
    try {
      const data = await postLocationAction(projectId, path, body);
      setActionMessage(data.message ?? "Done.");
      await refreshProjectData();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addLocation({
      name: form.name,
      address: form.address,
      maps_link: form.maps_link,
      parking_notes: form.parking_notes,
      access_notes: form.access_notes,
      production_notes: form.production_notes,
      canonical_name: form.name,
      status: "scouting",
      source: "manual",
      location_type: "unknown",
    });
    setOpen(false);
    setForm({
      name: "",
      address: "",
      maps_link: "",
      parking_notes: "",
      access_notes: "",
      production_notes: "",
    });
  };

  if (!isProjectReady) {
    return (
      <EmptyState
        icon={MapPin}
        title="No active project"
        description="Select a project to manage locations."
      />
    );
  }

  if (isLoadingProjectData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const tabCounts = {
    active: activeOperational.length,
    suggestions: suggestions.length,
    archived: archived.length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description={
          isDepartmentDashboard
            ? `${filteredGroups.length} location operative collegate alle tue scene`
            : `${tabCounts.active} active · ${tabCounts.suggestions} suggestions · ${tabCounts.archived} archived`
        }
        actions={
          canEditProject && !isDepartmentDashboard && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runAction("rebuild", "rebuild")}
                disabled={Boolean(busy)}
              >
                {busy === "rebuild" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Rebuild from scenes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runAction("cleanup", "cleanup")}
                disabled={Boolean(busy)}
              >
                {busy === "cleanup" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Clean up generated
              </Button>
              <Button onClick={() => setOpen(true)} size="sm">
                <Plus className="h-4 w-4" />
                Aggiungi location
              </Button>
            </div>
          )
        }
      />

      {actionMessage && (
        <p className="text-[12px] text-[var(--text-secondary)]">{actionMessage}</p>
      )}

      {!isDepartmentDashboard && (
        <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-3">
          {(
            [
              ["active", `Active Locations (${tabCounts.active})`],
              ["suggestions", `Suggestions (${tabCounts.suggestions})`],
              ["archived", `Archived / Merged (${tabCounts.archived})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-[12px] transition-colors ${
                tab === key
                  ? "bg-white/[0.06] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <PremiumCard padding="md">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2 pl-8 pr-3 text-[12px]"
              placeholder="Search locations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {tab === "active" && (
            <>
              <select
                className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-[12px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                {(Object.keys(STATUS_LABELS) as LocationStatus[])
                  .filter((s) => s !== "archived" && s !== "suggestion")
                  .map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
              </select>
              <select
                className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-[12px]"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">INT / EXT / MIXED</option>
                <option value="interior">INT</option>
                <option value="exterior">EXT</option>
                <option value="mixed">MIXED</option>
                <option value="vehicle">VEHICLE</option>
              </select>
              <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={warningsOnly}
                  onChange={(e) => setWarningsOnly(e.target.checked)}
                />
                Has warnings
              </label>
            </>
          )}
        </div>
      </PremiumCard>

      {filteredGroups.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={
            tab === "suggestions"
              ? "No location suggestions"
              : tab === "archived"
                ? "No archived locations"
                : "No active locations"
          }
          description={
            tab === "suggestions"
              ? "Le suggestion compaiono dopo un Script Breakdown Pro. Approva quelle utili dalla produzione."
              : tab === "archived"
                ? "Location ignorate, mergeate o archiviate dal cleanup."
                : isDepartmentDashboard
                  ? "Nessuna location collegata alle scene del tuo reparto."
                  : "Usa Rebuild from scenes o approva suggestion per popolare le location operative."
          }
          action={
            canEditProject &&
            tab === "active" && (
              <Button onClick={() => setOpen(true)} size="sm">
                Nuova location
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredGroups.map((group) => {
            const primary = group.locations[0];
            const linkedScenes = scenesForLocation(primary, scenes);
            const subsFromMeta = primary.metadata?.sub_locations ?? [];
            const subsFromRows = group.locations
              .filter((l) => l.sub_location)
              .map((l) => ({
                name: l.sub_location!,
                scenes: l.metadata?.linked_scene_numbers ?? [],
              }));
            const subsMap = new Map<string, { name: string; scenes: string[] }>();
            for (const sub of [...subsFromMeta, ...subsFromRows]) {
              const existing = subsMap.get(sub.name);
              if (existing) {
                existing.scenes = [
                  ...new Set([...existing.scenes, ...(sub.scenes ?? [])]),
                ];
              } else {
                subsMap.set(sub.name, { name: sub.name, scenes: sub.scenes ?? [] });
              }
            }
            const subs = [...subsMap.values()];

            return (
              <PremiumCard key={`${tab}-${group.canonical}-${primary.id}`} padding="md">
                <div className="flex gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--accent-cyan-muted)] shrink-0">
                    <MapPin className="h-4 w-4 text-cyan-400/70" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-[var(--text-primary)]">
                      {group.canonical}
                    </p>
                    {tab === "suggestions" && primary.raw_name && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Raw: {primary.raw_name}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge variant={statusVariant(primary.status)} size="sm">
                        {STATUS_LABELS[primary.status ?? "scouting"]}
                      </Badge>
                      <Badge variant="default" size="sm">
                        {typeLabel(primary.location_type)}
                      </Badge>
                      <Badge variant="cyan" size="sm">
                        {group.sceneCount} scene
                        {group.sceneCount === 1 ? "" : "s"}
                      </Badge>
                      {primary.confidence_score != null && (
                        <Badge variant="pending" size="sm">
                          {Math.round(primary.confidence_score * 100)}%
                        </Badge>
                      )}
                      {primary.permit_status && (
                        <Badge variant="pending" size="sm">
                          {primary.permit_status}
                        </Badge>
                      )}
                      {group.shootingDays > 0 && (
                        <Badge variant="violet" size="sm">
                          {group.shootingDays} shoot day
                          {group.shootingDays === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {subs.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Sub-locations
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {subs.map((sub) => (
                        <Badge key={sub.name} variant="default" size="sm">
                          {sub.name}
                          {sub.scenes?.length ? ` (${sub.scenes.length})` : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(primary.metadata?.warnings?.length ?? 0) > 0 && (
                  <p className="text-[11px] text-[var(--accent-amber)] mb-3">
                    {primary.metadata!.warnings!.join(" · ")}
                  </p>
                )}

                {tab === "active" && linkedScenes.length > 0 && projectId && (
                  <div className="mb-4">
                    <Link
                      href={`/projects/${projectId}/scenes`}
                      className="text-[12px] text-cyan-400/90 hover:underline"
                    >
                      View linked scenes ({linkedScenes.map((s) => s.scene_number).join(", ")})
                    </Link>
                  </div>
                )}

                {tab === "suggestions" && canEditProject && (
                  <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
                    <Button
                      size="sm"
                      onClick={() =>
                        runAction(
                          `approve-${primary.id}`,
                          `suggestions/${primary.id}/approve`
                        )
                      }
                      disabled={Boolean(busy)}
                    >
                      Approve as new
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMergeTargetId(primary.id)}
                      disabled={Boolean(busy)}
                    >
                      Merge into existing
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        runAction(
                          `ignore-${primary.id}`,
                          `suggestions/${primary.id}/ignore`
                        )
                      }
                      disabled={Boolean(busy)}
                    >
                      Ignore
                    </Button>
                  </div>
                )}

                {tab === "active" && (
                  <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3 text-[12px] text-[var(--text-muted)]">
                    <div className="flex gap-2">
                      <Car className="h-3.5 w-3.5 shrink-0" />
                      <span>{primary.parking_notes || "—"}</span>
                    </div>
                    <div className="flex gap-2">
                      <KeyRound className="h-3.5 w-3.5 shrink-0" />
                      <span>{primary.access_notes || "—"}</span>
                    </div>
                    <div className="flex gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>{primary.notes || primary.production_notes || "—"}</span>
                    </div>
                    {primary.maps_link && (
                      <a
                        href={primary.maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-cyan-400/90"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Apri mappa
                      </a>
                    )}
                  </div>
                )}

                {tab === "archived" && primary.metadata?.merged_into && (
                  <p className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-3">
                    Merged into location {primary.metadata.merged_into.slice(0, 8)}…
                  </p>
                )}
              </PremiumCard>
            );
          })}
        </div>
      )}

      <Modal
        open={mergeTargetId !== null}
        onClose={() => setMergeTargetId(null)}
        title="Merge suggestion into existing location"
        size="md"
      >
        <div className="space-y-2">
          {activeTargetsForMerge.map((loc) => (
            <button
              key={loc.id}
              type="button"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-2 text-left text-[12px] hover:bg-white/[0.04]"
              onClick={async () => {
                if (!mergeTargetId || !projectId) return;
                await runAction(
                  `merge-${mergeTargetId}`,
                  `suggestions/${mergeTargetId}/merge`,
                  { targetLocationId: loc.id }
                );
                setMergeTargetId(null);
              }}
            >
              {loc.canonical_name || loc.name}
            </button>
          ))}
          {activeTargetsForMerge.length === 0 && (
            <p className="text-[12px] text-[var(--text-muted)]">
              Nessuna location attiva disponibile. Approva prima una suggestion o crea una location manuale.
            </p>
          )}
        </div>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuova location" size="lg">
        <div className="grid gap-4">
          <Input
            label="Nome location principale"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Indirizzo"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
          <Input
            label="Link Google Maps"
            value={form.maps_link}
            onChange={(e) => setForm((p) => ({ ...p, maps_link: e.target.value }))}
          />
          <Textarea
            label="Note parcheggio"
            value={form.parking_notes}
            onChange={(e) =>
              setForm((p) => ({ ...p, parking_notes: e.target.value }))
            }
          />
          <Textarea
            label="Note accesso"
            value={form.access_notes}
            onChange={(e) =>
              setForm((p) => ({ ...p, access_notes: e.target.value }))
            }
          />
          <Textarea
            label="Note produzione"
            value={form.production_notes}
            onChange={(e) =>
              setForm((p) => ({ ...p, production_notes: e.target.value }))
            }
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button onClick={handleAdd} disabled={!form.name.trim()}>
            Crea location
          </Button>
        </div>
      </Modal>
    </div>
  );
}
