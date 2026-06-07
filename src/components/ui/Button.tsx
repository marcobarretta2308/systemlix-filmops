import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "subtle";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-[var(--accent-cyan)] text-[#041016] hover:brightness-110 border border-[rgba(34,211,238,0.4)]",
  secondary:
    "bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] border border-transparent",
  subtle:
    "bg-white/[0.03] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] border border-[var(--border-subtle)]",
  danger:
    "bg-[rgba(248,113,113,0.08)] text-[var(--accent-red)] hover:bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.15)]",
  outline:
    "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-white/[0.02]",
};

const sizes = {
  sm: "h-8 px-3 text-[12px] gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-[var(--radius-sm)]",
  lg: "h-10 px-4 text-[13px] gap-2 rounded-[var(--radius-md)]",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "transition-all duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]",
        "disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
