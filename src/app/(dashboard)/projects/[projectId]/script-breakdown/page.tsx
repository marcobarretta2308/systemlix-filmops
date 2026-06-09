"use client";

import { BreakdownProgressPanel } from "@/components/script-breakdown/BreakdownProgressPanel";
import { ReviewBreakdownPanel } from "@/components/script-breakdown/ReviewBreakdownPanel";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import type { ProBreakdownResult } from "@/lib/ai/script-breakdown-pro";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { uploadProjectDocument } from "@/lib/documents/upload-document";
import { getClientOrNull } from "@/lib/supabase/client";
import { canGenerateBreakdown } from "@/lib/script-breakdown/permissions";
import {
  defaultRevisionName,
  extractScriptTextFromFile,
  isPdfScriptFile,
} from "@/lib/script-breakdown/parse-script-file";
import {
  SCRIPT_MIN_LENGTH,
  validateScriptInputLength,
} from "@/lib/script-breakdown/errors";
import {
  resumeChunkedBreakdownPipeline,
  runChunkedBreakdownPipeline,
} from "@/lib/script-breakdown/run-pipeline";
import type {
  BreakdownProgressStage,
  BreakdownProgressUpdate,
} from "@/lib/script-breakdown/types";
import type { SaveBreakdownOptions } from "@/lib/script-breakdown/save-to-project";
import {
  ArrowLeft,
  Loader2,
  ScrollText,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type InputMode = "paste" | "upload";
type Step = "input" | "review";

export default function ScriptBreakdownPage() {
  const { projectId, project, isProjectReady } = useSyncProjectFromUrl();
  const { user } = useAuth();
  const { companyRole } = useCompany();
  const {
    projectPermissions,
    projectRole,
    locations: projectLocations,
    refreshProjectData,
    isLoadingProjectData,
  } = useProject();

  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [scriptText, setScriptText] = useState("");
  const [revisionName, setRevisionName] = useState("");
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(
    null
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{
    size: number;
    mimeType: string;
  } | null>(null);
  const [isPdfUpload, setIsPdfUpload] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [extractionPreview, setExtractionPreview] = useState<{
    ok: boolean;
    message?: string;
    file_name?: string;
    estimated_pages?: number;
    character_count?: number;
    detected_scenes_count?: number;
    estimated_chunks?: number;
    extraction_warning?: string;
    partialText?: string;
  } | null>(null);
  const [extractionFallback, setExtractionFallback] = useState(false);
  const [breakdown, setBreakdown] = useState<ProBreakdownResult | null>(null);
  const [scriptRevisionId, setScriptRevisionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [progressStage, setProgressStage] =
    useState<BreakdownProgressStage>("extracting");
  const [progressMessage, setProgressMessage] = useState("");
  const [progressChunk, setProgressChunk] = useState<{
    current?: number;
    total?: number;
  }>({});
  const [progressExtraction, setProgressExtraction] =
    useState<BreakdownProgressUpdate["extraction"]>();
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<
    "success" | "error" | "warning"
  >("success");

  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingResume, setPendingResume] = useState<{
    run_id: string;
    script_revision_id: string;
    total_chunks: number;
    extraction?: BreakdownProgressUpdate["extraction"];
  } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const raw = sessionStorage.getItem(`filmops-breakdown-${projectId}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        run_id: string;
        script_revision_id: string;
        total_chunks: number;
        extraction?: BreakdownProgressUpdate["extraction"];
      };
      if (parsed.run_id) setPendingResume(parsed);
    } catch {
      sessionStorage.removeItem(`filmops-breakdown-${projectId}`);
    }
  }, [projectId]);

  const canGenerate = canGenerateBreakdown(
    user,
    companyRole,
    projectRole,
    projectPermissions.can_edit_breakdown
  );

  const notify = (
    message: string,
    variant: "success" | "error" | "warning" = "success"
  ) => {
    setToastVariant(variant);
    setToast(message);
  };

  const canAnalyze =
    canGenerate &&
    !isAnalyzing &&
    !isUploading &&
    (scriptText.trim().length >= SCRIPT_MIN_LENGTH || Boolean(uploadedDocumentId));

  const runExtractPreview = async (documentId: string) => {
    if (!projectId) return;
    setUploadStatus("Extracting text from PDF…");
    try {
      const res = await fetch(
        `/api/projects/${projectId}/breakdown/extract-preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        partialText?: string;
        preview_text?: string;
        text_length?: number;
        file_name?: string;
        estimated_pages?: number;
        character_count?: number;
        detected_scenes_count?: number;
        estimated_chunks?: number;
        extraction_warning?: string;
      };

      if (data.ok) {
        setExtractionPreview({
          ok: true,
          file_name: data.file_name,
          estimated_pages: data.estimated_pages,
          character_count: data.character_count,
          detected_scenes_count: data.detected_scenes_count,
          estimated_chunks: data.estimated_chunks,
          extraction_warning: data.extraction_warning,
        });
        setExtractionFallback(false);
        setUploadStatus(null);
        if (data.text_length && data.text_length <= 14_000 && data.preview_text) {
          setScriptText(data.preview_text);
        }
        return;
      }

      setExtractionPreview({
        ok: false,
        message: data.message ?? "PDF text extraction failed",
        partialText: data.partialText,
        character_count: data.character_count,
      });
      setExtractionFallback(true);
      if (data.partialText) {
        setScriptText(data.partialText);
      }
      setUploadStatus(null);
      notify(
        data.message?.includes("scanned")
          ? data.message
          : `PDF text extraction failed: ${data.message ?? "No readable text found in this PDF."}`,
        "error"
      );
    } catch (err) {
      setUploadStatus(null);
      notify(
        `PDF text extraction failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file || !project || !user || !projectId) return;

    setIsUploading(true);
    setParseMessage(null);
    setUploadedDocumentId(null);
    setUploadedFileName(null);
    setUploadedFileMeta(null);
    setExtractionPreview(null);
    setExtractionFallback(false);
    setUploadStatus(
      isPdfScriptFile(file) ? "Uploading script PDF…" : "Uploading script file…"
    );
    setIsPdfUpload(isPdfScriptFile(file));

    const supabase = getClientOrNull();
    if (!supabase) {
      notify("Supabase not configured", "error");
      setIsUploading(false);
      return;
    }

    try {
      const nextRevisionName = defaultRevisionName(file.name);
      setRevisionName(nextRevisionName);
      setUploadedFileName(file.name);
      setUploadedFileMeta({
        size: file.size,
        mimeType: file.type || "application/octet-stream",
      });

      if (!isPdfScriptFile(file)) {
        try {
          const extract = await extractScriptTextFromFile(file);
          if (extract.text) {
            setScriptText(extract.text);
          } else if (extract) {
            setParseMessage(
              extract.message ??
                "Could not extract text automatically. Paste the script manually."
            );
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Could not read script file";
          notify(`Script parsing failed: ${message}`, "error");
        }
      } else {
        setParseMessage(
          "PDF saved to Documents Vault. Extracting text server-side…"
        );
      }

      const category =
        nextRevisionName.toLowerCase().includes("revision") ||
        file.name.toLowerCase().includes("revision")
          ? "Script Revision"
          : "Script";

      const upload = await uploadProjectDocument(supabase, {
        file,
        projectId,
        companyId: project.company_id,
        workspaceId: project.workspace_id,
        userId: user.id,
        category,
        visibility: "project",
        notes: "Uploaded via Script Breakdown Pro",
      });

      if (!upload.ok) {
        notify(`Script upload failed: ${upload.error}`, "error");
        setIsUploading(false);
        return;
      }

      setUploadedDocumentId(upload.document.id);
      notify("Script file saved to Documents Vault.", "success");

      if (isPdfScriptFile(file)) {
        await runExtractPreview(upload.document.id);
      } else {
        setUploadStatus(null);
      }
    } catch (err) {
      notify(
        `Script upload failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "error"
      );
      setUploadStatus(null);
    } finally {
      setIsUploading(false);
    }
  };

  const runSingleShotAnalysis = async () => {
    const response = await fetch("/api/ai/script-breakdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scriptText,
        projectId,
        inputType: inputMode,
        documentId: uploadedDocumentId,
        revisionName: revisionName || "Script breakdown",
        revisionDate: new Date().toISOString().slice(0, 10),
      }),
    });

    const data = (await response.json().catch(() => ({}))) as ProBreakdownResult & {
      error?: string;
      message?: string;
      details?: string | null;
      script_revision_id?: string;
      persist_warning?: string | null;
    };

    if (!response.ok) {
      const realMessage =
        data.message?.trim() || data.error?.trim() || "Unknown error";
      throw new Error(realMessage);
    }

    if (!data.scenes?.length) {
      throw new Error("No scenes extracted from script");
    }

    return data;
  };

  const handleResume = async () => {
    if (!projectId || !pendingResume) return;
    setIsAnalyzing(true);
    try {
      const result = await resumeChunkedBreakdownPipeline({
        projectId,
        runId: pendingResume.run_id,
        scriptRevisionId: pendingResume.script_revision_id,
        totalChunks: pendingResume.total_chunks,
        extraction: pendingResume.extraction,
        allowPartialOnMerge: true,
        onProgress: (progress) => {
          setProgressStage(progress.stage);
          setProgressMessage(progress.message);
          setProgressChunk({
            current: progress.currentChunk,
            total: progress.totalChunks,
          });
          if (progress.extraction) setProgressExtraction(progress.extraction);
        },
      });
      setBreakdown(result);
      setScriptRevisionId(result.script_revision_id ?? null);
      setPendingResume(null);
      setStep("review");
      notify(
        `Resumed analysis — ${result.scenes.length} scenes ready for review.`,
        "success"
      );
    } catch (err) {
      notify(
        `Script breakdown failed: ${
          err instanceof Error ? err.message : "Resume failed"
        }`,
        "error"
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!projectId) return;
    if (!scriptText.trim() && !uploadedDocumentId) return;

    const lengthCheck = scriptText.trim()
      ? validateScriptInputLength(scriptText)
      : null;

    if (lengthCheck && !lengthCheck.ok) {
      notify(lengthCheck.message, "error");
      return;
    }

    setIsAnalyzing(true);
    setProgressStage("extracting");
    setProgressMessage(
      uploadedDocumentId && isPdfUpload
        ? "Extracting text from PDF…"
        : "Starting analysis…"
    );
    setProgressExtraction(
      extractionPreview?.ok
        ? {
            file_name: extractionPreview.file_name ?? uploadedFileName ?? undefined,
            mime_type: uploadedFileMeta?.mimeType,
            file_size: uploadedFileMeta?.size,
            estimated_pages: extractionPreview.estimated_pages,
            character_count: extractionPreview.character_count ?? 0,
            detected_scenes_count: extractionPreview.detected_scenes_count ?? 0,
            chunk_count: extractionPreview.estimated_chunks ?? 0,
            extraction_warning: extractionPreview.extraction_warning,
          }
        : uploadedFileName
          ? {
              file_name: uploadedFileName,
              mime_type: uploadedFileMeta?.mimeType,
              file_size: uploadedFileMeta?.size,
              character_count: scriptText.trim().length,
              detected_scenes_count: 0,
              chunk_count: 0,
            }
          : undefined
    );

    try {
      const useChunked =
        (lengthCheck?.ok === true && lengthCheck.chunked) ||
        Boolean(uploadedDocumentId && (isPdfUpload || !scriptText.trim()));

      let result: ProBreakdownResult;

      if (useChunked) {
        result = await runChunkedBreakdownPipeline({
          projectId,
          scriptText: scriptText.trim() || undefined,
          documentId: uploadedDocumentId,
          inputType: inputMode,
          revisionName: revisionName || "Script breakdown",
          revisionDate: new Date().toISOString().slice(0, 10),
          allowPartialOnMerge: true,
          onProgress: (progress) => {
            setProgressStage(progress.stage);
            setProgressMessage(progress.message);
            setProgressChunk({
              current: progress.currentChunk,
              total: progress.totalChunks,
            });
            if (progress.extraction) {
              setProgressExtraction(progress.extraction);
            }
          },
        });
      } else {
        setProgressMessage("AI is analyzing script…");
        result = await runSingleShotAnalysis();
      }

      setBreakdown(result);
      setScriptRevisionId(result.script_revision_id ?? null);
      setStep("review");
      notify(
        `Analysis complete — ${result.scenes.length} scenes ready for review.`,
        "success"
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Network error during analysis";
      const partialText = (err as Error & { partialText?: string }).partialText;

      if (partialText) {
        setScriptText(partialText);
        setExtractionFallback(true);
      }

      if (
        message.includes("PDF text extraction failed") ||
        message.includes("No readable text") ||
        message.includes("scanned")
      ) {
        setExtractionFallback(true);
        notify(message, "error");
      } else if (message.includes("chunk")) {
        notify(message.startsWith("PDF") ? message : `PDF analysis failed: ${message}`, "error");
      } else if (message.includes("Merge")) {
        notify(`Merge breakdown failed: ${message}`, "error");
      } else if (message.includes("Prepare")) {
        notify(message, "error");
      } else {
        notify(`Script breakdown failed: ${message}`, "error");
      }
    } finally {
      setIsAnalyzing(false);
      setProgressMessage("");
    }
  };

  const handleSave = async (options: SaveBreakdownOptions) => {
    if (!projectId || !breakdown) return;
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/breakdown/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            breakdown,
            options,
            scriptRevisionId,
            inputType: inputMode,
          }),
        }
      );

      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        const message = data.error?.trim() || "Unknown error";
        notify(
          message.startsWith("Save breakdown failed:")
            ? message
            : `Save breakdown failed: ${message}`,
          "error"
        );
        return;
      }

      await refreshProjectData();
      notify(data.message ?? "Breakdown saved to project.", "success");
      setStep("input");
      setBreakdown(null);
      setScriptText("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      notify(`Save breakdown failed: ${message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!projectId || !isProjectReady) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No active project"
        description="Select a project before using Script Breakdown Pro."
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

  if (!canGenerate) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Access restricted"
        description="Only production managers can generate and save script breakdowns. You can view scenes from the Scenes module."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Script Breakdown Pro"
        description={
          step === "review"
            ? "Review AI breakdown before saving to your project"
            : "Paste or upload a script for AI-powered production breakdown"
        }
        actions={
          step === "review" ? (
            <Button
              variant="subtle"
              size="sm"
              onClick={() => {
                setStep("input");
                setBreakdown(null);
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to input
            </Button>
          ) : undefined
        }
      />

      {step === "input" && (
        <>
          <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-3">
            {(
              [
                ["paste", "Paste script"],
                ["upload", "Upload script"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setInputMode(key)}
                className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-[12px] transition-colors ${
                  inputMode === key
                    ? "bg-white/[0.06] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {inputMode === "upload" && (
            <PremiumCard padding="md" className="space-y-4">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.pdf,.doc,.docx,.fountain,text/plain,application/pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap items-end gap-3">
                <Button
                  variant="subtle"
                  onClick={() => fileRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Choose script file
                </Button>
                <Input
                  label="Revision name"
                  value={revisionName}
                  onChange={(e) => setRevisionName(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Supports text-based PDF and TXT. PDFs are saved to Documents
                Vault and extracted server-side. Scanned PDFs require manual paste.
              </p>
              {uploadStatus && (
                <p className="text-[12px] text-[var(--accent-cyan)] flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {uploadStatus}
                </p>
              )}
              {uploadedFileName && (
                <div className="text-[12px] text-[var(--text-secondary)] space-y-1">
                  <p>File: {uploadedFileName}</p>
                  {uploadedFileMeta && (
                    <p>
                      {uploadedFileMeta.mimeType} ·{" "}
                      {uploadedFileMeta.size < 1024 * 1024
                        ? `${(uploadedFileMeta.size / 1024).toFixed(1)} KB`
                        : `${(uploadedFileMeta.size / (1024 * 1024)).toFixed(1)} MB`}
                    </p>
                  )}
                </div>
              )}
              {parseMessage && (
                <p className="text-[12px] text-[var(--accent-amber)]">
                  {parseMessage}
                </p>
              )}
              {uploadedDocumentId && !uploadStatus && (
                <p className="text-[12px] text-[var(--accent-cyan)]">
                  Saved to Documents Vault (Script category).
                </p>
              )}
              {extractionPreview?.ok && (
                <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3 text-[11px] text-[var(--text-muted)] grid gap-1 sm:grid-cols-2">
                  {extractionPreview.estimated_pages != null &&
                    extractionPreview.estimated_pages > 0 && (
                      <p>Pages: {extractionPreview.estimated_pages}</p>
                    )}
                  {extractionPreview.character_count != null && (
                    <p>
                      Characters:{" "}
                      {extractionPreview.character_count.toLocaleString()}
                    </p>
                  )}
                  {extractionPreview.detected_scenes_count != null && (
                    <p>Scene headings: {extractionPreview.detected_scenes_count}</p>
                  )}
                  {extractionPreview.estimated_chunks != null && (
                    <p>Estimated chunks: {extractionPreview.estimated_chunks}</p>
                  )}
                  {extractionPreview.extraction_warning && (
                    <p className="sm:col-span-2 text-[var(--accent-amber)]">
                      {extractionPreview.extraction_warning}
                    </p>
                  )}
                </div>
              )}
              {extractionFallback && (
                <p className="text-[12px] text-[var(--accent-amber)]">
                  Extraction incomplete or failed. Correct the script text below
                  and click Analyze — or paste the script manually.
                </p>
              )}
            </PremiumCard>
          )}

          {pendingResume && !isAnalyzing && (
            <PremiumCard padding="md" className="border-[rgba(34,211,238,0.15)]">
              <p className="text-[13px] text-[var(--text-secondary)]">
                Interrupted breakdown detected ({pendingResume.total_chunks}{" "}
                chunks). Resume analysis without starting over.
              </p>
              <Button
                variant="subtle"
                size="sm"
                className="mt-3"
                onClick={handleResume}
              >
                Resume breakdown
              </Button>
            </PremiumCard>
          )}

          <PremiumCard padding="md">
            <Textarea
              label={
                extractionFallback
                  ? "Script text (correct or paste manually)"
                  : "Script text"
              }
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              className="min-h-[240px] font-mono text-[12px] leading-relaxed"
              placeholder={
                inputMode === "upload"
                  ? "Optional for PDF — text extracted server-side. Use this field to correct extraction or paste manually if PDF fails."
                  : "Paste screenplay text here…"
              }
              disabled={isAnalyzing || isUploading}
            />

            {(isAnalyzing || uploadStatus) && (
              <div className="mt-4">
                <BreakdownProgressPanel
                  stage={progressStage}
                  currentChunk={progressChunk.current}
                  totalChunks={progressChunk.total}
                  message={progressMessage || "AI is analyzing script…"}
                  extraction={progressExtraction}
                  uploadStatus={uploadStatus ?? undefined}
                />
              </div>
            )}

            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Minimum {SCRIPT_MIN_LENGTH} characters, or upload a PDF/TXT for
              server-side extraction. Long scripts are analyzed in chunks
              automatically.
            </p>
            <div className="mt-4">
              <Button onClick={handleAnalyze} disabled={!canAnalyze}>
                {isAnalyzing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isAnalyzing ? "Analyzing…" : "Analyze script"}
              </Button>
            </div>
          </PremiumCard>

          <EmptyState
            icon={ScrollText}
            title="No breakdown yet"
            description="Paste or upload a script, then run AI analysis. You will review scenes, characters, locations and departments before saving."
          />
        </>
      )}

      {step === "review" && breakdown && (
        <ReviewBreakdownPanel
          breakdown={breakdown}
          existingLocations={projectLocations}
          onChange={setBreakdown}
          onSave={handleSave}
          isSaving={isSaving}
          canSave={canGenerate}
        />
      )}

      <Toast
        message={toast ?? ""}
        open={!!toast}
        onClose={() => setToast(null)}
        variant={toastVariant}
      />
    </div>
  );
}
