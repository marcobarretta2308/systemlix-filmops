import { PremiumCard } from "@/components/ui/PremiumCard";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  href?: string;
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, href, hint }: StatCardProps) {
  const content = (
    <PremiumCard
      padding="sm"
      hover={!!href}
      className={cn(href && "cursor-pointer group")}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shrink-0">
            <Icon className="h-3 w-3 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
            {label}
          </p>
          <p className="mt-0.5 text-xl font-medium text-[var(--text-primary)] tabular-nums tracking-tight leading-none">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-[11px] text-[var(--text-muted)] opacity-70 truncate">{hint}</p>
          )}
        </div>
      </div>
    </PremiumCard>
  );

  if (href) return <Link href={href} className="block">{content}</Link>;
  return content;
}
