import { cn } from "@/lib/utils/cn";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 flex-wrap text-[12px]", className)}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <ChevronRight className="h-3 w-3 text-[var(--text-muted)] opacity-50 shrink-0" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-[var(--transition)]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--text-secondary)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
