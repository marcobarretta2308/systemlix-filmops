"use client";

import { SceneFormFields } from "@/components/scenes/SceneFormFields";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useProject } from "@/lib/context/PlatformContext";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function SceneDetailPage() {
  const { projectId } = useSyncProjectFromUrl();
  const params = useParams();
  const sceneId = params.sceneId as string;
  const { scenes, updateScene, canEditProject } = useProject();
  const scene = scenes.find((s) => s.id === sceneId);
  const [saved, setSaved] = useState(false);

  if (!scene) {
    return (
      <div className="text-center py-16">
        <p className="text-[13px] text-slate-500">Scena non trovata in questo progetto.</p>
        <Link href={`/projects/${projectId}/scenes`} className="mt-4 inline-block text-[13px] text-slate-500 hover:text-cyan-400/90 transition-colors">
          ← Torna alle scene
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Scena ${scene.scene_number}`}
        description={scene.short_description}
        actions={
          <div className="flex gap-2">
            <Link href={`/projects/${projectId}/scenes`}>
              <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" />Indietro</Button>
            </Link>
            {canEditProject && (
              <Button size="sm" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
                <Save className="h-4 w-4" />{saved ? "Salvato" : "Salva"}
              </Button>
            )}
          </div>
        }
      />
      <Card padding="md">
        <CardHeader>
          <CardTitle>Dettaglio scena</CardTitle>
        </CardHeader>
        <SceneFormFields scene={scene} onChange={(u) => canEditProject && updateScene(sceneId, u)} />
      </Card>
    </div>
  );
}
