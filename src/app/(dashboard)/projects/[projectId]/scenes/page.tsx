"use client";

import { ComplexityBadge } from "@/components/scenes/ComplexityBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "@/components/ui/Table";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useProject } from "@/lib/context/PlatformContext";
import { FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ScenesPage() {
  const { projectId } = useSyncProjectFromUrl();
  const { scenes, deleteScene, canEditProject } = useProject();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sceneToDelete = scenes.find((s) => s.id === deleteId);

  const confirmDelete = () => {
    if (deleteId) {
      deleteScene(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Scene"
        description={`${scenes.length} scene nel progetto attivo`}
      />

      {scenes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nessun dato presente"
          description="Usa Script Breakdown AI per generare le scene dal copione."
          action={
            <Link href={`/projects/${projectId}/script-breakdown`}>
              <Button size="sm" variant="outline">Apri Script Breakdown</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHead>
              <TableRow>
                <TableTh>Scena</TableTh>
                <TableTh>INT/EXT</TableTh>
                <TableTh>DAY/NIGHT</TableTh>
                <TableTh>Location</TableTh>
                <TableTh>Descrizione</TableTh>
                <TableTh>Complessità</TableTh>
                <TableTh className="text-right">Azioni</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {scenes.map((scene) => (
                <TableRow key={scene.id}>
                  <TableTd className="font-mono text-cyan-400/90">{scene.scene_number}</TableTd>
                  <TableTd><Badge size="sm">{scene.int_ext}</Badge></TableTd>
                  <TableTd><Badge variant="violet" size="sm">{scene.day_night}</Badge></TableTd>
                  <TableTd className="max-w-[140px] truncate">{scene.location}</TableTd>
                  <TableTd className="max-w-[180px] text-slate-500 truncate">{scene.short_description}</TableTd>
                  <TableTd><ComplexityBadge complexity={scene.complexity} /></TableTd>
                  <TableTd className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/projects/${projectId}/scenes/${scene.id}`}
                        className="text-[13px] text-slate-500 hover:text-cyan-400/90 transition-colors"
                      >
                        Dettaglio
                      </Link>
                      {canEditProject && (
                        <button
                          onClick={() => setDeleteId(scene.id)}
                          className="rounded-[var(--radius-sm)] p-1 text-slate-600 hover:text-red-400/90 hover:bg-red-500/5 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Elimina scena">
        <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
          Eliminare la scena {sceneToDelete?.scene_number}? Azione irreversibile.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Annulla</Button>
          <Button variant="danger" onClick={confirmDelete}>Elimina</Button>
        </div>
      </Modal>
    </div>
  );
}
