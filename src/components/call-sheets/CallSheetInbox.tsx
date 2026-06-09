"use client";

import { CallSheetPreview } from "@/components/call-sheets/CallSheetPreview";
import { CallSheetStatusBadge } from "@/components/call-sheets/CallSheetStatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { acknowledgeCallSheetReceipt } from "@/lib/call-sheets/distribution";
import {
  getAcknowledgedInboxItems,
  getPendingInboxItems,
  resolveCallSheetInboxItems,
} from "@/lib/call-sheets/inbox";
import type {
  CallSheet,
  CallSheetDistribution,
  CallSheetRecipient,
} from "@/lib/types";
import {
  CheckCircle,
  Download,
  Eye,
  FileText,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";

interface CallSheetInboxProps {
  projectId: string;
  userId: string;
  memberDepartment?: string | null;
  callSheets: CallSheet[];
  distributions: CallSheetDistribution[];
  recipients: CallSheetRecipient[];
  onAcknowledged: () => void;
  /** Full-page department view vs compact section */
  variant?: "section" | "page";
  canExportPdf?: boolean;
  onExportPdf?: (callSheetId: string) => Promise<void>;
  onNotify?: (message: string, variant?: "success" | "error" | "warning") => void;
  filter?: "all" | "pending" | "history";
}

export function CallSheetInbox({
  projectId,
  userId,
  memberDepartment,
  callSheets,
  distributions,
  recipients,
  onAcknowledged,
  variant = "section",
  canExportPdf = false,
  onExportPdf,
  onNotify,
  filter = "all",
}: CallSheetInboxProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [viewSheet, setViewSheet] = useState<CallSheet | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);

  const allItems = useMemo(
    () =>
      resolveCallSheetInboxItems(
        userId,
        memberDepartment,
        distributions,
        recipients,
        callSheets
      ),
    [userId, memberDepartment, distributions, recipients, callSheets]
  );

  const pendingItems = useMemo(() => getPendingInboxItems(allItems), [allItems]);
  const historyItems = useMemo(() => getAcknowledgedInboxItems(allItems), [allItems]);

  const displayItems = useMemo(() => {
    if (filter === "pending") return pendingItems;
    if (filter === "history") return historyItems;
    return allItems;
  }, [filter, allItems, pendingItems, historyItems]);

  const handleAck = async (recipientId: string) => {
    setAckError(null);
    setLoadingId(recipientId);
    const ua =
      typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : undefined;
    const result = await acknowledgeCallSheetReceipt(recipientId, projectId, ua);
    setLoadingId(null);

    if (!result.ok) {
      setAckError(result.error ?? "Errore conferma presa visione");
      onNotify?.(result.error ?? "Errore conferma presa visione", "error");
      return;
    }

    onNotify?.("Presa visione confermata.", "success");
    onAcknowledged();
  };

  const handleExport = async (sheet: CallSheet) => {
    if (!onExportPdf) return;
    setExportingId(sheet.id);
    try {
      await onExportPdf(sheet.id);
    } finally {
      setExportingId(null);
    }
  };

  const renderCard = (item: (typeof allItems)[number]) => {
    const { recipient, distribution, sheet } = item;
    const title = sheet
      ? `Giorno ${sheet.day_number} · ${sheet.location}`
      : "Call sheet";

    return (
      <PremiumCard key={`${distribution.id}-${recipient.id}`} padding="md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <FileText className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                {title}
              </p>
              {sheet && <CallSheetStatusBadge status={sheet.status} />}
            </div>
            <p className="text-[12px] text-[var(--text-secondary)]">
              {sheet
                ? new Date(sheet.date).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "—"}
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">
              v{distribution.version_number ?? sheet?.version ?? "—"} · inviato{" "}
              {distribution.sent_at
                ? new Date(distribution.sent_at).toLocaleString("it-IT")
                : "—"}
            </p>
            <div className="mt-2">
              {recipient.acknowledged_at ? (
                <Badge variant="confirmed" size="sm">
                  Confermato il{" "}
                  {new Date(recipient.acknowledged_at).toLocaleString("it-IT")}
                </Badge>
              ) : (
                <Badge variant="pending" size="sm">
                  In attesa di conferma
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {sheet && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewSheet(sheet)}
              >
                <Eye className="h-3.5 w-3.5" />
                Apri
              </Button>
            )}
            {canExportPdf && sheet && onExportPdf && (
              <Button
                variant="outline"
                size="sm"
                disabled={exportingId === sheet.id}
                onClick={() => handleExport(sheet)}
              >
                {exportingId === sheet.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                PDF
              </Button>
            )}
            {item.canAcknowledge && !recipient.acknowledged_at ? (
              <Button
                size="sm"
                disabled={loadingId === recipient.id}
                onClick={() => handleAck(recipient.id)}
              >
                {loadingId === recipient.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                Conferma presa visione
              </Button>
            ) : recipient.acknowledged_at ? (
              <p className="text-[12px] text-[var(--accent-green)] flex items-center gap-1.5 px-2 self-center">
                <CheckCircle className="h-3.5 w-3.5" />
                Presa visione confermata
              </p>
            ) : null}
          </div>
        </div>
      </PremiumCard>
    );
  };

  if (allItems.length === 0) {
    if (variant === "page") {
      return (
        <EmptyState
          icon={FileText}
          title="Nessuna call sheet ricevuta"
          description="Le call sheet inviate al tuo reparto appariranno qui con il bottone di conferma presa visione."
        />
      );
    }
    return null;
  }

  return (
    <section className="space-y-4">
      <SectionTitle
        title="Call sheet ricevute"
        description="Conferma la presa visione delle call sheet inviate al tuo reparto."
      />

      {ackError && (
        <p className="text-[12px] text-red-400 rounded-[var(--radius-sm)] border border-red-400/20 bg-red-400/5 px-3 py-2">
          {ackError}
        </p>
      )}

      {displayItems.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            filter === "history"
              ? "Nessuno storico"
              : filter === "pending"
                ? "Nessuna call sheet in attesa"
                : "Nessuna call sheet ricevuta"
          }
          description={
            filter === "pending"
              ? "Hai confermato tutte le call sheet ricevute."
              : "Le call sheet inviate al tuo reparto appariranno qui."
          }
        />
      ) : (
        <div className="space-y-3">{displayItems.map(renderCard)}</div>
      )}

      {viewSheet && (
        <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-[var(--text-primary)]">
              Anteprima call sheet
            </p>
            <Button variant="subtle" size="sm" onClick={() => setViewSheet(null)}>
              Chiudi
            </Button>
          </div>
          <CallSheetPreview callSheet={viewSheet} />
        </div>
      )}
    </section>
  );
}
