"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useCompany, useProject } from "@/lib/context/PlatformContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewProjectPage() {
  const { companyWorkspaces, activeWorkspace, canCreateProject } = useCompany();
  const { createProject } = useProject();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [productionType, setProductionType] = useState("Film");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [workspaceId, setWorkspaceId] = useState(
    activeWorkspace?.id ?? companyWorkspaces[0]?.id ?? ""
  );

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !workspaceId) return;
    setSubmitting(true);
    const project = await createProject({
      title: title.trim(),
      production_type: productionType,
      description: description.trim(),
      status: "active",
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      workspace_id: workspaceId,
    });
    setSubmitting(false);
    if (project) router.push(`/projects/${project.id}`);
  };

  if (!canCreateProject) {
    return <p className="text-[13px] text-slate-500">Non hai i permessi per creare progetti.</p>;
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Crea nuovo progetto"
        description="Il progetto avrà database separati per scene, crew, location e call sheet."
      />
      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome progetto"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Es. Lungometraggio Alpha"
            required
          />
          <Select
            label="Tipo produzione"
            value={productionType}
            onChange={(e) => setProductionType(e.target.value)}
            options={[
              { value: "Film", label: "Film" },
              { value: "Serie TV", label: "Serie TV" },
              { value: "Spot", label: "Spot" },
              { value: "Documentario", label: "Documentario" },
              { value: "Videoclip", label: "Videoclip" },
              { value: "Altro", label: "Altro" },
            ]}
          />
          <Textarea
            label="Descrizione"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Select
            label="Workspace"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            options={companyWorkspaces.map((w) => ({ value: w.id, label: w.name }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Data inizio" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="Data fine prevista" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting || !title.trim() || !workspaceId}>
              {submitting ? "Creazione…" : "Crea progetto"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Annulla
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
