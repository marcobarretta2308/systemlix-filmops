import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ className, label, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "h-9 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)]",
          "bg-[var(--bg-elevated)] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
          "transition-all duration-[var(--transition)]",
          "hover:border-[var(--border-default)]",
          "focus:border-[rgba(34,211,238,0.35)] focus:outline-none focus:ring-2 focus:ring-[rgba(34,211,238,0.08)]",
          className
        )}
        {...props}
      />
    </div>
  );
}
