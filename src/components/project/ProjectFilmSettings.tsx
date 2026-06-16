"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { useProject } from "@/lib/context/PlatformContext";
import type { ProjectFilmFormState } from "@/lib/projects/types";
import type { Project } from "@/lib/types";
import { Clapperboard, Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PRODUCTION_TYPES = [
  { value: "Film", label: "Film" },
  { value: "Serie TV", label: "Serie TV" },
  { value: "Spot", label: "Spot" },
  { value: "Documentario", label: "Documentario" },
  { value: "Videoclip", label: "Videoclip" },
  { value: "Altro", label: "Altro" },
];

function projectToForm(project: Project): ProjectFilmFormState {
  return {
    title: project.title ?? "",
    production_title: project.production_title ?? "",
    production_type: project.production_type ?? "Film",
    director_name: project.director_name ?? "",
    producer_name: project.producer_name ?? "",
    production_company: project.production_company ?? "",
    description: project.description ?? "",
    project_notes: project.project_notes ?? "",
    start_date: project.start_date ?? "",
    end_date: project.end_date ?? "",
  };
}

interface ProjectFilmSettingsProps {
  project: Project;
}

export function ProjectFilmSettings({ project }: ProjectFilmSettingsProps) {
  const { updateProjectDetails, canEditProject } = useProject();
  const [form, setForm] = useState<ProjectFilmFormState>(() =>
    projectToForm(project)
  );
  const [hydratedProjectId, setHydratedProjectId] = useState<string | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!project?.id || hydratedProjectId === project.id) return;
    setForm(projectToForm(project));
    setHydratedProjectId(project.id);

    if (process.env.NODE_ENV === "development") {
      console.log("[FilmOps] Project form hydrated:", project.id, project);
    }
  }, [project, hydratedProjectId]);

  const updateField = <K extends keyof ProjectFilmFormState>(
    key: K,
    value: ProjectFilmFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setToast({ message: "Project name is required.", variant: "error" });
      return;
    }

    setSaving(true);
    const { project: saved, error } = await updateProjectDetails({
      title: form.title.trim(),
      production_title: form.production_title.trim() || null,
      production_type: form.production_type || null,
      director_name: form.director_name.trim() || null,
      producer_name: form.producer_name.trim() || null,
      production_company: form.production_company.trim() || null,
      description: form.description.trim() || null,
      project_notes: form.project_notes.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    });
    setSaving(false);

    if (error || !saved) {
      setToast({
        message: error ?? "Failed to save project.",
        variant: "error",
      });
      return;
    }

    setToast({ message: "Project saved", variant: "success" });
  };

  const readOnly = useMemo(() => !canEditProject, [canEditProject]);

  return (
    <PremiumCard padding="lg">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Clapperboard className="h-4 w-4 text-[var(--text-muted)]" />
          <div>
            <h3 className="text-[15px] font-medium text-[var(--text-primary)]">
              Project / Film configuration
            </h3>
            <p className="text-[12px] text-[var(--text-muted)]">
              Production metadata saved to the project record.
            </p>
          </div>
        </div>
        {canEditProject && (
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Project name"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Internal project name"
          disabled={readOnly}
          required
        />
        <Input
          label="Production / film title"
          value={form.production_title}
          onChange={(e) => updateField("production_title", e.target.value)}
          placeholder="Title on call sheets and reports"
          disabled={readOnly}
        />
        <Select
          label="Production type"
          value={form.production_type}
          onChange={(e) => updateField("production_type", e.target.value)}
          options={PRODUCTION_TYPES}
          disabled={readOnly}
        />
        <Input
          label="Production company"
          value={form.production_company}
          onChange={(e) => updateField("production_company", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Director"
          value={form.director_name}
          onChange={(e) => updateField("director_name", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Producer"
          value={form.producer_name}
          onChange={(e) => updateField("producer_name", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Shooting start"
          type="date"
          value={form.start_date}
          onChange={(e) => updateField("start_date", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Shooting end"
          type="date"
          value={form.end_date}
          onChange={(e) => updateField("end_date", e.target.value)}
          disabled={readOnly}
        />
      </div>

      <div className="mt-4 space-y-4">
        <Textarea
          label="Short description"
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          disabled={readOnly}
        />
        <Textarea
          label="Project notes"
          value={form.project_notes}
          onChange={(e) => updateField("project_notes", e.target.value)}
          placeholder="Operational notes for the production team"
          disabled={readOnly}
        />
      </div>

      <Toast
        message={toast?.message ?? ""}
        open={!!toast}
        variant={toast?.variant ?? "success"}
        onClose={() => setToast(null)}
      />
    </PremiumCard>
  );
}
