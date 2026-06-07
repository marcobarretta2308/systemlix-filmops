import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

interface PremiumCardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  variant?: "default" | "elevated" | "ghost";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

const variantMap = {
  default: "bg-[var(--bg-surface)] border-[var(--border-subtle)]",
  elevated: "bg-[var(--bg-surface-2)] border-[var(--border-default)] shadow-[var(--shadow-card)]",
  ghost: "bg-transparent border-[var(--border-subtle)]",
};

export function PremiumCard({
  className,
  padding = "md",
  hover = false,
  variant = "default",
  children,
  ...props
}: PremiumCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border transition-all duration-150",
        variantMap[variant],
        hover &&
          "cursor-pointer hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)]",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex flex-col gap-1", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[14px] font-medium text-[var(--text-primary)] tracking-tight leading-snug",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-[13px] text-[var(--text-muted)] leading-relaxed",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}
