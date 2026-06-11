"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import {
  canUseFullProductionIntelligence,
  canUseProjectSearch,
} from "@/lib/production-intelligence/permissions";
import type {
  CallSheetCheckResult,
  ProductionCheckResult,
  ProductionIssue,
  ProjectSearchResult,
} from "@/lib/production-intelligence/types";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Loader2,
  MessageSquare,
  Search,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

type Tab = "checker" | "enhancer" | "search";

const SEARCH_PLACEHOLDERS = [
  "Quali scene hanno armi o oggetti critici?",
  "Quali location non sono confermate?",
  "Quali scene hanno VFX?",
  "Dove compare il personaggio Marco?",
  "Quali call sheet mancano di informazioni?",
  "Che problemi devo sistemare prima di girare?",
];

function severityVariant(severity: ProductionIssue["severity"]) {
  if (severity === "critical") return "pending" as const;
  if (severity === "warning") return "draft" as const;
  return "cyan" as const;
}

function checklistIcon(status: "pass" | "warn" | "fail") {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  return <XCircle className="h-4 w-4 text-red-400" />;
}

export default function ProductionIntelligencePage() {
  const { projectId, isProjectReady } = useSyncProjectFromUrl();
  const { user } = useAuth();
  const { companyRole } = useCompany();
  const { callSheets, projectRole } = useProject();

  const fullAccess = canUseFullProductionIntelligence(
    user,
    companyRole,
    projectRole
  );
  const canSearch = canUseProjectSearch(projectRole);

  const defaultTab: Tab = fullAccess ? "checker" : "search";
  const [tab, setTab] = useState<Tab>(defaultTab);

  const [checkResult, setCheckResult] = useState<ProductionCheckResult | null>(
    null
  );
  const [sheetResult, setSheetResult] = useState<CallSheetCheckResult | null>(
    null
  );
  const [searchResult, setSearchResult] = useState<ProjectSearchResult | null>(
    null
  );
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<
    "success" | "error" | "warning"
  >("success");

  const effectiveSheetId = selectedSheetId || callSheets[0]?.id || "";

  const sheetOptions = useMemo(
    () =>
      callSheets.map((c) => ({
        value: c.id,
        label: `v${c.version} · Day ${c.day_number} · ${new Date(c.date).toLocaleDateString("it-IT")}`,
      })),
    [callSheets]
  );

  const notify = (
    message: string,
    variant: "success" | "error" | "warning" = "success"
  ) => {
    setToastVariant(variant);
    setToast(message);
  };

  const postAction = async (payload: Record<string, unknown>) => {
    if (!projectId) throw new Error("Progetto non selezionato");
    const res = await fetch(
      `/api/projects/${projectId}/production-intelligence`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Richiesta non riuscita");
    return data;
  };

  const runProductionCheck = async () => {
    setLoading(true);
    setCheckResult(null);
    try {
      const data = (await postAction({
        action: "production_check",
      })) as ProductionCheckResult;
      setCheckResult(data);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Errore analisi", "error");
    } finally {
      setLoading(false);
    }
  };

  const runCallSheetCheck = async () => {
    if (!effectiveSheetId) {
      notify("Nessuna call sheet disponibile", "warning");
      return;
    }
    setLoading(true);
    setSheetResult(null);
    try {
      const data = (await postAction({
        action: "call_sheet_check",
        callSheetId: effectiveSheetId,
      })) as CallSheetCheckResult;
      setSheetResult(data);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Errore analisi", "error");
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text) return;
    setQuestion(text);
    setLoading(true);
    setSearchResult(null);
    try {
      const data = (await postAction({
        action: "project_search",
        question: text,
      })) as ProjectSearchResult;
      setSearchResult(data);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Errore ricerca", "error");
    } finally {
      setLoading(false);
    }
  };

  const copySuggestions = () => {
    if (!sheetResult) return;
    const text = [
      `Call Sheet Quality: ${sheetResult.quality_score}/100`,
      ...sheetResult.suggestions.map((s) => `• ${s}`),
      ...sheetResult.safety_warnings.map((s) => `⚠️ ${s}`),
    ].join("\n");
    navigator.clipboard.writeText(text).then(
      () => notify("Suggerimenti copiati"),
      () => notify("Copia non riuscita", "error")
    );
  };

  if (!isProjectReady || !projectId) {
    return (
      <EmptyState
        icon={Brain}
        title="Progetto non selezionato"
        description="Seleziona un progetto per aprire Production Intelligence."
      />
    );
  }

  const tabs = (
    [
      { id: "checker" as const, label: "Production Checker", visible: fullAccess },
      { id: "enhancer" as const, label: "Call Sheet Enhancer", visible: fullAccess },
      { id: "search" as const, label: "Ask FilmOps", visible: canSearch },
    ] as const
  ).filter((t) => t.visible);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Intelligence"
        description="AI checks, call sheet quality and project search."
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "primary" : "secondary"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "checker" && fullAccess && (
        <PremiumCard padding="md" className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-medium text-[var(--text-primary)] flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                AI Production Checker
              </h2>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">
                Analizza scene, location, call sheet, documenti e report.
              </p>
            </div>
            <Button size="sm" onClick={runProductionCheck} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              Run Production Check
            </Button>
          </div>

          {loading && (
            <p className="text-[13px] text-[var(--text-muted)]">
              Analyzing project…
            </p>
          )}

          {checkResult && (
            <div className="space-y-4">
              {checkResult.fallback_message && (
                <p className="text-[13px] text-amber-400">
                  {checkResult.fallback_message}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    Health Score
                  </p>
                  <p className="text-4xl font-semibold text-[var(--accent-cyan)]">
                    {checkResult.health_score}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[12px]">
                  <Badge variant="pending">
                    {checkResult.critical_count} Critical
                  </Badge>
                  <Badge variant="draft">
                    {checkResult.warning_count} Warning
                  </Badge>
                  <Badge variant="cyan">{checkResult.info_count} Info</Badge>
                </div>
              </div>

              {checkResult.suggested_next_actions.length > 0 && (
                <PremiumCard padding="sm" className="bg-[var(--surface-elevated)]">
                  <p className="text-[12px] font-medium mb-2">Suggested next actions</p>
                  <ul className="text-[13px] text-[var(--text-secondary)] space-y-1 list-disc pl-4">
                    {checkResult.suggested_next_actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </PremiumCard>
              )}

              {checkResult.issues.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Nessun problema rilevato"
                  description="I controlli base non hanno trovato criticità."
                />
              ) : (
                <div className="space-y-2">
                  {(["critical", "warning", "info"] as const).map((sev) => {
                    const group = checkResult.issues.filter(
                      (i) => i.severity === sev
                    );
                    if (!group.length) return null;
                    return (
                      <div key={sev} className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                          {sev}
                        </p>
                        {group.map((issue) => (
                          <PremiumCard
                            key={issue.id}
                            padding="sm"
                            className="border border-[var(--border-subtle)]"
                          >
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-medium text-[14px]">
                                {issue.title}
                              </p>
                              <Badge variant={severityVariant(issue.severity)}>
                                {issue.affected_area}
                              </Badge>
                            </div>
                            <p className="text-[13px] text-[var(--text-secondary)]">
                              {issue.description}
                            </p>
                            <p className="text-[12px] text-[var(--text-muted)] mt-1">
                              → {issue.suggested_action}
                            </p>
                          </PremiumCard>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </PremiumCard>
      )}

      {tab === "enhancer" && fullAccess && (
        <PremiumCard padding="md" className="space-y-4">
          <div>
            <h2 className="text-[15px] font-medium text-[var(--text-primary)]">
              Smart Call Sheet Enhancer
            </h2>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              Analizza qualità e completezza senza modificare la call sheet.
            </p>
          </div>

          {sheetOptions.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nessuna call sheet"
              description="Crea una call sheet prima di usare l'enhancer."
            />
          ) : (
            <>
              <Select
                label="Call sheet"
                value={effectiveSheetId}
                onChange={(e) => setSelectedSheetId(e.target.value)}
                options={sheetOptions}
              />
              <Button size="sm" onClick={runCallSheetCheck} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Analyze Call Sheet
              </Button>
            </>
          )}

          {loading && (
            <p className="text-[13px] text-[var(--text-muted)]">
              Checking call sheet…
            </p>
          )}

          {sheetResult && (
            <div className="space-y-4">
              {sheetResult.fallback_message && (
                <p className="text-[13px] text-amber-400">
                  {sheetResult.fallback_message}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase text-[var(--text-muted)]">
                    Quality Score
                  </p>
                  <p className="text-4xl font-semibold text-[var(--accent-cyan)]">
                    {sheetResult.quality_score}
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    {sheetResult.call_sheet_label}
                  </p>
                </div>
                <Badge variant={sheetResult.ready_to_send ? "final" : "pending"}>
                  {sheetResult.ready_to_send
                    ? "Pronta per invio"
                    : "Non pronta per invio"}
                </Badge>
              </div>

              <div className="space-y-2">
                {sheetResult.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-[13px]"
                  >
                    {checklistIcon(item.status)}
                    <span className="text-[var(--text-primary)]">
                      {item.label}
                    </span>
                    {item.detail && (
                      <span className="text-[var(--text-muted)]">
                        — {item.detail}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {sheetResult.suggestions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Suggerimenti</p>
                    <Button size="sm" variant="subtle" onClick={copySuggestions}>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Suggestions
                    </Button>
                  </div>
                  <ul className="text-[13px] space-y-1 list-disc pl-4 text-[var(--text-secondary)]">
                    {sheetResult.suggestions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {sheetResult.safety_warnings.length > 0 && (
                <div className="text-[13px] text-amber-400 space-y-1">
                  {sheetResult.safety_warnings.map((w) => (
                    <p key={w}>⚠️ {w}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </PremiumCard>
      )}

      {tab === "search" && canSearch && (
        <PremiumCard padding="md" className="space-y-4">
          <div>
            <h2 className="text-[15px] font-medium text-[var(--text-primary)] flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Ask FilmOps
            </h2>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              Domande operative sul progetto con risposta basata sui dati reali.
            </p>
          </div>

          <textarea
            className="w-full min-h-[90px] rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-[13px]"
            placeholder="Chiedi qualcosa sul progetto…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                runSearch();
              }
            }}
          />

          <div className="flex flex-wrap gap-2">
            {SEARCH_PLACEHOLDERS.slice(0, 4).map((p) => (
              <Button
                key={p}
                size="sm"
                variant="subtle"
                onClick={() => runSearch(p)}
                disabled={loading}
              >
                {p}
              </Button>
            ))}
          </div>

          <Button size="sm" onClick={() => runSearch()} disabled={loading || !question.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search project
          </Button>

          {loading && (
            <p className="text-[13px] text-[var(--text-muted)]">
              Searching project…
            </p>
          )}

          {searchResult && (
            <PremiumCard padding="sm" className="bg-[var(--surface-elevated)] space-y-3">
              {searchResult.fallback_message && (
                <p className="text-[13px] text-amber-400">
                  {searchResult.fallback_message}
                </p>
              )}
              <p className="text-[14px] text-[var(--text-primary)] whitespace-pre-wrap">
                {searchResult.answer}
              </p>
              {searchResult.sources.length > 0 && (
                <p className="text-[12px] text-[var(--text-muted)]">
                  Fonti: {searchResult.sources.join(", ")}
                </p>
              )}
              {searchResult.actions.length > 0 && (
                <ul className="text-[13px] list-disc pl-4 text-[var(--text-secondary)]">
                  {searchResult.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
            </PremiumCard>
          )}
        </PremiumCard>
      )}

      <Toast
        message={toast ?? ""}
        open={Boolean(toast)}
        variant={toastVariant}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
