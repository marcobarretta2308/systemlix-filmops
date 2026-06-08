"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useProject } from "@/lib/context/PlatformContext";
import { departmentToAssistantRole } from "@/lib/permissions/project-permissions";
import { generateAssistantResponse, SUGGESTED_QUESTIONS } from "@/lib/utils/assistant";
import type { SetAssistantRole } from "@/lib/types";
import { Bot, Calendar, FileText, Loader2, MapPin, Send, User, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const ROLE_OPTIONS: { value: SetAssistantRole; label: string }[] = [
  { value: "producer", label: "Producer" },
  { value: "assistant_director", label: "Assistant Director" },
  { value: "actor", label: "Actor" },
  { value: "crew", label: "Crew" },
  { value: "driver", label: "Driver" },
  { value: "extra", label: "Extra" },
];

export default function SetAssistantPage() {
  const { project, projectId, isProjectReady } = useSyncProjectFromUrl();
  const {
    scenes,
    shootingDays,
    activeCallSheet,
    locations,
    castCrew,
    assistantRole,
    setAssistantRole,
    activeProjectMembership,
    isDepartmentDashboard,
  } = useProject();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedShootingDayId, setSelectedShootingDayId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error" | "warning" | "info">("info");
  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDepartmentDashboard || !activeProjectMembership?.department) return;
    const deptRole = departmentToAssistantRole(activeProjectMembership.department);
    if (deptRole) setAssistantRole(deptRole as SetAssistantRole);
  }, [isDepartmentDashboard, activeProjectMembership?.department, setAssistantRole]);

  const nextId = (p: string) => {
    idRef.current += 1;
    return `${p}-${idRef.current}`;
  };

  const effectiveShootingDayId = selectedShootingDayId || shootingDays[0]?.id || "";

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !project || !projectId || isLoading) return;

    const userMessage = text.trim();
    const userId = nextId("u");
    setMessages((prev) => [...prev, { id: userId, role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    try {
      const response = await fetch("/api/ai/set-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: userMessage,
          roleContext: assistantRole,
          ...(effectiveShootingDayId
            ? { selectedShootingDayId: effectiveShootingDayId }
            : {}),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        response?: string;
        error?: string;
        fallback?: boolean;
        devNote?: string;
      };

      if (!response.ok) {
        const fallbackResponse = generateAssistantResponse(userMessage, {
          project,
          scenes,
          shootingDay:
            shootingDays.find((day) => day.id === effectiveShootingDayId) ??
            shootingDays[0] ??
            null,
          callSheet: activeCallSheet,
          locations,
          castCrew,
          role: assistantRole,
        });

        setMessages((prev) => [
          ...prev,
          { id: nextId("a"), role: "assistant", content: fallbackResponse },
        ]);
        setToastVariant("error");
        setToast(data.error ?? "Errore Set Assistant, risposta locale usata.");
        scrollToBottom();
        return;
      }

      const assistantContent = data.response?.trim() || "Risposta non disponibile.";
      setMessages((prev) => [
        ...prev,
        { id: nextId("a"), role: "assistant", content: assistantContent },
      ]);

      if (data.fallback && data.devNote) {
        setToastVariant("warning");
        setToast(data.devNote);
      }

      scrollToBottom();
    } catch {
      const fallbackResponse = generateAssistantResponse(userMessage, {
        project,
        scenes,
        shootingDay:
          shootingDays.find((day) => day.id === effectiveShootingDayId) ??
          shootingDays[0] ??
          null,
        callSheet: activeCallSheet,
        locations,
        castCrew,
        role: assistantRole,
      });

      setMessages((prev) => [
        ...prev,
        { id: nextId("a"), role: "assistant", content: fallbackResponse },
      ]);
      setToastVariant("error");
      setToast("Errore di rete, risposta locale usata.");
      scrollToBottom();
    } finally {
      setIsLoading(false);
    }
  };

  const contextItems = [
    { icon: FileText, label: "Scene", value: scenes.length },
    { icon: Users, label: "Cast & Crew", value: castCrew.length },
    { icon: MapPin, label: "Location", value: locations.length },
    { icon: Calendar, label: "Giornate", value: shootingDays.length },
  ];

  if (!isProjectReady) {
    return (
      <EmptyState
        icon={Bot}
        title="Nessun progetto attivo"
        description="Seleziona un progetto per usare Set Assistant."
      />
    );
  }

  return (
    <div className="flex flex-col min-h-[560px] max-h-[calc(100vh-120px)]">
      <PageHeader
        title="Set Assistant"
        description="Assistente operativo interno per il progetto attivo"
      />

      <div className="flex flex-1 gap-5 min-h-0">
        <div className="hidden lg:flex w-[240px] shrink-0 flex-col gap-4">
          <PremiumCard padding="md" className="space-y-4">
            {isDepartmentDashboard ? (
              <div>
                <p className="mb-1 block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Ruolo reparto
                </p>
                <p className="text-[13px] text-[var(--text-secondary)] capitalize">
                  {activeProjectMembership?.department ?? assistantRole}
                </p>
              </div>
            ) : (
              <Select
                label="Ruolo"
                value={assistantRole}
                onChange={(e) => setAssistantRole(e.target.value as SetAssistantRole)}
                options={ROLE_OPTIONS}
              />
            )}
            {shootingDays.length > 0 ? (
              <Select
                label="Giornata di riferimento"
                value={effectiveShootingDayId}
                onChange={(e) => setSelectedShootingDayId(e.target.value)}
                options={shootingDays.map((day) => ({
                  value: day.id,
                  label: `${day.day_number} — ${new Date(day.date).toLocaleDateString("it-IT")}`,
                }))}
              />
            ) : (
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Nessuna giornata di ripresa disponibile. L&apos;assistente userà i
                dati generali del progetto.
              </p>
            )}
          </PremiumCard>

          <PremiumCard padding="md" className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mb-3">
              Contesto progetto
            </p>
            {project && (
              <p
                className="text-[13px] text-[var(--text-primary)] font-medium mb-4 truncate"
                title={project.title}
              >
                {project.title}
              </p>
            )}
            <ul className="space-y-2.5">
              {contextItems.map((item) => (
                <li key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-3 w-3 text-[var(--text-muted)]" />
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[12px] text-[var(--text-secondary)] tabular-nums">
                    {item.value}
                  </span>
                </li>
              ))}
            </ul>
          </PremiumCard>
        </div>

        <PremiumCard padding="none" className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {messages.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="Chiedi informazioni operative sul progetto attivo."
                description="Orari, location, cast, scene e note di produzione — risposte basate sui dati del progetto."
              />
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      msg.role === "assistant"
                        ? "border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                        : "border-[var(--border-default)] bg-[var(--bg-surface-2)]"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="h-3 w-3 text-[var(--text-muted)]" />
                    ) : (
                      <User className="h-3 w-3 text-[var(--text-secondary)]" />
                    )}
                  </div>
                  <div
                    className={`max-w-[72%] rounded-[var(--radius-md)] px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "assistant"
                        ? "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                        : "bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <Loader2 className="h-3 w-3 animate-spin text-[var(--text-muted)]" />
                </div>
                <div className="rounded-[var(--radius-md)] px-4 py-2.5 text-[13px] text-[var(--text-muted)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  Il Set Assistant sta controllando i dati del progetto...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="border-t border-[var(--border-subtle)] px-6 py-4 bg-[var(--bg-elevated)]/50">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  disabled={isLoading}
                  className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-[11px] text-[var(--text-muted)] transition-all duration-[var(--transition)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)] hover:bg-white/[0.02] disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrivi la tua domanda..."
                disabled={isLoading}
                className="flex-1 h-8 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all duration-[var(--transition)] focus:border-[rgba(34,211,238,0.3)] focus:outline-none focus:ring-1 focus:ring-[rgba(34,211,238,0.08)] disabled:opacity-50"
              />
              <Button type="submit" disabled={!input.trim() || isLoading} size="sm">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </PremiumCard>
      </div>

      <Toast
        message={toast ?? ""}
        open={!!toast}
        onClose={() => setToast(null)}
        variant={toastVariant}
      />
    </div>
  );
}
