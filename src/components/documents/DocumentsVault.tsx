"use client";

import { DocumentUploadModal } from "@/components/documents/DocumentUploadModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Toast } from "@/components/ui/Toast";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "@/components/ui/Table";
import { logActivity } from "@/lib/activity-log/logActivity";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_DEPARTMENTS,
  MEMBER_DEPARTMENT_TO_DOCUMENT,
  SCRIPT_CATEGORIES,
} from "@/lib/documents/constants";
import {
  canDeleteDocument,
  canUploadDocuments,
  canViewDocuments,
  filterVisibleDocuments,
  formatFileSize,
  isPreviewableMime,
} from "@/lib/documents/permissions";
import { getDocumentSignedUrl } from "@/lib/documents/upload-document";
import { isProjectFinished } from "@/lib/access-control";
import { getClientOrNull } from "@/lib/supabase/client";
import * as db from "@/lib/supabase/data";
import type { Project, ProjectDocument } from "@/lib/types";
import {
  Download,
  Eye,
  FileText,
  FolderOpen,
  Loader2,
  Lock,
  Trash2,
  Upload,
} from "lucide-react";
import { operationFailed } from "@/lib/utils/user-facing-error";
import { useMemo, useState } from "react";

interface DocumentsVaultProps {
  project: Project;
  projectId: string;
  initialUploadOpen?: boolean;
}

type ToastState = { message: string; variant: "success" | "error" } | null;

