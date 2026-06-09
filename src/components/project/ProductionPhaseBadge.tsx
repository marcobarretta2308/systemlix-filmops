import { Badge } from "@/components/ui/Badge";
import type { ProductionPhase } from "@/lib/utils/production-phase";
import {
  PRODUCTION_PHASE_LABELS,
  PRODUCTION_PHASE_VARIANTS,
} from "@/lib/utils/production-phase";

export function ProductionPhaseBadge({ phase }: { phase: ProductionPhase }) {
  return (
    <Badge variant={PRODUCTION_PHASE_VARIANTS[phase]} size="md">
      {PRODUCTION_PHASE_LABELS[phase]}
    </Badge>
  );
}
