import { Badge } from "@/components/ui/Badge";
import type { CallSheet, CallSheetStatus } from "@/lib/types";

interface CallSheetPreviewProps {
  callSheet: CallSheet;
}

const STATUS_LABELS: Record<CallSheetStatus, string> = {
  draft: "Bozza",
  final: "Finale",
  locked: "Bloccato",
  archived: "Archiviato",
};

function DocSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)] mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}

export function CallSheetPreview({ callSheet }: CallSheetPreviewProps) {
  return (
    <div className="rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-paper)] text-[13px]">
      {/* Document header */}
      <div className="px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {callSheet.production_title}
            </p>
            <h1 className="text-lg font-medium text-[var(--text-primary)] mt-1 tracking-tight">
              {callSheet.project_title}
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Foglio di lavoro</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-medium text-[var(--text-primary)] tracking-tight">
              {callSheet.day_number}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {new Date(callSheet.date).toLocaleDateString("it-IT", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </p>
            <div className="mt-2 flex gap-1.5 justify-end">
              <span className="text-[10px] px-2 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-muted)]">
                v{callSheet.version}
              </span>
              <Badge variant={callSheet.status === "final" ? "final" : callSheet.status === "locked" ? "locked" : "draft"}>
                {STATUS_LABELS[callSheet.status]}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Location & Meteo */}
      <div className="px-6 py-5 border-b border-[var(--border-subtle)] grid sm:grid-cols-2 gap-6">
        <DocSection title="Location">
          <p className="text-[14px] text-[var(--text-primary)]">{callSheet.location}</p>
          {callSheet.maps_link && (
            <a href={callSheet.maps_link} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] mt-1 inline-block transition-colors">
              Apri mappa →
            </a>
          )}
        </DocSection>
        <DocSection title="Meteo">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{callSheet.weather_notes}</p>
        </DocSection>
      </div>

      {/* Orari */}
      <div className="px-6 py-5 border-b border-[var(--border-subtle)]">
        <DocSection title="Orari">
          <div className="space-y-0">
            {callSheet.schedule.map((item, i) => (
              <div key={i} className="flex gap-4 py-2 border-b border-[var(--border-subtle)] last:border-0">
                <span className="font-mono text-[12px] text-[var(--text-primary)] w-14 shrink-0">{item.time}</span>
                <span className="text-[13px] text-[var(--text-secondary)]">{item.activity}</span>
              </div>
            ))}
          </div>
        </DocSection>
      </div>

      {/* Scene */}
      <div className="px-6 py-5 border-b border-[var(--border-subtle)] grid sm:grid-cols-2 gap-6">
        <DocSection title="Scene">
          <p className="font-mono text-[14px] text-[var(--text-primary)]">
            {callSheet.scenes_to_shoot.join(" · ") || "—"}
          </p>
        </DocSection>
        <DocSection title="Parcheggio">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{callSheet.parking_notes}</p>
        </DocSection>
      </div>

      {/* Cast & Crew */}
      <div className="px-6 py-5 border-b border-[var(--border-subtle)] grid sm:grid-cols-2 gap-6">
        <DocSection title="Cast">
          {callSheet.cast_call_times.length === 0 ? (
            <p className="text-[12px] text-[var(--text-muted)]">—</p>
          ) : (
            <ul className="space-y-1.5">
              {callSheet.cast_call_times.map((c, i) => (
                <li key={i} className="flex justify-between gap-2 text-[12px]">
                  <span className="text-[var(--text-secondary)]">{c.name} <span className="text-[var(--text-muted)]">({c.role})</span></span>
                  <span className="font-mono text-[var(--text-muted)]">{c.call_time}</span>
                </li>
              ))}
            </ul>
          )}
        </DocSection>
        <DocSection title="Crew">
          {callSheet.crew_call_times.length === 0 ? (
            <p className="text-[12px] text-[var(--text-muted)]">—</p>
          ) : (
            <ul className="space-y-1.5">
              {callSheet.crew_call_times.map((c, i) => (
                <li key={i} className="flex justify-between gap-2 text-[12px]">
                  <span className="text-[var(--text-secondary)]">{c.name} <span className="text-[var(--text-muted)]">({c.department})</span></span>
                  <span className="font-mono text-[var(--text-muted)]">{c.call_time}</span>
                </li>
              ))}
            </ul>
          )}
        </DocSection>
      </div>

      {/* Note & Emergenza */}
      <div className="px-6 py-5 grid sm:grid-cols-2 gap-6">
        <DocSection title="Note operative">
          {Object.entries(callSheet.department_notes).map(([dept, note]) => (
            <p key={dept} className="text-[12px] text-[var(--text-secondary)] mb-1">
              <span className="text-[var(--text-primary)]">{dept}:</span> {note}
            </p>
          ))}
          {callSheet.transport_notes && (
            <p className="text-[12px] text-[var(--text-secondary)] mt-2">
              <span className="text-[var(--text-primary)]">Trasporti:</span> {callSheet.transport_notes}
            </p>
          )}
          {callSheet.production_notes && (
            <p className="text-[12px] text-[var(--text-muted)] mt-2 leading-relaxed">{callSheet.production_notes}</p>
          )}
        </DocSection>
        <DocSection title="Emergenza">
          {callSheet.emergency_contacts.length === 0 ? (
            <p className="text-[12px] text-[var(--text-muted)]">—</p>
          ) : (
            <ul className="space-y-1.5">
              {callSheet.emergency_contacts.map((c, i) => (
                <li key={i} className="text-[12px] text-[var(--text-secondary)]">
                  <span className="text-[var(--text-primary)]">{c.name}</span> — {c.role}:{" "}
                  <span className="font-mono">{c.phone}</span>
                </li>
              ))}
            </ul>
          )}
        </DocSection>
      </div>

      <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <p className="text-[10px] text-[var(--text-muted)] tracking-wide">
          Systemlix FilmOps — Documento riservato alla produzione
        </p>
      </div>
    </div>
  );
}