export function DocumentsVault({
  project,
  projectId,
  initialUploadOpen = false,
}: DocumentsVaultProps) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { companyRole } = useCompany();
  const {
    documents,
    refreshDocuments,
    projectRole,
    activeProjectMembership,
    isLoadingProjectData,
  } = useProject();

  const [uploadOpen, setUploadOpen] = useState(initialUploadOpen);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [uploaderFilter, setUploaderFilter] = useState("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const isArchived = isProjectFinished(project.status);
  const canView = canViewDocuments(user, companyRole, projectRole);
  const canUpload = canUploadDocuments(project, user, companyRole, projectRole);

  const visibleDocuments = useMemo(
    () =>
      filterVisibleDocuments(
        documents,
        user,
        companyRole,
        activeProjectMembership,
        projectRole
      ),
    [documents, user, companyRole, activeProjectMembership, projectRole]
  );

  const uploaders = useMemo(() => {
    const map = new Map<string, string>();
    visibleDocuments.forEach((d) => {
      map.set(d.uploaded_by, d.uploader_name ?? d.uploaded_by);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [visibleDocuments]);

  const filtered = useMemo(() => {
    return visibleDocuments.filter((doc) => {
      const q = search.trim().toLowerCase();
      if (q && !doc.original_file_name.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && doc.category !== categoryFilter) return false;
      if (departmentFilter !== "all") {
        const dept = doc.department ?? "—";
        if (departmentFilter === "none" && doc.department) return false;
        if (departmentFilter !== "none" && dept !== departmentFilter) return false;
      }
      if (uploaderFilter !== "all" && doc.uploaded_by !== uploaderFilter) return false;
      return true;
    });
  }, [visibleDocuments, search, categoryFilter, departmentFilter, uploaderFilter]);

  const scriptCount = visibleDocuments.filter((d) =>
    SCRIPT_CATEGORIES.includes(d.category as (typeof SCRIPT_CATEGORIES)[number])
  ).length;
  const departmentDocCount = visibleDocuments.filter(
    (d) => d.visibility === "department"
  ).length;
  const lastUploaded = visibleDocuments[0];

  const notify = (message: string, variant: "success" | "error") => {
    setToast({ message, variant });
  };

  const handleDownload = async (doc: ProjectDocument, preview = false) => {
    const supabase = getClientOrNull();
    if (!supabase) return;

    setActionLoading(doc.id);
    const result = await getDocumentSignedUrl(supabase, doc.file_path);
    setActionLoading(null);

    if (!result.ok) {
      notify(operationFailed(result.error), "error");
      return;
    }

    if (preview && isPreviewableMime(doc.mime_type)) {
      if (doc.mime_type?.startsWith("image/")) {
        setPreviewTitle(doc.original_file_name);
        setPreviewUrl(result.url);
      } else {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
      void logActivity({
        projectId,
        action: "document_opened",
        area: "documents",
        entityType: "document",
        entityId: doc.id,
        entityLabel: doc.original_file_name,
      });
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = doc.original_file_name;
    anchor.rel = "noopener";
    anchor.click();
    void logActivity({
      projectId,
      action: "document_downloaded",
      area: "documents",
      entityType: "document",
      entityId: doc.id,
      entityLabel: doc.original_file_name,
    });
  };

  const handleDelete = async (doc: ProjectDocument) => {
    if (
      !canDeleteDocument(
        project,
        doc,
        user,
        companyRole,
        projectRole,
        currentUserId
      )
    ) {
      return;
    }

    const supabase = getClientOrNull();
    if (!supabase) return;

    setDeletingId(doc.id);
    try {
      await db.softDeleteProjectDocumentRecord(supabase, doc.id);
      await supabase.storage.from("project-documents").remove([doc.file_path]);
      await refreshDocuments();
      notify("Document removed.", "success");
    } catch (err) {
      console.error("[FilmOps] delete document error:", err);
      notify(
        operationFailed(
          err instanceof Error ? err.message : "Could not delete document"
        ),
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="Access restricted"
        description="You are not authorized to view project documents."
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Project Documents"
        description="Centralized production files — scripts, plans, department assets and call sheets."
        actions={
          canUpload ? (
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-3.5 w-3.5" />
              Upload document
            </Button>
          ) : undefined
        }
      />

      {isArchived && (
        <PremiumCard
          padding="md"
          className="border-[rgba(245,158,11,0.12)] bg-[rgba(245,158,11,0.03)]"
        >
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            This project is archived. Documents are available in read-only mode.
          </p>
        </PremiumCard>
      )}

      <div className="grid gap-[var(--card-gap)] grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total documents"
          value={visibleDocuments.length}
          icon={FolderOpen}
        />
        <StatCard label="Scripts" value={scriptCount} icon={FileText} />
        <StatCard
          label="Department docs"
          value={departmentDocCount}
          icon={FileText}
        />
        <PremiumCard padding="sm">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Last uploaded
          </p>
          <p className="mt-1.5 text-[13px] text-[var(--text-primary)] truncate" title={lastUploaded?.original_file_name}>
            {lastUploaded?.original_file_name ?? "—"}
          </p>
          {lastUploaded && (
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              {new Date(lastUploaded.created_at).toLocaleString("it-IT")}
            </p>
          )}
        </PremiumCard>
      </div>

      <PremiumCard padding="md">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filename…"
          />
          <Select
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: "all", label: "All categories" },
              ...DOCUMENT_CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Select
            label="Department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: "all", label: "All departments" },
              { value: "none", label: "Project-wide only" },
              ...DOCUMENT_DEPARTMENTS.map((d) => ({ value: d, label: d })),
            ]}
          />
          <Select
            label="Uploaded by"
            value={uploaderFilter}
            onChange={(e) => setUploaderFilter(e.target.value)}
            options={[
              { value: "all", label: "All uploaders" },
              ...uploaders.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </div>
      </PremiumCard>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents uploaded yet"
          description="Upload scripts, production plans, department files or call sheets to centralize your project documentation."
          action={
            canUpload ? (
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="h-3.5 w-3.5" />
                Upload document
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>File</TableTh>
              <TableTh>Category</TableTh>
              <TableTh>Department</TableTh>
              <TableTh>Uploaded by</TableTh>
              <TableTh>Date</TableTh>
              <TableTh>Size</TableTh>
              <TableTh className="text-right">Actions</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((doc) => {
              const canDelete = canDeleteDocument(
                project,
                doc,
                user,
                companyRole,
                projectRole,
                currentUserId
              );
              const previewable = isPreviewableMime(doc.mime_type);
              const busy = actionLoading === doc.id || deletingId === doc.id;

              return (
                <TableRow key={doc.id}>
                  <TableTd>
                    <p className="text-[13px] text-[var(--text-primary)] font-medium truncate max-w-[220px]" title={doc.original_file_name}>
                      {doc.original_file_name}
                    </p>
                    {doc.notes && (
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)] truncate max-w-[220px]">
                        {doc.notes}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                      {doc.mime_type ?? "unknown"}
                    </p>
                  </TableTd>
                  <TableTd>
                    <Badge variant="default" size="sm">
                      {doc.category}
                    </Badge>
                  </TableTd>
                  <TableTd className="text-[12px] text-[var(--text-muted)]">
                    {doc.visibility === "department"
                      ? doc.department ?? "—"
                      : "All members"}
                  </TableTd>
                  <TableTd className="text-[12px] text-[var(--text-muted)]">
                    {doc.uploader_name ?? "—"}
                  </TableTd>
                  <TableTd className="text-[12px] text-[var(--text-muted)]">
                    {new Date(doc.created_at).toLocaleString("it-IT")}
                  </TableTd>
                  <TableTd className="text-[12px] text-[var(--text-muted)] tabular-nums">
                    {formatFileSize(doc.size_bytes)}
                  </TableTd>
                  <TableTd>
                    <div className="flex justify-end gap-1">
                      {previewable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleDownload(doc, true)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleDownload(doc)}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-[var(--accent-red)]" />
                        </Button>
                      )}
                    </div>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {currentUserId && (
        <DocumentUploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          projectId={projectId}
          companyId={project.company_id}
          workspaceId={project.workspace_id}
          userId={currentUserId}
          defaultDepartment={
            activeProjectMembership?.department
              ? MEMBER_DEPARTMENT_TO_DOCUMENT[
                  activeProjectMembership.department
                ] ?? activeProjectMembership.department
              : undefined
          }
          onSuccess={async () => {
            await refreshDocuments();
            notify("Document uploaded successfully.", "success");
            void logActivity({
              projectId,
              action: "document_uploaded",
              area: "documents",
            });
          }}
        />
      )}

      <Modal
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        title={previewTitle}
        size="xl"
      >
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={previewTitle}
            className="max-h-[70vh] w-full object-contain rounded-[var(--radius-md)]"
          />
        )}
      </Modal>

      <Toast
        message={toast?.message ?? ""}
        open={!!toast}
        variant={toast?.variant ?? "info"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
