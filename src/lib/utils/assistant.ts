import type {
  CallSheet,
  CastCrew,
  Location,
  Project,
  Scene,
  SetAssistantRole,
  ShootingDay,
} from "@/lib/types";

interface AssistantContext {
  project: Project;
  scenes: Scene[];
  shootingDay: ShootingDay | null;
  callSheet: CallSheet | null;
  locations: Location[];
  castCrew: CastCrew[];
  role: SetAssistantRole;
  memberName?: string;
}

function formatList(items: string[]): string {
  return items.length ? items.join(", ") : "N/A";
}

function unavailable(): string {
  return "Questa informazione non è disponibile nel foglio di lavoro corrente. Contattare la produzione.";
}

export function generateAssistantResponse(
  question: string,
  ctx: AssistantContext
): string {
  const q = question.toLowerCase().trim();

  if (
    q.includes("dove") &&
    (q.includes("domani") || q.includes("essere") || q.includes("set"))
  ) {
    if (!ctx.callSheet && !ctx.shootingDay) return unavailable();
    const location =
      ctx.callSheet?.location ??
      ctx.locations.find((l) => l.id === ctx.shootingDay?.location_id)?.name;
    const maps =
      ctx.callSheet?.maps_link ??
      ctx.locations.find((l) => l.id === ctx.shootingDay?.location_id)
        ?.maps_link;
    const callTime = getCallTimeForRole(ctx);
    const parking =
      ctx.callSheet?.parking_notes ?? ctx.shootingDay?.parking ?? "";

    if (ctx.role === "actor" || ctx.role === "extra") {
      return `Domani devi essere a: ${location ?? "—"}.\nOrario convocazione: ${callTime}.\nParcheggio: ${parking || "Vedi note produzione"}.\nMappa: ${maps ?? "Link non disponibile"}.`;
    }
    if (ctx.role === "driver") {
      return `Destinazione: ${location ?? "—"}.\nParcheggio mezzi: ${parking || ctx.shootingDay?.transport_notes || "—"}.\nMappa: ${maps ?? "—"}.\nConvocazione trasporti: ${ctx.shootingDay?.general_crew_call ?? "—"}.`;
    }
    if (ctx.role === "producer" || ctx.role === "assistant_director") {
      return `Location: ${location ?? "—"}\nIndirizzo/mappa: ${maps ?? "—"}\nConvocazione generale: ${ctx.shootingDay?.general_crew_call ?? "—"}\nConvocazione cast: ${ctx.shootingDay?.cast_call ?? "—"}\nParcheggio: ${parking || "—"}\nTrasporti: ${ctx.shootingDay?.transport_notes ?? "—"}`;
    }
    return `Location: ${location ?? "—"}. Convocazione: ${callTime}. Parcheggio: ${parking || "Vedi note"}.`;
  }

  if (q.includes("call time") || q.includes("convocazione") || q.includes("orario")) {
    const time = getCallTimeForRole(ctx);
    if (!time || time === "—") return unavailable();
    if (ctx.role === "producer") {
      return `Convocazioni del giorno:\n• Crew generale: ${ctx.shootingDay?.general_crew_call ?? "—"}\n• Cast: ${ctx.shootingDay?.cast_call ?? "—"}\n• Trucco: ${ctx.shootingDay?.makeup_call ?? "—"}\n• Prima inquadratura: ${ctx.shootingDay?.first_shot ?? "—"}`;
    }
    return `Il tuo orario di convocazione è: ${time}.`;
  }

  if (q.includes("scene") || q.includes("girare") || q.includes("shooting")) {
    const sceneIds =
      ctx.callSheet?.scenes_to_shoot ??
      ctx.shootingDay?.selected_scene_ids ??
      [];
    if (!sceneIds.length) return unavailable();
    const dayScenes = ctx.scenes.filter(
      (s) =>
        sceneIds.includes(s.id) || sceneIds.includes(s.scene_number)
    );
    if (!dayScenes.length) {
      return `Scene in programma: ${sceneIds.join(", ")}.`;
    }
    if (ctx.role === "actor" || ctx.role === "extra") {
      return dayScenes
        .map((s) => `Scena ${s.scene_number}: ${s.short_description}`)
        .join("\n");
    }
    return dayScenes
      .map(
        (s) =>
          `Scena ${s.scene_number} (${s.int_ext}/${s.day_night}) — ${s.location}\n${s.short_description}\nPersonaggi: ${formatList(s.characters)}\nComplessità: ${s.complexity}`
      )
      .join("\n\n");
  }

  if (q.includes("pranzo") || q.includes("lunch")) {
    const lunch =
      ctx.shootingDay?.lunch ??
      ctx.callSheet?.schedule.find((s) =>
        s.activity.toLowerCase().includes("pranzo")
      )?.time;
    if (!lunch) return unavailable();
    return `Orario pranzo: ${lunch}.`;
  }

  if (q.includes("parcheggio") || q.includes("parking")) {
    const parking =
      ctx.callSheet?.parking_notes ?? ctx.shootingDay?.parking ?? "";
    if (!parking) return unavailable();
    if (ctx.role === "driver") {
      return `Parcheggio mezzi e bus: ${parking}\nNote trasporti: ${ctx.shootingDay?.transport_notes ?? "—"}`;
    }
    return `Parcheggio: ${parking}`;
  }

  if (q.includes("foglio") || q.includes("call sheet") || q.includes("ultimo")) {
    if (!ctx.callSheet) return unavailable();
    return `Foglio di lavoro v${ctx.callSheet.version} — Stato: ${ctx.callSheet.status}.\nGiornata: ${ctx.callSheet.day_number}\nData: ${ctx.callSheet.date}\nLocation: ${ctx.callSheet.location}\nScene: ${ctx.callSheet.scenes_to_shoot.join(", ")}`;
  }

  if (q.includes("emergenza") || q.includes("emergency") || q.includes("contatto")) {
    const contacts =
      ctx.callSheet?.emergency_contacts ??
      (ctx.shootingDay?.emergency_contact
        ? [{ name: "Produzione", role: "Emergenze", phone: ctx.shootingDay.emergency_contact }]
        : []);
    if (!contacts.length) return unavailable();
    if (ctx.role === "crew" || ctx.role === "actor" || ctx.role === "driver") {
      return `Contatto emergenza: ${contacts[0].name} — ${contacts[0].phone}`;
    }
    return contacts.map((c) => `${c.name} (${c.role}): ${c.phone}`).join("\n");
  }

  return "Posso aiutarti con convocazioni, location, scene, parcheggio, pranzo, foglio di lavoro e contatti emergenza. Formula una domanda specifica.";
}

function getCallTimeForRole(ctx: AssistantContext): string {
  if (!ctx.shootingDay && !ctx.callSheet) return "—";

  const member = ctx.memberName
    ? ctx.castCrew.find((m) =>
        m.full_name.toLowerCase().includes(ctx.memberName!.toLowerCase())
      )
    : null;

  switch (ctx.role) {
    case "actor":
    case "extra":
      return member?.call_time ?? ctx.shootingDay?.cast_call ?? "—";
    case "crew":
      return member?.call_time ?? ctx.shootingDay?.general_crew_call ?? "—";
    case "driver":
      return ctx.shootingDay?.general_crew_call ?? "—";
    default:
      return ctx.shootingDay?.general_crew_call ?? "—";
  }
}

export const SUGGESTED_QUESTIONS = [
  "Dove devo essere domani?",
  "Qual è il mio orario di convocazione?",
  "Quali scene si girano oggi?",
  "Dove si parcheggia?",
  "Inviami l'ultimo foglio di lavoro",
  "Chi è il contatto emergenza?",
] as const;
