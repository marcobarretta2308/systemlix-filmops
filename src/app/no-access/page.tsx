"use client";

import { Button } from "@/components/ui/Button";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { useAuth } from "@/lib/context/PlatformContext";
import { Clapperboard, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const IS_DEV = process.env.NODE_ENV === "development";

export default function NoAccessPage() {
  const { isAuthenticated, authReady, isPlatformOwner, accessDebug, logout } =
    useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (isPlatformOwner) {
      router.replace("/dashboard");
    }
  }, [authReady, isAuthenticated, isPlatformOwner, router]);

  if (!authReady || !isAuthenticated || isPlatformOwner) return null;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-8">
      <div className="relative w-full max-w-lg">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <Clapperboard className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          </div>
          <span className="text-[13px] font-medium text-[var(--text-primary)]">
            Systemlix FilmOps
          </span>
        </div>

        <PremiumCard padding="lg" variant="elevated">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.06)]">
              <ShieldAlert className="h-4 w-4 text-[var(--accent-amber)]" />
            </div>
            <div>
              <h1 className="text-[20px] font-medium text-[var(--text-primary)] tracking-tight">
                Nessuna produzione assegnata
              </h1>
              <p className="mt-2 text-[13px] text-[var(--text-muted)] leading-relaxed">
                Il tuo account non è ancora collegato a nessuna produzione.
                L&apos;accesso a Systemlix FilmOps è riservato a produzioni e
                team autorizzati — contatta Systemlix per richiedere
                l&apos;attivazione.
              </p>
            </div>
          </div>

          {IS_DEV && (
            <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 font-mono text-[11px] text-[var(--text-muted)] space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Debug (solo development)
              </p>
              <p>auth user id: {accessDebug.authUserId ?? "—"}</p>
              <p>email: {accessDebug.email ?? "—"}</p>
              <p>profile found: {accessDebug.profileFound ? "yes" : "no"}</p>
              <p>global_role: {accessDebug.global_role ?? "—"}</p>
              <p>auth_status: {accessDebug.auth_status ?? "—"}</p>
              <p>isPlatformOwner: {accessDebug.isPlatformOwner ? "yes" : "no"}</p>
              <p>companies count: {accessDebug.companiesCount}</p>
              <p>company_members count: {accessDebug.companyMembersCount}</p>
              {accessDebug.lastError && (
                <p className="text-[var(--accent-red)]">
                  error: {accessDebug.lastError}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/request-access">
              <Button size="sm">Richiedi accesso</Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              Esci
            </Button>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
