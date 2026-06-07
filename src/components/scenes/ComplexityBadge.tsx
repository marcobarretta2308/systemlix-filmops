import { Badge } from "@/components/ui/Badge";
import type { Complexity } from "@/lib/types";

const LABELS: Record<Complexity, string> = {
  low: "Bassa",
  medium: "Media",
  high: "Alta",
  very_high: "Molto alta",
};

const VARIANTS: Record<Complexity, "confirmed" | "pending" | "issue" | "cyan"> = {
  low: "confirmed",
  medium: "pending",
  high: "issue",
  very_high: "cyan",
};

export function ComplexityBadge({ complexity }: { complexity: Complexity }) {
  return (
    <Badge variant={VARIANTS[complexity]}>{LABELS[complexity]}</Badge>
  );
}
