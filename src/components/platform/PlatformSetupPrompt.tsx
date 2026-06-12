"use client";

import { Button } from "@/components/ui/Button";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Building2, FolderKanban, Layers, Plus } from "lucide-react";
import Link from "next/link";

interface PlatformSetupPromptProps {
  compact?: boolean;
}

export function PlatformSetupPrompt({ compact = false }: PlatformSetupPromptProps) {
  if (compact) {
    return (
      <PremiumCard padding="lg" variant="ghost" className="border-[var(--border-subtle)]">
        <h2 className="text-[18px] font-medium text-[var(--text-primary)] tracking-tight">
          Configura la prima produzione
        </h2>
        <p className="mt-2 text-[13px] text-[var(--text-muted)] max-w-xl leading-relaxed">
          Crea una produzione, un workspace e un progetto per iniziare a usare FilmOps.
        </p>
        <div className="mt-5">
          <Link href="/platform-setup">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Avvia Platform Setup
            </Button>
          </Link>
        </div>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard padding="lg" className="border-[rgba(34,211,238,0.12)]">
      <div className="max-w-2xl">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--accent-cyan)]">
          Platform Setup
        </p>
        <h2 className="mt-2 text-[22px] font-medium text-[var(--text-primary)] tracking-tight">
          Configura la prima produzione
        </h2>
        <p className="mt-2 text-[14px] text-[var(--text-muted)] leading-relaxed">
          Crea una produzione, un workspace e un progetto per iniziare a usare FilmOps.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link href="/platform-setup?step=company" className="block">
          <PremiumCard padding="md" hover className="h-full">
            <Building2 className="h-4 w-4 text-[var(--text-muted)]" />
            <p className="mt-3 text-[13px] font-medium text-[var(--text-primary)]">
              Crea nuova produzione
            </p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              Nome, tipo e stato della società di produzione.
            </p>
          </PremiumCard>
        </Link>
        <Link href="/platform-setup?step=workspace" className="block">
          <PremiumCard padding="md" hover className="h-full">
            <Layers className="h-4 w-4 text-[var(--text-muted)]" />
            <p className="mt-3 text-[13px] font-medium text-[var(--text-primary)]">
              Crea workspace
            </p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              Ambiente operativo collegato alla produzione.
            </p>
          </PremiumCard>
        </Link>
        <Link href="/platform-setup?step=project" className="block">
          <PremiumCard padding="md" hover className="h-full">
            <FolderKanban className="h-4 w-4 text-[var(--text-muted)]" />
            <p className="mt-3 text-[13px] font-medium text-[var(--text-primary)]">
              Crea progetto
            </p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              Il primo progetto con date e tipo produzione.
            </p>
          </PremiumCard>
        </Link>
      </div>

      <div className="mt-6">
        <Link href="/platform-setup">
          <Button>
            <Plus className="h-4 w-4" />
            Completa configurazione
          </Button>
        </Link>
      </div>
    </PremiumCard>
  );
}
