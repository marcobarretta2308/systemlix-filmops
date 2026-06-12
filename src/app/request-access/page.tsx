"use client";

import { Button } from "@/components/ui/Button";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Clapperboard, Shield } from "lucide-react";
import Link from "next/link";

export default function RequestAccessPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[300px] bg-[rgba(139,92,246,0.02)] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <Clapperboard className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          </div>
          <span className="text-[13px] font-medium text-[var(--text-primary)]">
            FilmOps
          </span>
        </div>

        <PremiumCard padding="lg" variant="elevated">
          <div className="flex gap-3 mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              <Shield className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <div>
              <h1 className="text-[20px] font-medium text-[var(--text-primary)] tracking-tight">
                Richiedi accesso
              </h1>
              <p className="mt-2 text-[13px] text-[var(--text-muted)] leading-relaxed">
                L&apos;accesso a FilmOps è riservato a produzioni e
                team autorizzati. Contatta il team FilmOps per richiedere
                l&apos;attivazione.
              </p>
            </div>
          </div>

          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-subtle)] pt-4">
            La piattaforma è <strong className="font-medium text-[var(--text-secondary)]">invite-only</strong>:
            gli account vengono creati esclusivamente dal team FilmOps.
            Non è possibile registrarsi autonomamente.
          </p>

          <div className="mt-6 flex gap-2">
            <Link href="/login">
              <Button variant="outline" size="sm">
                Torna al login
              </Button>
            </Link>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
