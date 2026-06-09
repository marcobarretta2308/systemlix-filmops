"use client";

import { Badge } from "@/components/ui/Badge";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "@/components/ui/Table";
import type { CallSheet, CallSheetDistribution, CallSheetRecipient } from "@/lib/types";
import { useMemo, useState } from "react";

interface ReadReceiptsPanelProps {
  callSheets: CallSheet[];
  distributions: CallSheetDistribution[];
  recipients: CallSheetRecipient[];
}

export function ReadReceiptsPanel({
  callSheets,
  distributions,
  recipients,
}: ReadReceiptsPanelProps) {
  const [distributionId, setDistributionId] = useState(
    distributions[0]?.id ?? ""
  );
  const [deptFilter, setDeptFilter] = useState("all");

  const activeDistribution =
    distributions.find((d) => d.id === distributionId) ?? distributions[0];

  const distributionRecipients = useMemo(() => {
    if (!activeDistribution) return [];
    return recipients.filter((r) => r.distribution_id === activeDistribution.id);
  }, [recipients, activeDistribution]);

  const filtered = useMemo(() => {
    if (deptFilter === "all") return distributionRecipients;
    return distributionRecipients.filter((r) => r.department === deptFilter);
  }, [distributionRecipients, deptFilter]);

  const confirmed = filtered.filter((r) => r.acknowledged_at);
  const pending = filtered.filter((r) => !r.acknowledged_at);
  const percent =
    filtered.length > 0
      ? Math.round((confirmed.length / filtered.length) * 100)
      : 0;

  const departments = useMemo(() => {
    const set = new Set(
      distributionRecipients.map((r) => r.department).filter(Boolean) as string[]
    );
    return [...set].sort();
  }, [distributionRecipients]);

  const sheet = activeDistribution
    ? callSheets.find((s) => s.id === activeDistribution.call_sheet_id)
    : null;

  if (distributions.length === 0) {
    return (
      <PremiumCard padding="md">
        <p className="text-[13px] text-[var(--text-muted)]">
          No call sheet distributions yet. Send a call sheet to start tracking read receipts.
        </p>
      </PremiumCard>
    );
  }

  return (
    <section className="space-y-4">
      <SectionTitle
        title="Read receipts"
        description="Track who received and acknowledged each call sheet distribution"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Distribution"
          value={distributionId || activeDistribution?.id || ""}
          onChange={(e) => setDistributionId(e.target.value)}
          options={distributions.map((d) => {
            const cs = callSheets.find((s) => s.id === d.call_sheet_id);
            const label = cs
              ? `v${d.version_number} · Day ${cs.day_number} · ${new Date(d.sent_at ?? d.created_at).toLocaleDateString("it-IT")}`
              : `v${d.version_number}`;
            return { value: d.id, label };
          })}
        />
        <Select
          label="Department filter"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          options={[
            { value: "all", label: "All departments" },
            ...departments.map((d) => ({ value: d, label: d })),
          ]}
        />
      </div>

      <PremiumCard padding="md" variant="elevated">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-medium text-[var(--text-primary)] tabular-nums">
              {confirmed.length}/{filtered.length} confirmed
            </p>
            <p className="text-[13px] text-[var(--text-muted)]">{percent}% acknowledgement</p>
          </div>
          {sheet && (
            <p className="text-[12px] text-[var(--text-muted)]">
              {sheet.project_title} · {sheet.location}
            </p>
          )}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
          <div
            className="h-full rounded-full bg-[var(--accent-green)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </PremiumCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <PremiumCard padding="md">
          <p className="text-[12px] font-medium text-[var(--text-primary)] mb-3">
            Confirmed ({confirmed.length})
          </p>
          {confirmed.length === 0 ? (
            <p className="text-[12px] text-[var(--text-muted)]">No confirmations yet.</p>
          ) : (
            <ul className="space-y-2">
              {confirmed.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-[12px]">
                  <div className="text-[var(--text-secondary)]">
                    <span>
                      {r.full_name ?? r.recipient_name ?? r.user_id?.slice(0, 8) ?? "—"}
                    </span>
                    {r.email && (
                      <p className="text-[11px] text-[var(--text-muted)]">{r.email}</p>
                    )}
                  </div>
                  <Badge variant="confirmed" size="sm">
                    {r.acknowledged_at
                      ? new Date(r.acknowledged_at).toLocaleString("it-IT", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </PremiumCard>

        <PremiumCard padding="md">
          <p className="text-[12px] font-medium text-[var(--text-primary)] mb-3">
            Pending ({pending.length})
          </p>
          {pending.length === 0 ? (
            <p className="text-[12px] text-[var(--text-muted)]">All recipients confirmed.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((r) => (
                <li key={r.id} className="text-[12px] text-[var(--text-muted)]">
                  {r.full_name ?? r.recipient_name ?? r.user_id?.slice(0, 8) ?? "—"}
                  {r.email ? ` · ${r.email}` : ""}
                  {r.department ? ` · ${r.department}` : ""}
                </li>
              ))}
            </ul>
          )}
        </PremiumCard>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableTh>Name</TableTh>
            <TableTh>Email</TableTh>
            <TableTh>Department</TableTh>
            <TableTh>Status</TableTh>
            <TableTh className="text-right">Acknowledged</TableTh>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableTd className="text-[var(--text-primary)]">
                {r.full_name ?? r.recipient_name ?? "—"}
              </TableTd>
              <TableTd className="text-[var(--text-muted)]">
                {r.email ?? "—"}
              </TableTd>
              <TableTd className="text-[var(--text-muted)]">
                {r.department ?? "—"}
              </TableTd>
              <TableTd>
                <Badge variant={r.acknowledged_at ? "confirmed" : "pending"} size="sm">
                  {r.acknowledged_at ? "Confirmed" : "Pending"}
                </Badge>
              </TableTd>
              <TableTd className="text-right text-[12px] text-[var(--text-muted)]">
                {r.acknowledged_at
                  ? new Date(r.acknowledged_at).toLocaleString("it-IT")
                  : "—"}
              </TableTd>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
