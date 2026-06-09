"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { uploadProjectDocument } from "@/lib/documents/upload-document";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_DEPARTMENTS,
  DOCUMENT_VISIBILITY_OPTIONS,
  MEMBER_DEPARTMENT_TO_DOCUMENT,
  MAX_DOCUMENT_SIZE_BYTES,
} from "@/lib/documents/constants";
import { getClientOrNull } from "@/lib/supabase/client";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";

interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  companyId: string;
  workspaceId?: string;
  userId: string;
  defaultDepartment?: string | null;
  onSuccess: () => void;
}

export function DocumentUploadModal({
  open,
  onClose,
  projectId,
  companyId,
  workspaceId,
  userId,
  defaultDepartment,
  onSuccess,
}: DocumentUploadModalProps) {
  const initialDepartment = defaultDepartment ?? DOCUMENT_DEPARTMENTS[0];

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [visibility, setVisibility] = useState<string>(
    defaultDepartment ? "department" : "project"
  );
  const [department, setDepartment] = useState<string>(initialDepartment);
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFile(null);
    setCategory(DOCUMENT_CATEGORIES[0]);
    setVisibility(defaultDepartment ? "department" : "project");
    setDepartment(initialDepartment);
    setNotes("");
    setProgress(0);
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const supabase = getClientOrNull();
    if (!supabase || !file) {
      setError("Select a file to upload.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setProgress(5);

    const result = await uploadProjectDocument(supabase, {
      file,
      projectId,
      companyId,
      workspaceId,
      userId,
      category,
      visibility,
      department: visibility === "department" ? department : null,
      notes: notes.trim() || null,
      onProgress: setProgress,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    reset();
    onSuccess();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Upload document" size="lg">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            File
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp"
            disabled={submitting}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
            className="block w-full text-[13px] text-[var(--text-secondary)] file:mr-3 file:rounded-[var(--radius-sm)] file:border file:border-[var(--border-subtle)] file:bg-[var(--bg-elevated)] file:px-3 file:py-1.5 file:text-[12px] file:text-[var(--text-secondary)]"
          />
          <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
            Max {MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB · PDF, Office, CSV, TXT, images
          </p>
        </div>

        <Select
          label="Category"
          value={category}
          disabled={submitting}
          onChange={(e) => setCategory(e.target.value)}
          options={DOCUMENT_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />

        <Select
          label="Visibility"
          value={visibility}
          disabled={submitting}
          onChange={(e) => setVisibility(e.target.value)}
          options={DOCUMENT_VISIBILITY_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />

        {visibility === "department" && (
          <Select
            label="Department"
            value={department}
            disabled={submitting}
            onChange={(e) => setDepartment(e.target.value)}
            options={DOCUMENT_DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          />
        )}

        <Input
          label="Notes (optional)"
          value={notes}
          disabled={submitting}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Version, context, distribution notes…"
        />

        {submitting && (
          <div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full bg-[var(--accent-cyan)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-[12px] text-[var(--accent-red)] leading-relaxed">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" disabled={submitting} onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={submitting || !file} onClick={handleSubmit}>
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload document
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
