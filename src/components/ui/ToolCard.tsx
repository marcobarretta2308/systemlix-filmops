import { PremiumCard } from "@/components/ui/PremiumCard";
import { cn } from "@/lib/utils/cn";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  meta?: string;
}

export function ToolCard({
  title,
  description,
  href,
  icon: Icon,
  meta,
}: ToolCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <PremiumCard
        padding="md"
        hover
        className={cn(
          "h-full flex flex-col",
          "group-hover:shadow-[0_0_0_1px_rgba(148,163,184,0.1)]"
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] transition-colors duration-[var(--transition)] group-hover:border-[var(--border-default)]">
            <Icon className="h-3.5 w-3.5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all duration-[var(--transition)] -translate-y-0.5 translate-x-0.5 group-hover:translate-y-0 group-hover:translate-x-0" />
        </div>
        <h3 className="text-[14px] font-medium text-[var(--text-primary)] tracking-tight">
          {title}
        </h3>
        <p className="mt-1.5 text-[13px] text-[var(--text-muted)] leading-relaxed flex-1">
          {description}
        </p>
        {meta && (
          <p className="mt-3 text-[11px] text-[var(--text-muted)] opacity-70">{meta}</p>
        )}
        <span className="mt-4 inline-flex items-center gap-1 text-[12px] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors duration-[var(--transition)]">
          Apri strumento
        </span>
      </PremiumCard>
    </Link>
  );
}
