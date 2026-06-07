import { cn } from "@/lib/utils/cn";
import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ className, label, id, options, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "h-9 w-full appearance-none rounded-[var(--radius-md)] border border-[var(--border-subtle)]",
          "bg-[var(--bg-elevated)] px-3 text-[13px] text-[var(--text-primary)]",
          "transition-all duration-[var(--transition)]",
          "hover:border-[var(--border-default)]",
          "focus:border-[rgba(34,211,238,0.35)] focus:outline-none focus:ring-2 focus:ring-[rgba(34,211,238,0.08)]",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
