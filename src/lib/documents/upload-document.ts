import { DOCUMENT_BUCKET } from "./constants";
import { buildDocumentStoragePath, validateDocumentFile } from "./validate";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as db from "@/lib/supabase/data";
import type { ProjectDocument } from "@/lib/types";

export interface UploadDocumentInput {
  file: File;
  projectId: string;
  companyId: string;
  workspaceId?: string;
  userId: string;
  category: string;
  visibility: string;
  department?: string | null;
  notes?: string | null;
  onProgress?: (percent: number) => void;
}

export async function uploadProjectDocument(
  supabase: SupabaseClient,
  input: UploadDocumentInput
): Promise<{ ok: true; document: ProjectDocument } | { ok: false; error: string }> {
  const validation = validateDocumentFile(input.file);
  if (!validation.ok) return validation;

  const documentId = crypto.randomUUID();
  const filePath = buildDocumentStoragePath(
    input.companyId,
    input.projectId,
    documentId,
    input.file.name
  );

  input.onProgress?.(10);

  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(filePath, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type || undefined,
    });

  if (storageError) {
    console.error("[FilmOps] document upload storage error:", storageError);
    return { ok: false, error: storageError.message };
  }

  input.onProgress?.(70);

  try {
    const document = await db.insertProjectDocumentRecord(supabase, {
      id: documentId,
      company_id: input.companyId,
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      uploaded_by: input.userId,
      file_name: filePath.split("/").pop() ?? input.file.name,
      original_file_name: input.file.name,
      file_path: filePath,
      mime_type: input.file.type || undefined,
      size_bytes: input.file.size,
      category: input.category,
      department:
        input.visibility === "department" ? input.department ?? null : null,
      visibility: input.visibility,
      notes: input.notes ?? null,
    });

    input.onProgress?.(100);
    return { ok: true, document };
  } catch (err) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([filePath]);
    console.error("[FilmOps] document upload db error:", err);
    const message = err instanceof Error ? err.message : "Failed to save document record";
    return { ok: false, error: message };
  }
}

export async function getDocumentSignedUrl(
  supabase: SupabaseClient,
  filePath: string,
  expiresIn = 3600
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("[FilmOps] signed url error:", error);
    return { ok: false, error: error?.message ?? "Could not generate download link" };
  }

  return { ok: true, url: data.signedUrl };
}
