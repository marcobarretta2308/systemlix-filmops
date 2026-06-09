export type ChunkProcessingSummary = {
  chunk_index: number;
  scene_range: string | null;
  status: string;
  scenes_count?: number;
};

export type BreakdownProcessingReport = {
  total_chunks_planned: number;
  total_chunks_analyzed: number;
  total_scenes_detected: number;
  total_characters_detected: number;
  total_locations_detected: number;
  uncertain_scenes_count: number;
  warnings_count: number;
  failed_chunks?: { chunk_index: number; error: string }[];
  chunk_summaries?: ChunkProcessingSummary[];
};

export type QualityIssue = {
  type: string;
  message: string;
  scene_number?: string;
  severity: "low" | "medium" | "high";
};

export type BreakdownQualityCheck = {
  quality_status: "good" | "needs_review" | "critical";
  issues: QualityIssue[];
};

export type ScriptExtractionMeta = {
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  estimated_pages?: number;
  character_count: number;
  detected_scenes_count: number;
  chunk_count: number;
  large_script_warning?: boolean;
  extraction_warning?: string;
};

export type BreakdownProgressUpdate = {
  stage: BreakdownProgressStage;
  currentChunk?: number;
  totalChunks?: number;
  message: string;
  extraction?: ScriptExtractionMeta & {
    file_name?: string;
    estimated_pages?: number;
    large_script_warning?: boolean;
  };
};

export type BreakdownProgressStage =
  | "extracting"
  | "detecting_scenes"
  | "splitting_chunks"
  | "analyzing_chunk"
  | "merging"
  | "quality_check"
  | "ready"
  | "failed";

export type ChunkStatus = {
  id: string;
  chunk_index: number;
  scene_range: string | null;
  status: string;
  error_message?: string | null;
};
