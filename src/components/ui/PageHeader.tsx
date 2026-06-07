import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  badge?: ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  badge,
}: PageHeaderProps) {
  return (
    <header className="mb-7">
      {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-medium text-[var(--text-primary)] tracking-tight leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1.5 text-[13px] text-[var(--text-muted)] leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
