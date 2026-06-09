import type { ProBreakdownResult } from "@/lib/ai/script-breakdown-pro";
import type {
  BreakdownProgressUpdate,
  ScriptExtractionMeta,
} from "@/lib/script-breakdown/types";

export type PipelineChunk = {
  id: string;
  chunk_index: number;
  scene_range: string | null;
  status: string;
  error_message?: string | null;
};

export type PipelineProgress = BreakdownProgressUpdate;

type PrepareResponse = {
  run_id: string;
  script_revision_id: string;
  total_chunks: number;
  chunks: PipelineChunk[];
  extraction: ScriptExtractionMeta & {
    file_name?: string;
    estimated_pages?: number;
    large_script_warning?: boolean;
    extraction_warning?: string;
  };
};

export async function runChunkedBreakdownPipeline(input: {
  projectId: string;
  scriptText?: string;
  documentId?: string | null;
  inputType: "paste" | "upload";
  revisionName?: string;
  revisionDate?: string;
  onProgress: (progress: PipelineProgress) => void;
  allowPartialOnMerge?: boolean;
}): Promise<ProBreakdownResult> {
  input.onProgress({
    stage: "extracting",
    message: input.documentId
      ? "Extracting text from PDF"
      : "Extracting script text",
  });

  const prepareRes = await fetch(
    `/api/projects/${input.projectId}/breakdown/prepare`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scriptText: input.scriptText,
        documentId: input.documentId,
        inputType: input.inputType,
        revisionName: input.revisionName,
        revisionDate: input.revisionDate,
      }),
    }
  );

  const prepareData = (await prepareRes.json().catch(() => ({}))) as PrepareResponse & {
    error?: string;
    message?: string;
    partialText?: string;
    extractionStatus?: string;
  };

  if (!prepareRes.ok) {
    const err = new Error(
      prepareData.message ?? prepareData.error ?? "Prepare breakdown failed"
    ) as Error & { partialText?: string; extractionStatus?: string };
    err.partialText = prepareData.partialText;
    err.extractionStatus = prepareData.extractionStatus;
    throw err;
  }

  const extractionMeta = prepareData.extraction;

  input.onProgress({
    stage: "detecting_scenes",
    message: `Detecting scene headings (~${prepareData.extraction.detected_scenes_count})`,
    totalChunks: prepareData.total_chunks,
    extraction: extractionMeta,
  });

  input.onProgress({
    stage: "splitting_chunks",
    message: `Splitting into ${prepareData.total_chunks} chunks`,
    totalChunks: prepareData.total_chunks,
    extraction: extractionMeta,
  });

  if (typeof window !== "undefined") {
    sessionStorage.setItem(
      `filmops-breakdown-${input.projectId}`,
      JSON.stringify({
        run_id: prepareData.run_id,
        script_revision_id: prepareData.script_revision_id,
        total_chunks: prepareData.total_chunks,
        extraction: extractionMeta,
      })
    );
  }

  const failedChunks: Array<PipelineChunk & { chunkNumber: number }> = [];

  for (let i = 0; i < prepareData.chunks.length; i += 1) {
    const chunk = prepareData.chunks[i];
    const chunkNumber = i + 1;

    input.onProgress({
      stage: "analyzing_chunk",
      currentChunk: chunkNumber,
      totalChunks: prepareData.total_chunks,
      message: `Analyzing chunk ${chunkNumber} of ${prepareData.total_chunks}`,
      extraction: extractionMeta,
    });

    const analyzeRes = await fetch(
      `/api/projects/${input.projectId}/breakdown/analyze-chunk`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: prepareData.run_id,
          chunkId: chunk.id,
          totalChunks: prepareData.total_chunks,
        }),
      }
    );

    if (!analyzeRes.ok) {
      const errData = (await analyzeRes.json().catch(() => ({}))) as {
        message?: string;
      };
      const chunkError = `PDF analysis failed at chunk ${chunkNumber}: ${
        errData.message ?? "Chunk analysis failed"
      }`;
      failedChunks.push({
        ...chunk,
        status: "failed",
        error_message: chunkError,
        chunkNumber,
      });
      continue;
    }
  }

  input.onProgress({
    stage: "merging",
    message: "Merging breakdown",
    totalChunks: prepareData.total_chunks,
    extraction: extractionMeta,
  });

  const mergeRes = await fetch(
    `/api/projects/${input.projectId}/breakdown/merge`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: prepareData.run_id,
        scriptRevisionId: prepareData.script_revision_id,
        extraction: {
          file_name: prepareData.extraction.file_name,
          estimated_pages: prepareData.extraction.estimated_pages,
          character_count: prepareData.extraction.character_count,
          detected_scenes_count: prepareData.extraction.detected_scenes_count,
          chunk_count: prepareData.extraction.chunk_count,
          large_script_warning: prepareData.extraction.large_script_warning,
        },
        allowPartial:
          input.allowPartialOnMerge ?? failedChunks.length > 0,
      }),
    }
  );

  const mergeData = (await mergeRes.json().catch(() => ({}))) as ProBreakdownResult & {
    error?: string;
    message?: string;
    can_continue_partial?: boolean;
    failed_chunks?: PipelineChunk[];
  };

  if (!mergeRes.ok) {
    if (mergeRes.status === 409 && mergeData.can_continue_partial) {
      throw new Error(
        mergeData.message ??
          "Some chunks failed. Retry failed chunks or continue with partial results."
      );
    }
    throw new Error(
      mergeData.message ?? mergeData.error ?? "Merge breakdown failed"
    );
  }

  input.onProgress({
    stage: "quality_check",
    message: "Running quality check",
    extraction: extractionMeta,
  });

  input.onProgress({
    stage: "ready",
    message: "Ready for review",
    extraction: extractionMeta,
  });

  if (typeof window !== "undefined") {
    sessionStorage.removeItem(`filmops-breakdown-${input.projectId}`);
  }

  const result: ProBreakdownResult = {
    ...mergeData,
    script_revision_id: prepareData.script_revision_id,
    breakdown_run_id: prepareData.run_id,
    extraction_meta: {
      file_name: prepareData.extraction.file_name,
      estimated_pages: prepareData.extraction.estimated_pages,
      character_count: prepareData.extraction.character_count,
      detected_scenes_count: prepareData.extraction.detected_scenes_count,
      chunk_count: prepareData.extraction.chunk_count,
      large_script_warning: prepareData.extraction.large_script_warning,
    },
  };

  if (failedChunks.length > 0 && result.processing_report) {
    result.processing_report = {
      ...result.processing_report,
      failed_chunks: [
        ...(result.processing_report.failed_chunks ?? []),
        ...failedChunks.map((c) => ({
          chunk_index: c.chunk_index,
          error: c.error_message ?? "Unknown error",
        })),
      ],
      warnings_count:
        (result.processing_report.warnings_count ?? 0) + failedChunks.length,
    };
  }

  return result;
}

