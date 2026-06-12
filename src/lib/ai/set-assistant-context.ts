import {
  mapCallSheet,
  mapCastCrew,
  mapCompany,
  mapLocation,
  mapProject,
  mapScene,
  mapShootingDay,
} from "@/lib/supabase/mappers";
import type {
  CallSheet,
  CallSheetStatus,
  CastCrew,
  CastCrewStatus,
  Company,
  Complexity,
  Location,
  Project,
  Scene,
  SetAssistantRole,
  ShootingDay,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABELS: Record<CallSheetStatus, string> = {
  draft: "Bozza",
  ready_for_approval: "Pronta per approvazione",
  approved: "Approvata",
  sent: "Inviata",
  archived: "Archiviata",
  final: "Pronta per approvazione",
  locked: "Approvata",
};

const COMPLEXITY_LABELS: Record<Complexity, string> = {
  low: "Bassa",
  medium: "Media",
  high: "Alta",
  very_high: "Molto alta",
};

const CAST_STATUS_LABELS: Record<CastCrewStatus, string> = {
  confirmed: "Confermato",
  pending: "In attesa",
  issue: "Problema",
};

export type SetAssistantLoadedContext = {
  project: Project;
  company: Company;
  scenes: Scene[];
  castCrew: CastCrew[];
  locations: Location[];
  shootingDays: ShootingDay[];
  callSheets: CallSheet[];
  activeShootingDay: ShootingDay | null;
  activeLocation: Location | null;
  activeCallSheet: CallSheet | null;
  dayScenes: Scene[];
};

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text || "—";
}

function list(items: string[]): string {
  return items.length ? items.join(", ") : "—";
}

export function resolveShootingDay(
  shootingDays: ShootingDay[],
  selectedShootingDayId?: string
): ShootingDay | null {
  if (selectedShootingDayId && UUID_RE.test(selectedShootingDayId)) {
    return shootingDays.find((day) => day.id === selectedShootingDayId) ?? null;
  }

  if (!shootingDays.length) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...shootingDays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const upcoming = sorted.find((day) => {
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate.getTime() >= today.getTime();
  });

  return upcoming ?? sorted[sorted.length - 1] ?? null;
}

export function resolveCallSheet(
  callSheets: CallSheet[],
  shootingDayId: string | null
): CallSheet | null {
  if (!callSheets.length) return null;

  if (shootingDayId) {
    const matching = callSheets.filter(
      (sheet) => sheet.shooting_day_id === shootingDayId
    );
    if (matching.length) {
      return matching.sort((a, b) => b.version - a.version)[0];
    }
  }

  return [...callSheets].sort((a, b) => b.version - a.version)[0] ?? null;
}

export function getDayScenes(
  scenes: Scene[],
  shootingDay: ShootingDay | null,
  callSheet: CallSheet | null
): Scene[] {
  if (!shootingDay) return [];

  const byId = scenes.filter((scene) =>
    shootingDay.selected_scene_ids.includes(scene.id)
  );

  if (byId.length) return byId;

  const sceneNumbers = callSheet?.scenes_to_shoot ?? [];
  if (!sceneNumbers.length) return [];

  return scenes.filter((scene) => sceneNumbers.includes(scene.scene_number));
}

export type DepartmentReferenceScenes = {
  scenes: Scene[];
  shootingDay: ShootingDay | null;
  usingAllScenes: boolean;
};

/** Scene visibili ai reparti operativi: filtrate per giornata di ripresa se presente. */
export function getDepartmentReferenceScenes(
  ctx: SetAssistantLoadedContext
): DepartmentReferenceScenes {
  if (!ctx.shootingDays.length) {
    return {
      scenes: ctx.scenes,
      shootingDay: null,
      usingAllScenes: true,
    };
  }

  const shootingDay = ctx.activeShootingDay;
  if (!shootingDay) {
    return {
      scenes: ctx.scenes,
      shootingDay: null,
      usingAllScenes: true,
    };
  }

  const dayScenes =
    ctx.dayScenes.length > 0
      ? ctx.dayScenes
      : getDayScenes(ctx.scenes, shootingDay, ctx.activeCallSheet);

  return {
    scenes: dayScenes,
    shootingDay,
    usingAllScenes: false,
  };
}

