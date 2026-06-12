"use client";

import { PremiumCard } from "@/components/ui/PremiumCard";
import { ShieldX } from "lucide-react";
import Link from "next/link";

interface AccessDeniedProps {
  title?: string;
  message: string;
  showContact?: boolean;
}

export function AccessDenied({
  title = "Accesso non autorizzato",
  message,
  showContact = true,
}: AccessDeniedProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <PremiumCard padding="lg" variant="elevated" className="max-w-md w-full text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[rgba(248,113,113,0.15)] bg-[rgba(248,113,113,0.06)]">
          <ShieldX className="h-5 w-5 text-[var(--accent-red)] opacity-80" />
        </div>
        <h2 className="text-[18px] font-medium text-[var(--text-primary)] tracking-tight">
          {title}
        </h2>
        <p className="mt-3 text-[13px] text-[var(--text-muted)] leading-relaxed">
          {message}
        </p>
        {showContact && (
          <p className="mt-4 text-[12px] text-[var(--text-muted)]">
            Contatta{" "}
            <Link href="/request-access" className="text-[var(--text-secondary)] hover:underline">
              FilmOps
            </Link>{" "}
            per assistenza.
          </p>
        )}
      </PremiumCard>
    </div>
  );
}
