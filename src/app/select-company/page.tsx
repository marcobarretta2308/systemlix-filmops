"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { useAuth, useCompany } from "@/lib/context/PlatformContext";
import { Building2, Clapperboard, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SelectCompanyPage() {
  const { isAuthenticated, authReady } = useAuth();
  const {
    userCompanies,
    setActiveCompany,
    createCompany,
    canManagePlatform,
  } = useCompany();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("production_house");

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) router.replace("/login");
  }, [authReady, isAuthenticated, router]);

  const handleSelect = (companyId: string) => {
    setActiveCompany(companyId);
    router.push("/dashboard");
  };

  const handleCreate = async () => {
    if (!companyName.trim()) return;
    const company = await createCompany({
      name: companyName.trim(),
      type: companyType,
    });
    if (company) {
      setModalOpen(false);
      setCompanyName("");
      setActiveCompany(company.id);
      router.push("/dashboard");
    }
  };

  if (!authReady || !isAuthenticated) return null;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[300px] bg-[rgba(139,92,246,0.02)] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="mb-10 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <Clapperboard className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          </div>
          <span className="text-[13px] font-medium text-[var(--text-primary)]">FilmOps</span>
        </div>

        <h1 className="text-[24px] font-medium text-[var(--text-primary)] tracking-tight">
          Seleziona produzione
        </h1>
        <p className="mt-2 text-[14px] text-[var(--text-muted)] leading-relaxed max-w-md">
          Scegli l&apos;azienda di produzione con cui lavorare. I dati sono isolati per ogni tenant.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {userCompanies.map((company) => (
            <PremiumCard
              key={company.id}
              padding="md"
              hover
              className="cursor-pointer"
              onClick={() => handleSelect(company.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[var(--text-primary)] break-words">{company.name}</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5 capitalize">
                    {company.type.replace("_", " ")}
                  </p>
                  <span className="mt-2 inline-block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--accent-green)]">
                    Attiva
                  </span>
                </div>
              </div>
            </PremiumCard>
          ))}
        </div>

        {canManagePlatform && (
          <Button variant="outline" className="mt-6" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Crea nuova produzione
          </Button>
        )}

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova azienda di produzione">
          <div className="space-y-4">
            <Input label="Nome produzione" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Es. Produzione Gamma" />
            <Input label="Tipo" value={companyType} onChange={(e) => setCompanyType(e.target.value)} placeholder="production_house" />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={!companyName.trim()}>Crea produzione</Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
