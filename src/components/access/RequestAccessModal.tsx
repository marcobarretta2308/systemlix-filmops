"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Shield } from "lucide-react";

interface RequestAccessModalProps {
  open: boolean;
  onClose: () => void;
}

export function RequestAccessModal({ open, onClose }: RequestAccessModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Richiedi accesso">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <Shield className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
          L&apos;accesso a Systemlix FilmOps è riservato a produzioni e team
          autorizzati. Contatta Systemlix per richiedere l&apos;attivazione.
        </p>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={onClose} size="sm">
          Ho capito
        </Button>
      </div>
    </Modal>
  );
}
