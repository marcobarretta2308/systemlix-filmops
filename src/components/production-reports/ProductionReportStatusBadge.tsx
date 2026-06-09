import { Badge } from "@/components/ui/Badge";
import type { ProductionReportStatus } from "@/lib/types";
import {
  PRODUCTION_REPORT_STATUS_LABELS,
  PRODUCTION_REPORT_STATUS_VARIANTS,
} from "@/lib/production-reports/constants";

export function ProductionReportStatusBadge({
  status,
}: {
  status: ProductionReportStatus | string;
}) {
  const key = status as ProductionReportStatus;
  const variant = PRODUCTION_REPORT_STATUS_VARIANTS[key] ?? "draft";
  return (
    <Badge variant={variant} size="md">
      {PRODUCTION_REPORT_STATUS_LABELS[key] ?? status}
    </Badge>
  );
}
