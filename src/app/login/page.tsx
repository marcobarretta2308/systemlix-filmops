"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/lib/context/PlatformContext";
import { DEMO_LOGIN_USERS } from "@/lib/mock-data";
import { Archive, Bot, Clapperboard, FolderKanban, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const FEATURES = [
  { icon: FolderKanban, label: "Workspace separati" },
  { icon: Shield, label: "Accessi controllati" },
  { icon: Bot, label: "3 strumenti AI" },
  { icon: Archive, label: "Progetti archiviabili" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState<string>(DEMO_LOGIN_USERS[1].email);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(email);
    if (!ok) {
      setError("Credenziali non valide.");
      return;
    }
    router.push("/select-company");
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[var(--bg-base)]">
      {/* Subtle mesh gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-[rgba(139,92,246,0.03)] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[350px] bg-[rgba(34,211,238,0.02)] rounded-full blur-[100px]" />
      </div>

      {/* Left — Brand */}
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

      {/* Right — Login */}
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
              <Select
                label="Account demo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                options={DEMO_LOGIN_USERS.map((u) => ({
                  value: u.email,
                  label: u.label,
                }))}
              />
              <Input label="Email" type="email" value={email} readOnly className="opacity-50" />
              <Input label="Password" type="password" defaultValue="••••••••" />
              {error && <p className="text-[13px] text-[var(--accent-red)]">{error}</p>}
              <Button type="submit" className="w-full" size="lg">
                Accedi
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-between text-[12px]">
              <Link href="#" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                Password dimenticata?
              </Link>
              <Link href="#" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                Richiedi accesso
              </Link>
            </div>

            <p className="mt-6 text-center text-[11px] text-[var(--text-muted)] leading-relaxed">
              Accesso riservato a team, reparti e produzioni autorizzate.
            </p>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
