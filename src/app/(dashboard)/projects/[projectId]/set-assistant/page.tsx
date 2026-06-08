"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useProject } from "@/lib/context/PlatformContext";
import { generateAssistantResponse, SUGGESTED_QUESTIONS } from "@/lib/utils/assistant";
import type { SetAssistantRole } from "@/lib/types";
import { Bot, Calendar, FileText, MapPin, Send, User, Users } from "lucide-react";
import { useRef, useState } from "react";

interface Message { id: string; role: "user" | "assistant"; content: string; }

const ROLE_OPTIONS: { value: SetAssistantRole; label: string }[] = [
  { value: "producer", label: "Producer" },
  { value: "assistant_director", label: "Assistant Director" },
  { value: "actor", label: "Actor" },
  { value: "crew", label: "Crew" },
  { value: "driver", label: "Driver" },
  { value: "extra", label: "Extra" },
];

export default function SetAssistantPage() {
  const { project, isProjectReady } = useSyncProjectFromUrl();
  const {
    scenes, shootingDays, activeCallSheet, locations, castCrew,
    assistantRole, setAssistantRole,
  } = useProject();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const nextId = (p: string) => { idRef.current += 1; return `${p}-${idRef.current}`; };

  const sendMessage = (text: string) => {
    if (!text.trim() || !project) return;
    const response = generateAssistantResponse(text, {
      project, scenes,
      shootingDay: shootingDays[0] ?? null,
      callSheet: activeCallSheet,
      locations, castCrew, role: assistantRole,
    });
    setMessages((prev) => [
      ...prev,
      { id: nextId("u"), role: "user", content: text.trim() },
      { id: nextId("a"), role: "assistant", content: response },
    ]);
    setInput("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
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
        {/* Left — Context panel */}
        <div className="hidden lg:flex w-[240px] shrink-0 flex-col gap-4">
          <PremiumCard padding="md">
            <Select
              label="Ruolo"
              value={assistantRole}
              onChange={(e) => setAssistantRole(e.target.value as SetAssistantRole)}
              options={ROLE_OPTIONS}
            />
          </PremiumCard>

          <PremiumCard padding="md" className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mb-3">
              Contesto progetto
            </p>
            {project && (
              <p className="text-[13px] text-[var(--text-primary)] font-medium mb-4 truncate" title={project.title}>
                {project.title}
              </p>
            )}
            <ul className="space-y-2.5">
              {contextItems.map((item) => (
                <li key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-3 w-3 text-[var(--text-muted)]" />
                    <span className="text-[12px] text-[var(--text-muted)]">{item.label}</span>
                  </div>
                  <span className="text-[12px] text-[var(--text-secondary)] tabular-nums">{item.value}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>
        </div>

        {/* Right — Chat */}
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
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-[var(--border-subtle)] px-6 py-4 bg-[var(--bg-elevated)]/50">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-[11px] text-[var(--text-muted)] transition-all duration-[var(--transition)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)] hover:bg-white/[0.02]"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrivi la tua domanda..."
                className="flex-1 h-8 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all duration-[var(--transition)] focus:border-[rgba(34,211,238,0.3)] focus:outline-none focus:ring-1 focus:ring-[rgba(34,211,238,0.08)]"
              />
              <Button type="submit" disabled={!input.trim()} size="sm">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
