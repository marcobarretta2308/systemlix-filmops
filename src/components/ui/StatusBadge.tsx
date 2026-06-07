import { Badge } from "@/components/ui/Badge";
import type { ProjectStatus } from "@/lib/types";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_VARIANTS,
} from "@/lib/utils/project-status";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant={PROJECT_STATUS_VARIANTS[status]} size="md">
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
