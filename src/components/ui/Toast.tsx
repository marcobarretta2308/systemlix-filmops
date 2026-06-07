"use client";

import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ToastProps {
  message: string;
  open: boolean;
  onClose: () => void;
  variant?: "info" | "success" | "warning";
  duration?: number;
}

export function Toast({
  message,
  open,
  onClose,
  variant = "info",
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, onClose, duration]);

  if (!open) return null;

  const variants = {
    info: "border-[var(--border-default)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)]",
    success: "border-[rgba(52,211,153,0.15)] bg-[var(--bg-surface-2)] text-[var(--accent-green)]",
    warning: "border-[rgba(245,158,11,0.15)] bg-[var(--bg-surface-2)] text-[var(--accent-amber)]",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <div
        className={cn(
          "flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3",
          "shadow-[var(--shadow-card)] backdrop-blur-md",
          variants[variant]
        )}
      >
        <p className="flex-1 text-[13px] leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="shrink-0 rounded p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
