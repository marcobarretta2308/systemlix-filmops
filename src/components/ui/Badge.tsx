import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "active"
    | "paused"
    | "archived"
    | "locked"
    | "confirmed"
    | "pending"
    | "issue"
    | "draft"
    | "final"
    | "cyan"
    | "violet";
  size?: "sm" | "md";
}

const variants = {
  default: "bg-white/[0.04] text-[var(--text-muted)] border-[var(--border-subtle)]",
  active: "bg-[rgba(52,211,153,0.08)] text-[var(--accent-green)] border-[rgba(52,211,153,0.15)]",
  paused: "bg-[rgba(245,158,11,0.08)] text-[var(--accent-amber)] border-[rgba(245,158,11,0.15)]",
  archived: "bg-white/[0.03] text-[var(--text-muted)] border-[var(--border-subtle)]",
  locked: "bg-[rgba(248,113,113,0.08)] text-[var(--accent-red)] border-[rgba(248,113,113,0.15)]",
  confirmed: "bg-[rgba(52,211,153,0.08)] text-[var(--accent-green)] border-[rgba(52,211,153,0.15)]",
  pending: "bg-[rgba(245,158,11,0.08)] text-[var(--accent-amber)] border-[rgba(245,158,11,0.15)]",
  issue: "bg-[rgba(248,113,113,0.08)] text-[var(--accent-red)] border-[rgba(248,113,113,0.15)]",
  draft: "bg-white/[0.03] text-[var(--text-muted)] border-[var(--border-subtle)]",
  final: "bg-[rgba(34,211,238,0.06)] text-[var(--accent-cyan)] border-[rgba(34,211,238,0.12)]",
  cyan: "bg-[rgba(34,211,238,0.06)] text-[var(--accent-cyan)] border-[rgba(34,211,238,0.12)]",
  violet: "bg-[rgba(139,92,246,0.08)] text-[#a78bfa] border-[rgba(139,92,246,0.15)]",
};

export function Badge({
  className,
  variant = "default",
  size = "sm",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
