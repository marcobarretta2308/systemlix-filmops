"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth, useCompany } from "@/lib/context/PlatformContext";
import { Building2, FolderKanban, Layers } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const COMPANY_TYPES = [
  { value: "production_house", label: "Casa di produzione" },
  { value: "film", label: "Film" },
  { value: "tv_series", label: "Serie TV" },
  { value: "documentary", label: "Documentario" },
  { value: "advertising", label: "Pubblicità / Spot" },
  { value: "other", label: "Altro" },
];

const PRODUCTION_TYPES = [
  { value: "Film", label: "Film" },
  { value: "Serie TV", label: "Serie TV" },
  { value: "Spot", label: "Spot" },
  { value: "Documentario", label: "Documentario" },
  { value: "Videoclip", label: "Videoclip" },
  { value: "Altro", label: "Altro" },
];

export default function PlatformSetupPage() {
  const { isPlatformOwner } = useAuth();
  const {
    activeCompany,
    companyWorkspaces,
    userCompanies,
    needsPlatformSetup,
    runPlatformSetup,
    isLoading,
  } = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusStep = searchParams.get("step");

  const needsCompany = userCompanies.length === 0;
  const needsWorkspace = !needsCompany && companyWorkspaces.length === 0;

  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("production_house");
  const [companyStatus, setCompanyStatus] = useState("active");
  const [workspaceName, setWorkspaceName] = useState("Workspace principale");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [productionType, setProductionType] = useState("Film");
  const [projectDescription, setProjectDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPlatformOwner) router.replace("/dashboard");
  }, [isPlatformOwner, router]);

  useEffect(() => {
    if (!isLoading && !needsPlatformSetup) {
      router.replace("/dashboard");
    }
  }, [isLoading, needsPlatformSetup, router]);

  const sectionHighlight = useMemo(
    () => ({
      company: !focusStep || focusStep === "company",
      workspace: !focusStep || focusStep === "workspace",
      project: !focusStep || focusStep === "project",
    }),
    [focusStep]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (needsCompany && !companyName.trim()) {
      setError("Inserisci il nome della produzione.");
      return;
    }
    if (!needsCompany && needsWorkspace && !workspaceName.trim()) {
      setError("Inserisci il nome del workspace.");
      return;
    }
    if (!projectTitle.trim()) {
      setError("Inserisci il nome del progetto.");
      return;
    }

    setSubmitting(true);
    const result = await runPlatformSetup({
      ...(needsCompany
        ? {
            company: {
              name: companyName.trim(),
              type: companyType,
              status: companyStatus as "active" | "suspended" | "archived",
            },
          }
        : { companyId: activeCompany?.id ?? userCompanies[0]?.id }),
      ...(needsWorkspace
        ? {
            workspace: {
              name: workspaceName.trim(),
              description: workspaceDescription.trim() || undefined,
            },
          }
        : { workspaceId: companyWorkspaces[0]?.id }),
      project: {
        title: projectTitle.trim(),
        production_type: productionType,
        description: projectDescription.trim() || undefined,
        status: "active",
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      },
    });
    setSubmitting(false);

    if (result.error || !result.project) {
      setError(result.error ?? "Impossibile completare la configurazione.");
      return;
    }

    router.push(`/projects/${result.project.id}`);
  };

  if (!isPlatformOwner || isLoading) return null;

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Platform Setup"
        description="Configura la prima produzione"
      />

      <PremiumCard padding="lg" variant="ghost" className="border-[var(--border-subtle)]">
        <h2 className="text-[20px] font-medium text-[var(--text-primary)] tracking-tight">
          Configura la prima produzione
        </h2>
        <p className="mt-2 text-[14px] text-[var(--text-muted)] leading-relaxed">
          Crea una produzione, un workspace e un progetto per iniziare a usare Systemlix FilmOps.
        </p>
      </PremiumCard>

      <form onSubmit={handleSubmit} className="space-y-6">
        {(needsCompany || sectionHighlight.company) && (
          <PremiumCard
            padding="lg"
            className={
              sectionHighlight.company && focusStep === "company"
                ? "border-[rgba(34,211,238,0.2)]"
                : undefined
            }
          >
            <div className="mb-5 flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-[var(--text-muted)]" />
              <h3 className="text-[15px] font-medium text-[var(--text-primary)]">
                1. Produzione / Company
              </h3>
            </div>
            {needsCompany ? (
              <div className="space-y-4">
                <Input
                  label="Nome produzione"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Es. Systemlix Pictures"
                  required
                />
                <Select
                  label="Tipo produzione"
                  value={companyType}
                  onChange={(e) => setCompanyType(e.target.value)}
                  options={COMPANY_TYPES}
                />
                <Select
                  label="Stato"
                  value={companyStatus}
                  onChange={(e) => setCompanyStatus(e.target.value)}
                  options={[
                    { value: "active", label: "Attiva" },
                    { value: "suspended", label: "Sospesa" },
                    { value: "archived", label: "Archiviata" },
                  ]}
                />
              </div>
            ) : (
              <p className="text-[13px] text-[var(--text-secondary)]">
                Produzione esistente:{" "}
                <span className="text-[var(--text-primary)]">
                  {activeCompany?.name ?? userCompanies[0]?.name}
                </span>
              </p>
            )}
          </PremiumCard>
        )}

        {(needsWorkspace || needsCompany || sectionHighlight.workspace) && (
          <PremiumCard
            padding="lg"
            className={
              sectionHighlight.workspace && focusStep === "workspace"
                ? "border-[rgba(34,211,238,0.2)]"
                : undefined
            }
          >
            <div className="mb-5 flex items-center gap-2.5">
              <Layers className="h-4 w-4 text-[var(--text-muted)]" />
              <h3 className="text-[15px] font-medium text-[var(--text-primary)]">
                2. Workspace
              </h3>
            </div>
            {needsWorkspace || needsCompany ? (
              <div className="space-y-4">
                <Input
                  label="Nome workspace"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Es. Workspace principale"
                  required
                />
                <Textarea
                  label="Descrizione"
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  placeholder="Ambiente operativo per la produzione"
                />
                {!needsCompany && activeCompany && (
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Collegato a: {activeCompany.name}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--text-secondary)]">
                Workspace esistente:{" "}
                <span className="text-[var(--text-primary)]">
                  {companyWorkspaces[0]?.name}
                </span>
              </p>
            )}
          </PremiumCard>
        )}

        <PremiumCard
          padding="lg"
          className={
            sectionHighlight.project && focusStep === "project"
              ? "border-[rgba(34,211,238,0.2)]"
              : undefined
          }
        >
          <div className="mb-5 flex items-center gap-2.5">
            <FolderKanban className="h-4 w-4 text-[var(--text-muted)]" />
            <h3 className="text-[15px] font-medium text-[var(--text-primary)]">
              3. Progetto
            </h3>
          </div>
          <div className="space-y-4">
            <Input
              label="Nome progetto"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="Es. Lungometraggio Alpha"
              required
            />
            <Select
              label="Tipo produzione"
              value={productionType}
              onChange={(e) => setProductionType(e.target.value)}
              options={PRODUCTION_TYPES}
            />
            <Textarea
              label="Descrizione"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Data inizio"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="Data fine prevista"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Select
              label="Stato"
              value="active"
              onChange={() => {}}
              options={[{ value: "active", label: "Attivo" }]}
            />
          </div>
        </PremiumCard>

        {error && (
          <p className="text-[13px] text-red-400/90" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Configurazione…" : "Completa configurazione"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
            Torna alla dashboard
          </Button>
        </div>
      </form>
    </div>
  );
}
