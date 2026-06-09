/** Below this length: single OpenAI request (if scene/page thresholds not met). */
export const SINGLE_SHOT_MAX_CHARS = 14_000;

/** Force chunked pipeline when any threshold is met. */
export const CHUNK_FORCE_MIN_CHARS = 20_000;
export const CHUNK_FORCE_MIN_SCENES = 12;
export const CHUNK_FORCE_MIN_PAGES = 15;

/** Max characters per AI chunk (scene-complete groups). */
export const CHUNK_MAX_CHARS = 18_000;

/** Target max complete scenes per chunk for production safety. */
export const CHUNK_MAX_SCENES = 10;

/** Minimum chars before hard-splitting an oversized single scene block. */
export const CHUNK_MIN_SPLIT_CHARS = 4_000;

/** Light overlap when splitting paragraph fallback blocks. */
export const CHUNK_OVERLAP_CHARS = 400;

/** Warn user about long analysis time. */
export const LARGE_SCRIPT_WARNING_CHARS = 50_000;

/** Hard limit for chunked pipeline (no single request). */
export const CHUNKED_SCRIPT_MAX_CHARS = 800_000;

/** Minimum extracted PDF text to consider readable. */
export const PDF_MIN_EXTRACTED_CHARS = 100;