export async function resumeChunkedBreakdownPipeline(input: {
  projectId: string;
  runId: string;
  scriptRevisionId: string;
  totalChunks: number;
  extraction?: ScriptExtractionMeta;
  onProgress: (progress: PipelineProgress) => void;
  allowPartialOnMerge?: boolean;
}): Promise<ProBreakdownResult> {
  const resumeRes = await fetch(
    `/api/projects/${input.projectId}/breakdown/resume?runId=${input.runId}`
  );
  const resumeData = (await resumeRes.json().catch(() => ({}))) as {
    chunks?: PipelineChunk[];
    error?: string;
  };
  if (!resumeRes.ok) {
    throw new Error(resumeData.error ?? "Could not resume breakdown run");
  }

  const chunks = resumeData.chunks ?? [];

  for (const chunk of chunks) {
    if (chunk.status === "completed") continue;

    const chunkNumber = chunk.chunk_index + 1;

    input.onProgress({
      stage: "analyzing_chunk",
      currentChunk: chunkNumber,
      totalChunks: input.totalChunks,
      message: `Analyzing chunk ${chunkNumber} of ${input.totalChunks}`,
      extraction: input.extraction,
    });

    const analyzeRes = await fetch(
      `/api/projects/${input.projectId}/breakdown/analyze-chunk`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: input.runId,
          chunkId: chunk.id,
          totalChunks: input.totalChunks,
        }),
      }
    );

    if (!analyzeRes.ok) {
      const errData = (await analyzeRes.json().catch(() => ({}))) as {
        message?: string;
      };
      console.warn(
        `[Script Breakdown] PDF analysis failed at chunk ${chunkNumber}:`,
        errData.message
      );
    }
  }

  input.onProgress({ stage: "merging", message: "Merging breakdown" });

  const mergeRes = await fetch(
    `/api/projects/${input.projectId}/breakdown/merge`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: input.runId,
        scriptRevisionId: input.scriptRevisionId,
        extraction: input.extraction,
        allowPartial: input.allowPartialOnMerge ?? true,
      }),
    }
  );

  const mergeData = (await mergeRes.json().catch(() => ({}))) as ProBreakdownResult & {
    message?: string;
    error?: string;
  };

  if (!mergeRes.ok) {
    throw new Error(mergeData.message ?? mergeData.error ?? "Merge breakdown failed");
  }

  if (typeof window !== "undefined") {
    sessionStorage.removeItem(`filmops-breakdown-${input.projectId}`);
  }

  return {
    ...mergeData,
    script_revision_id: input.scriptRevisionId,
    breakdown_run_id: input.runId,
  };
}

export async function retryBreakdownChunk(input: {
  projectId: string;
  runId: string;
  chunkId: string;
  totalChunks: number;
}): Promise<void> {
  const res = await fetch(
    `/api/projects/${input.projectId}/breakdown/analyze-chunk`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: input.runId,
        chunkId: input.chunkId,
        totalChunks: input.totalChunks,
      }),
    }
  );

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Chunk analysis failed");
  }
}
