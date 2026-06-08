"use client";

import { RequestAccessModal } from "@/components/access/RequestAccessModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { useAuth } from "@/lib/context/PlatformContext";
import { Archive, Bot, Clapperboard, FolderKanban, Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const FEATURES = [
  { icon: FolderKanban, label: "Workspace separati" },
  { icon: Shield, label: "Accessi controllati" },
  { icon: Bot, label: "3 strumenti AI" },
  { icon: Archive, label: "Progetti archiviabili" },
];

export default function LoginPage() {
  const { login, isLoading, authReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    router.replace("/dashboard");
  }, [authReady, isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = await login(email.trim(), password);
    if (result.error) {
      setError(result.error === "Invalid login credentials" ? "Credenziali non valide." : result.error);
      return;
    }
    if (result.needsAccessAssignment) {
      router.push("/no-access");
      return;
    }
    if (result.needsPlatformSetup) {
      router.push("/platform-setup");
      return;
    }
    if (result.initialProjectId && result.initialProjectDepartment) {
      router.push(`/projects/${result.initialProjectId}/department`);
      return;
    }
    if (result.initialProjectId) {
      router.push(`/projects/${result.initialProjectId}`);
      return;
    }
    router.push("/dashboard");
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[var(--bg-base)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-[rgba(139,92,246,0.03)] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[350px] bg-[rgba(34,211,238,0.02)] rounded-full blur-[100px]" />
      </div>

      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 xl:p-16 border-r border-[var(--border-subtle)] relative">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <Clapperboard className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          </div>
          <span className="text-[13px] font-medium text-[var(--text-primary)]">Systemlix FilmOps</span>
        </div>

        <div className="max-w-lg">
          <h1 className="text-[32px] font-medium text-[var(--text-primary)] tracking-tight leading-[1.15]">
            Il sistema operativo AI per produzioni cinematografiche.
          </h1>
          <p className="mt-5 text-[15px] text-[var(--text-muted)] leading-relaxed">
            Gestisci progetti, breakdown, call sheet e assistenza al set in
            un&apos;unica piattaforma sicura e separata per ogni produzione.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 px-3.5 py-2.5"
              >
                <f.icon className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                <span className="text-[12px] text-[var(--text-secondary)]">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] opacity-60">© 2026 Systemlix</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10 relative">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <Clapperboard className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            </div>
            <span className="text-[13px] font-medium text-[var(--text-primary)]">Systemlix FilmOps</span>
          </div>

          <PremiumCard padding="lg" variant="elevated">
            <h2 className="text-[18px] font-medium text-[var(--text-primary)] tracking-tight">
              Accedi alla tua produzione
            </h2>
            <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">
              Inserisci le credenziali per continuare.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@produzione.it"
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              {error && <p className="text-[13px] text-[var(--accent-red)]">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || !authReady}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Accesso…
                  </>
                ) : (
                  "Accedi"
                )}
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-between text-[12px]">
              <Link href="#" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                Password dimenticata?
              </Link>
              <button
                type="button"
                onClick={() => setRequestOpen(true)}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Richiedi accesso
              </button>
            </div>

            <p className="mt-6 text-center text-[11px] text-[var(--text-muted)] leading-relaxed">
              Accesso riservato a team, reparti e produzioni autorizzate.
              Piattaforma invite-only — nessuna registrazione pubblica.
            </p>
          </PremiumCard>
        </div>
      </div>

      <RequestAccessModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  );
}