export async function loadSetAssistantContext(
  supabase: SupabaseClient,
  projectId: string,
  selectedShootingDayId?: string
): Promise<SetAssistantLoadedContext> {
  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !projectRow) {
    throw new Error("Progetto non trovato o accesso negato");
  }

  const project = mapProject(projectRow);

  const { data: companyRow, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", project.company_id)
    .single();

  if (companyError || !companyRow) {
    throw new Error("Produzione non trovata o accesso negato");
  }

  const company = mapCompany(companyRow);

  const [scenesRes, castRes, locRes, daysRes, sheetsRes] = await Promise.all([
    supabase
      .from("scenes")
      .select("*")
      .eq("project_id", projectId)
      .order("scene_number"),
    supabase
      .from("cast_crew")
      .select("*")
      .eq("project_id", projectId)
      .order("full_name"),
    supabase
      .from("locations")
      .select("*")
      .eq("project_id", projectId)
      .order("name"),
    supabase
      .from("shooting_days")
      .select("*")
      .eq("project_id", projectId)
      .order("date"),
    supabase
      .from("call_sheets")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  for (const res of [scenesRes, castRes, locRes, daysRes, sheetsRes]) {
    if (res.error) throw res.error;
  }

  const scenes = (scenesRes.data ?? []).map(mapScene);
  const castCrew = (castRes.data ?? []).map(mapCastCrew);
  const locations = (locRes.data ?? []).map(mapLocation);
  const shootingDays = (daysRes.data ?? []).map(mapShootingDay);
  const callSheets = (sheetsRes.data ?? []).map(mapCallSheet);

  const activeShootingDay = resolveShootingDay(
    shootingDays,
    selectedShootingDayId
  );
  const activeCallSheet = resolveCallSheet(
    callSheets,
    activeShootingDay?.id ?? null
  );
  const activeLocation = activeShootingDay?.location_id
    ? (locations.find((loc) => loc.id === activeShootingDay.location_id) ??
      null)
    : null;
  const dayScenes = getDayScenes(scenes, activeShootingDay, activeCallSheet);

  return {
    project,
    company,
    scenes,
    castCrew,
    locations,
    shootingDays,
    callSheets,
    activeShootingDay,
    activeLocation,
    activeCallSheet,
    dayScenes,
  };
}

function buildCostumiContextText(ctx: SetAssistantLoadedContext): string {
  const { scenes, shootingDay, usingAllScenes } =
    getDepartmentReferenceScenes(ctx);

  const lines: string[] = [
    "PROJECT:",
    `title: ${dash(ctx.project.title)}`,
    "",
  ];

  if (usingAllScenes) {
    lines.push(
      "NOTA GIORNATA:",
      "Non è stata selezionata una giornata di ripresa. Mostro tutte le scene disponibili nel progetto.",
      ""
    );
  } else if (shootingDay) {
    const loc = ctx.locations.find((l) => l.id === shootingDay.location_id);
    lines.push(
      "GIORNATA DI RIFERIMENTO:",
      `day_number: ${dash(shootingDay.day_number)}`,
      `date: ${dash(shootingDay.date)}`,
      `location: ${dash(loc?.name)}`,
      `selected_scene_ids: ${list(shootingDay.selected_scene_ids)}`,
      "Usa SOLO le scene elencate in SCENES — non includere scene non collegate a questa giornata.",
      ""
    );
  }

  lines.push("SCENES (fonte principale costumi — breakdown, solo giornata di riferimento):");

  if (!scenes.length) {
    lines.push(
      shootingDay
        ? "Nessuna scena collegata alla giornata di riferimento"
        : "Nessuna scena disponibile"
    );
  } else {
    scenes.forEach((scene) => {
      lines.push(
        `- scene_number: ${dash(scene.scene_number)}`,
        `  characters: ${list(scene.characters)}`,
        `  costumes: ${list(scene.costumes)}`,
        `  location: ${dash(scene.location)}`,
        `  day_night: ${dash(scene.day_night)}`,
        `  int_ext: ${dash(scene.int_ext)}`,
        `  short_description: ${dash(scene.short_description)}`,
        `  production_notes: ${dash(scene.production_notes)}`
      );
    });
  }

  if (shootingDay) {
    lines.push("", "SHOOTING DAY (attiva):");
    const loc = ctx.locations.find((l) => l.id === shootingDay.location_id);
    lines.push(
      `day_number: ${dash(shootingDay.day_number)}`,
      `date: ${dash(shootingDay.date)}`,
      `location: ${dash(loc?.name)}`,
      `selected_scene_ids: ${list(shootingDay.selected_scene_ids)}`
    );
  } else {
    lines.push("", "SHOOTING DAYS:", "Nessuna giornata di ripresa configurata");
  }

  lines.push("", "LOCATIONS (supporto):");
  if (!ctx.locations.length) {
    lines.push("Nessuna location disponibile");
  } else {
    ctx.locations.forEach((loc) => {
      lines.push(`- name: ${dash(loc.name)}`, `  address: ${dash(loc.address)}`);
    });
  }

  lines.push(
    "",
    "CALL SHEETS (solo supporto — NON fonte primaria per costumi):"
  );
  if (!ctx.callSheets.length) {
    lines.push("Nessun call sheet disponibile");
  } else if (ctx.activeCallSheet) {
    lines.push(
      `version: v${ctx.activeCallSheet.version}`,
      `day_number: ${dash(ctx.activeCallSheet.day_number)}`,
      `scenes_to_shoot: ${list(ctx.activeCallSheet.scenes_to_shoot)}`
    );
  }

  return lines.join("\n");
}

export function buildSetAssistantContextText(
  ctx: SetAssistantLoadedContext,
  roleContext?: SetAssistantRole | string
): string {
  if (roleContext === "costumi") {
    return buildCostumiContextText(ctx);
  }

  const day = ctx.activeShootingDay;
  const location = ctx.activeLocation;
  const callSheet = ctx.activeCallSheet;

  const lines: string[] = [
    "PROJECT:",
    `title: ${dash(ctx.project.title)}`,
    `production_type: ${dash(ctx.project.production_type)}`,
    `status: ${dash(ctx.project.status)}`,
    "",
    "COMPANY:",
    `name: ${dash(ctx.company.name)}`,
    "",
  ];

  if (day) {
    lines.push(
      "CURRENT / NEXT SHOOTING DAY:",
      `day_number: ${dash(day.day_number)}`,
      `date: ${dash(day.date)}`,
      `location: ${dash(callSheet?.location || location?.name)}`,
      `address: ${dash(location?.address)}`,
      `parking: ${dash(callSheet?.parking_notes || day.parking || location?.parking_notes)}`,
      `access_notes: ${dash(location?.access_notes)}`,
      `crew_call: ${dash(day.general_crew_call)}`,
      `cast_call: ${dash(day.cast_call)}`,
      `makeup_call: ${dash(day.makeup_call)}`,
      `first_shot: ${dash(day.first_shot)}`,
      `lunch: ${dash(day.lunch)}`,
      `estimated_wrap: ${dash(day.estimated_wrap)}`,
      `transport_notes: ${dash(callSheet?.transport_notes || day.transport_notes)}`,
      `production_notes: ${dash(callSheet?.production_notes || day.production_notes)}`,
      `emergency_contact: ${dash(
        callSheet?.emergency_contacts[0]?.phone || day.emergency_contact
      )}`,
      `maps_link: ${dash(callSheet?.maps_link || location?.maps_link)}`,
      ""
    );
  } else {
    lines.push("CURRENT / NEXT SHOOTING DAY:", "Nessuna giornata disponibile", "");
  }

  lines.push("SCENES:");
  const scenesForContext = ctx.dayScenes.length ? ctx.dayScenes : ctx.scenes;

  if (!scenesForContext.length) {
    lines.push("Nessuna scena disponibile");
  } else {
    scenesForContext.forEach((scene) => {
      lines.push(
        `- scene_number: ${dash(scene.scene_number)}`,
        `  int_ext: ${dash(scene.int_ext)}`,
        `  day_night: ${dash(scene.day_night)}`,
        `  location: ${dash(scene.location)}`,
        `  short_description: ${dash(scene.short_description)}`,
        `  characters: ${list(scene.characters)}`,
        `  props: ${list(scene.props)}`,
        `  costumes: ${list(scene.costumes)}`,
        `  vfx: ${list(scene.vfx)}`,
        `  stunts: ${list(scene.stunts)}`,
        `  vehicles: ${list(scene.vehicles)}`,
        `  animals: ${list(scene.animals)}`,
        `  complexity: ${dash(COMPLEXITY_LABELS[scene.complexity])}`,
        `  production_notes: ${dash(scene.production_notes)}`
      );
    });
  }

  lines.push("", "CAST & CREW:");
  if (!ctx.castCrew.length) {
    lines.push("Nessun membro disponibile");
  } else {
    ctx.castCrew.forEach((member) => {
      lines.push(
        `- full_name: ${dash(member.full_name)}`,
        `  role: ${dash(member.role)}`,
        `  department: ${dash(member.department)}`,
        `  email: ${dash(member.email)}`,
        `  phone: ${dash(member.phone)}`,
        `  status: ${dash(CAST_STATUS_LABELS[member.status])}`
      );
    });
  }

  lines.push("", "CALL SHEETS:");
  if (!ctx.callSheets.length) {
    lines.push("Nessun call sheet disponibile");
  } else {
    ctx.callSheets.forEach((sheet) => {
      lines.push(
        `- version: v${sheet.version}`,
        `  status: ${dash(STATUS_LABELS[sheet.status])}`,
        `  created_at: ${dash(sheet.created_at)}`,
        `  day_number: ${dash(sheet.day_number)}`,
        `  shooting_day_id: ${dash(sheet.shooting_day_id)}`
      );
    });
  }

  if (callSheet) {
    lines.push(
      "",
      "ACTIVE CALL SHEET:",
      `version: v${callSheet.version}`,
      `status: ${dash(STATUS_LABELS[callSheet.status])}`,
      `scenes_to_shoot: ${list(callSheet.scenes_to_shoot)}`,
      `parking_notes: ${dash(callSheet.parking_notes)}`,
      `transport_notes: ${dash(callSheet.transport_notes)}`,
      `production_notes: ${dash(callSheet.production_notes)}`
    );
  }

  return lines.join("\n");
}

export const DEPARTMENT_DENIED_MESSAGE =
  "Questa informazione non è disponibile per il tuo profilo operativo.";

export const COSTUMI_FALLBACK_MESSAGE =
  "Questa informazione non è disponibile nel breakdown del progetto. Contatta la produzione.";

export const CALL_SHEET_FALLBACK_MESSAGE =
  "Questa informazione non è disponibile nel call sheet corrente. Contatta la produzione.";

const CONTRADICTORY_FALLBACK_PATTERNS = [
  /questa informazione non è disponibile nel call sheet corrente\.?\s*contatta la produzione\.?/gi,
  /questa informazione non è disponibile nel foglio di lavoro corrente\.?\s*contattare la produzione\.?/gi,
  /questa informazione non è disponibile nel breakdown del progetto\.?\s*contatta la produzione\.?/gi,
];

function responseHasUsefulContent(text: string): boolean {
  const normalized = text.trim();
  if (normalized.length < 20) return false;
  return /scena|costum|personagg|look|location|giornat|character|ripresa|breakdown|note/i.test(
    normalized
  );
}

export function sanitizeSetAssistantResponse(
  response: string,
  _roleContext?: SetAssistantRole | string
): string {
  let cleaned = response.trim();
  if (!responseHasUsefulContent(cleaned)) return cleaned;

  for (const pattern of CONTRADICTORY_FALLBACK_PATTERNS) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

export const ROLE_CONTEXT_INSTRUCTIONS: Record<string, string> = {
  producer:
    "Ruolo: Producer. Fornisci risposte più complete, includi note operative, criticità e panoramica di produzione quando rilevante.",
  assistant_director:
    "Ruolo: Assistant Director. Focus su scene, orari, reparti, convocazioni e coordinamento sul set.",
  actor:
    "Ruolo: Actor. Focus su call time, location, scene del giorno e info trucco/costume se presenti. Non condividere dati non necessari.",
  crew:
    "Ruolo: Crew. Focus su orari, location, parcheggio e note operative del reparto.",
  driver:
    "Ruolo: Driver. Focus su trasporti, location, orari e parcheggio mezzi.",
  extra:
    "Ruolo: Extra. Rispondi solo con informazioni essenziali autorizzate: location, orario convocazione e istruzioni base.",
  costumi: `Ruolo: Reparto Costumi.

FILTRO GIORNATA:
- Usa SOLO le scene della giornata di riferimento indicata nel contesto (GIORNATA DI RIFERIMENTO / selected_scene_ids).
- Non includere scene del progetto non collegate alla giornata corrente.
- Se non c'è giornata di ripresa, usa tutte le scene e dichiara: "Non è stata selezionata una giornata di ripresa. Mostro tutte le scene disponibili nel progetto."

FORMATO RISPOSTA COSTUMI:
- Con giornata: inizia con "Per la giornata [day_number] sono previste queste scene:"
- Senza giornata: inizia con "Non è stata selezionata una giornata di ripresa. Mostro tutte le scene disponibili nel progetto."
- Per ogni scena: numero, costumi, personaggi, location, day/night, note costume/produzione
- Chiudi con "Non sono presenti ulteriori note costume nel breakdown." se applicabile

DOMANDE SUI COSTUMI:
1. Cerca in scenes.costumes solo per le scene della giornata di riferimento.
2. Se costumes ha dati, elenca scena per scena.
3. Se costumes vuoto ma ci sono characters: "Nel breakdown non sono presenti note costume dettagliate. Personaggi presenti: ..."
4. Se nessuna scena/personaggio rilevante: "${COSTUMI_FALLBACK_MESSAGE}"

Non usare "call sheet corrente" per domande sui costumi.
Non aggiungere fallback se hai già fornito dati utili.`,
  trucco:
    "Ruolo: Reparto Trucco. Focus su personaggi, scene, makeup call, orari cast e note operative trucco/parrucco.",
  props:
    "Ruolo: Reparto Props. Focus su scene, props richiesti, location e note props.",
  trasporti:
    "Ruolo: Reparto Trasporti. Focus su location, indirizzi, parcheggio, orari convocazione, note trasporto e cast/crew convocati.",
  location_department:
    "Ruolo: Reparto Location. Focus su location, indirizzi, accessi, parcheggio, note location e giornate di ripresa.",
};

export const SET_ASSISTANT_SYSTEM_PROMPT = `Sei il Set Assistant AI di FilmOps, una piattaforma per produzioni cinematografiche.

Rispondi solo usando i dati ufficiali del progetto forniti nel contesto.
Non inventare informazioni.
Non inventare orari, location, scene, persone, numeri di telefono o istruzioni operative.

REGOLA FONDAMENTALE — NESSUNA RISPOSTA CONTRADDITTORIA:
- Non aggiungere mai la frase di fallback se hai già fornito almeno una risposta utile basata sui dati disponibili.
- Usa il fallback solo quando NESSUN dato rilevante è presente nel contesto per rispondere alla domanda.
- Se hai dati parziali, indica chiaramente cosa hai trovato e cosa manca. Non dichiarare "non disponibile" per campi che hai già compilato nella stessa risposta.

Se un dato specifico richiesto non è presente nel contesto E non hai fornito altre informazioni utili nella risposta, usa UNA sola frase di fallback (seguendo le istruzioni del ruolo).
Se l'utente chiede informazioni fuori dal profilo reparto autorizzato, rispondi:
"${DEPARTMENT_DENIED_MESSAGE}"

Le risposte devono essere:
- brevi
- pratiche
- operative
- chiare
- professionali
- in italiano`;
