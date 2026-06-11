import type { ProjectRole } from "@/lib/types";

export function canGenerateProductionPack(
  projectRole: ProjectRole | null | undefined
): boolean {
  return Boolean(projectRole);
}
