"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getRecipientGroupOptions } from "@/lib/call-sheets/distribution";
import type { RecipientGroupKey } from "@/lib/call-sheets/constants";
import type { CallSheet, Project, ProjectMember } from "@/lib/types";
import { Loader2, Send } from "lucide-react";
import { useMemo, useState } from "react";

interface SendCallSheetModalProps {
  open: boolean;
  onClose: () => void;
  callSheet: CallSheet | null;
  project: Project;
  projectMembers: ProjectMember[];
  onSend: (
    keys: RecipientGroupKey[],
    specificUserIds: string[]
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function SendCallSheetModal({
  open,
  onClose,
  callSheet,
  project,
  projectMembers,
  onSend,
}: SendCallSheetModalProps) {
  const [selectedGroups, setSelectedGroups] = useState<Set<RecipientGroupKey>>(
    new Set()
  );
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeMembers = useMemo(
    () => projectMembers.filter((m) => m.access_status === "active"),
    [projectMembers]
  );

  const toggleGroup = (key: RecipientGroupKey) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSend = async () => {
    if (!callSheet) return;
    if (selectedGroups.size === 0 && selectedUsers.size === 0) {
      setError("Select at least one recipient group or person.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onSend([...selectedGroups], [...selectedUsers]);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Distribution failed: unknown error");
      return;
    }
    setSelectedGroups(new Set());
    setSelectedUsers(new Set());
    onClose();
  };

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} title="Send Call Sheet" size="lg">
      {callSheet && (
        <p className="text-[13px] text-[var(--text-muted)] mb-4 leading-relaxed">
          {project.title} · v{callSheet.version} · Day {callSheet.day_number} ·{" "}
          {callSheet.location}
        </p>
      )}

      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
            Recipient groups
          </p>
          <div className="flex flex-wrap gap-2">
            {getRecipientGroupOptions().map((g) => (
              <button
                key={g.key}
                type="button"
                disabled={submitting}
                onClick={() => toggleGroup(g.key)}
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  selectedGroups.has(g.key)
                    ? "border-[rgba(34,211,238,0.35)] bg-[rgba(34,211,238,0.08)] text-[var(--accent-cyan)]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
            Specific people
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-2">
            {activeMembers.length === 0 ? (
              <p className="text-[12px] text-[var(--text-muted)] px-2 py-1">
                No active project members.
              </p>
            ) : (
              activeMembers.map((m) => (
                <label
                  key={m.user_id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-white/[0.03] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(m.user_id)}
                    disabled={submitting}
                    onChange={() => toggleUser(m.user_id)}
                  />
                  <span>
                    {m.full_name || m.email || m.user_id.slice(0, 8)}
                    {m.department ? ` · ${m.department}` : ""}
                    {m.role ? ` · ${m.role}` : ""}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {error && (
          <p className="text-[12px] text-[var(--accent-red)]">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={submitting || !callSheet} onClick={handleSend}>
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Send call sheet
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
