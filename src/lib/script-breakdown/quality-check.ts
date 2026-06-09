import type { ProBreakdownResult } from "@/lib/ai/script-breakdown-pro";
import { normalizeSceneKey } from "@/lib/ai/script-breakdown-pro";
import {
  buildEntryQualityWarnings,
  buildGlobalLocationQualityWarnings,
  buildLocationReviewEntries,
} from "@/lib/locations/review-from-breakdown";
import type {
  BreakdownQualityCheck,
  QualityIssue,
} from "@/lib/script-breakdown/types";

const LOW_CONFIDENCE = 0.6;

export function validateBreakdownCompleteness(
  breakdown: ProBreakdownResult,
  options?: { incompleteChunks?: number }
): BreakdownQualityCheck {
  const issues: QualityIssue[] = [];
  const sceneNumbers = new Map<string, number>();

  for (const scene of breakdown.scenes) {
    const key = normalizeSceneKey(scene.scene_number);
    if (key) {
      sceneNumbers.set(key, (sceneNumbers.get(key) ?? 0) + 1);
    }

    if (!scene.location?.trim()) {
      issues.push({
        type: "missing_location",
        message: `Scene ${scene.scene_number} has no location`,
        scene_number: scene.scene_number,
        severity: "medium",
      });
    }

    const dayNight = scene.day_night?.toUpperCase() ?? "";
    if (!dayNight || dayNight === "UNKNOWN") {
      issues.push({
        type: "missing_day_night",
        message: `Scene ${scene.scene_number} has no day/night`,
        scene_number: scene.scene_number,
        severity: "medium",
      });
    }

    if ((scene.confidence_score ?? 1) < LOW_CONFIDENCE) {
      issues.push({
        type: "low_confidence_scene",
        message: `Scene ${scene.scene_number} has low confidence`,
        scene_number: scene.scene_number,
        severity: "high",
      });
    }
  }

  for (const [key, count] of sceneNumbers) {
    if (count > 1) {
      issues.push({
        type: "duplicate_scene",
        message: `Duplicate scene number detected: ${key}`,
        scene_number: key,
        severity: "high",
      });
    }
  }

  for (const prop of breakdown.props) {
    if (prop.scenes.length === 0) {
      issues.push({
        type: "orphan_prop",
        message: `Prop "${prop.name}" is not linked to any scene`,
        severity: "low",
      });
    }
  }

  for (const costume of breakdown.costumes) {
    if (costume.scenes.length === 0) {
      issues.push({
        type: "orphan_costume",
        message: `Costume for "${costume.character}" is not linked to any scene`,
        severity: "low",
      });
    }
  }

  const locationEntries = buildLocationReviewEntries(breakdown);
  for (const entry of locationEntries) {
    for (const message of buildEntryQualityWarnings(
      entry,
      locationEntries,
      breakdown
    )) {
      issues.push({
        type: "location_quality",
        message,
        severity: message.includes("without linked scene") ? "high" : "medium",
      });
    }
  }
  for (const message of buildGlobalLocationQualityWarnings(
    locationEntries,
    breakdown
  )) {
    issues.push({
      type: "location_quality",
      message,
      severity: "medium",
    });
  }

  if (options?.incompleteChunks && options.incompleteChunks > 0) {
    issues.push({
      type: "incomplete_chunks",
      message: `${options.incompleteChunks} chunk(s) failed or are incomplete`,
      severity: "high",
    });
  }

  const numbered = breakdown.scenes
    .map((s) => parseInt(s.scene_number, 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);

  if (numbered.length >= 3) {
    for (let i = 1; i < numbered.length; i += 1) {
      const gap = numbered[i] - numbered[i - 1];
      if (gap > 2) {
        issues.push({
          type: "possible_missing_scenes",
          message: `Possible gap between scene ${numbered[i - 1]} and ${numbered[i]}`,
          severity: "medium",
        });
        break;
      }
    }
  }

  const highCount = issues.filter((i) => i.severity === "high").length;
  const quality_status: BreakdownQualityCheck["quality_status"] =
    highCount >= 3
      ? "critical"
      : issues.length > 0
        ? "needs_review"
        : "good";

  return { quality_status, issues };
}
