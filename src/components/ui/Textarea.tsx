import { cn } from "@/lib/utils/cn";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ className, label, id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          "w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)]",
          "bg-[var(--bg-elevated)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
          "leading-relaxed transition-all duration-[var(--transition)] resize-y min-h-[100px]",
          "hover:border-[var(--border-default)]",
          "focus:border-[rgba(34,211,238,0.35)] focus:outline-none focus:ring-2 focus:ring-[rgba(34,211,238,0.08)]",
          className
        )}
        {...props}
      />
    </div>
  );
}
