import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/40 px-8 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <Icon className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
      )}
      <h3 className="text-[14px] font-medium text-[var(--text-secondary)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-[13px] text-[var(--text-muted)] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
