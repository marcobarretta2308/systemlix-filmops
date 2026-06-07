import type { PlatformStore } from "@/lib/types";

const now = new Date().toISOString();

export const IDS = {
  userOwner: "user-owner",
  userAlfa: "user-alfa",
  userBeta: "user-beta",
  compAlfa: "comp-alfa",
  compBeta: "comp-beta",
  wsAlfaMain: "ws-alfa-main",
  wsBetaDoc: "ws-beta-doc",
  projAlfaFilm1: "proj-alfa-film-1",
  projAlfaSerie2: "proj-alfa-serie-2",
  projAlfaSpot3: "proj-alfa-spot-3",
  projBetaDoc1: "proj-beta-doc-1",
  projBetaSerie1: "proj-beta-serie-1",
} as const;

/** Optional rich demo data for one project — generic production, no client-specific names */
export function createDemoProjectData(projectId: string, companyName: string, projectTitle: string) {
  const loc1 = `loc-${projectId}-1`;
  const loc2 = `loc-${projectId}-2`;
  const sd1 = `sd-${projectId}-1`;

  return {
    scenes: [
      {
        id: `scene-${projectId}-1`,
        project_id: projectId,
        scene_number: "12",
        int_ext: "EXT" as const,
        day_night: "DAY" as const,
        location: "Location esterna — Mercato",
        short_description: "Due protagonisti attraversano il mercato. Tensione crescente.",
        characters: ["Protagonista A", "Protagonista B", "Comparsazione"],
        props: ["Telefono", "Borsa documenti"],
        costumes: ["Look urbano A", "Giacca B"],
        vfx: [],
        stunts: [],
        vehicles: ["SUV produzione"],
        animals: [],
        special_requirements: ["Controllo folla"],
        complexity: "high" as const,
        production_notes: "Coordinare con autorità locali. Riprese mattutine.",
        created_at: now,
        updated_at: now,
      },
      {
        id: `scene-${projectId}-2`,
        project_id: projectId,
        scene_number: "13",
        int_ext: "INT" as const,
        day_night: "DAY" as const,
        location: "Appartamento — Set interno",
        short_description: "Riunione strategica. Decisione operativa.",
        characters: ["Protagonista A", "Consulente", "Bodyguard"],
        props: ["Mappa", "Laptop"],
        costumes: ["Tailleur consulente"],
        vfx: [],
        stunts: [],
        vehicles: [],
        animals: [],
        special_requirements: ["Set dressing"],
        complexity: "medium" as const,
        production_notes: "Luce naturale + fill.",
        created_at: now,
        updated_at: now,
      },
      {
        id: `scene-${projectId}-3`,
        project_id: projectId,
        scene_number: "14",
        int_ext: "EXT" as const,
        day_night: "NIGHT" as const,
        location: "Location esterna — Vicoli",
        short_description: "Sequenza notturna. Conclusione episodio.",
        characters: ["Protagonista A", "Protagonista B", "Antagonisti"],
        props: ["Torce"],
        costumes: ["Look notturno"],
        vfx: ["Rimozione luci moderne"],
        stunts: ["Inseguimento a piedi"],
        vehicles: ["Due auto produzione"],
        animals: [],
        special_requirements: ["Medico set", "Coordinator stunt"],
        complexity: "very_high" as const,
        production_notes: "Sicurezza prioritaria.",
        created_at: now,
        updated_at: now,
      },
    ],
    locations: [
      {
        id: loc1,
        project_id: projectId,
        name: "Location esterna — Mercato",
        address: "Via Esempio 1, Città",
        maps_link: "https://maps.google.com/",
        parking_notes: "Parcheggio bus e mezzi tecnici. Cast su navetta.",
        access_notes: "Badge obbligatorio. Coordinare referente location.",
        production_notes: "Location principale Day 04.",
        created_at: now,
      },
      {
        id: loc2,
        project_id: projectId,
        name: "Appartamento — Set interno",
        address: "Via Esempio 45, Città",
        maps_link: "https://maps.google.com/",
        parking_notes: "Mezzi tecnici su permesso.",
        access_notes: "Ascensore non disponibile — piano 3.",
        production_notes: "Riprese interne scene 13.",
        created_at: now,
      },
    ],
    castCrew: [
      { id: `cc-${projectId}-1`, project_id: projectId, full_name: "Elena Producer", role: "Producer", department: "Produzione", phone: "+39 335 000 0001", email: "producer@alfa.it", call_time: "06:30", permission_level: "admin", status: "confirmed" as const, created_at: now },
      { id: `cc-${projectId}-2`, project_id: projectId, full_name: "Luca AD", role: "Assistant Director", department: "Regia", phone: "+39 340 000 0002", email: "ad@alfa.it", call_time: "06:00", permission_level: "editor", status: "confirmed" as const, created_at: now },
      { id: `cc-${projectId}-3`, project_id: projectId, full_name: "Marco Director", role: "Director", department: "Regia", phone: "+39 348 000 0003", email: "director@alfa.it", call_time: "07:00", permission_level: "editor", status: "confirmed" as const, created_at: now },
      { id: `cc-${projectId}-4`, project_id: projectId, full_name: "Attore Principale", role: "Actor", department: "Cast", phone: "+39 333 000 0004", email: "cast@alfa.it", call_time: "07:30", permission_level: "viewer", status: "confirmed" as const, created_at: now },
      { id: `cc-${projectId}-5`, project_id: projectId, full_name: "Giulia Costumi", role: "Costume Department", department: "Costumi", phone: "+39 320 000 0005", email: "costumi@alfa.it", call_time: "06:00", permission_level: "editor", status: "confirmed" as const, created_at: now },
      { id: `cc-${projectId}-6`, project_id: projectId, full_name: "Anna Trucco", role: "Makeup Department", department: "Trucco", phone: "+39 331 000 0006", email: "trucco@alfa.it", call_time: "06:30", permission_level: "editor", status: "pending" as const, created_at: now },
      { id: `cc-${projectId}-7`, project_id: projectId, full_name: "Paolo Camera", role: "Camera Department", department: "Camera", phone: "+39 347 000 0007", email: "camera@alfa.it", call_time: "06:00", permission_level: "editor", status: "confirmed" as const, created_at: now },
      { id: `cc-${projectId}-8`, project_id: projectId, full_name: "Michele Transport", role: "Transport", department: "Trasporti", phone: "+39 338 000 0008", email: "trasporti@alfa.it", call_time: "05:30", permission_level: "viewer", status: "issue" as const, created_at: now },
    ],
    shootingDays: [
      {
        id: sd1,
        project_id: projectId,
        day_number: "Day 04",
        date: "2026-06-09",
        location_id: loc1,
        selected_scene_ids: [`scene-${projectId}-1`, `scene-${projectId}-3`],
        general_crew_call: "06:00",
        cast_call: "07:30",
        makeup_call: "06:30",
        first_shot: "08:30",
        lunch: "13:00–14:00",
        estimated_wrap: "22:00",
        parking: "Area mezzi tecnici e bus cast",
        transport_notes: "Navetta cast ore 07:00.",
        emergency_contact: "+39 335 000 0001 (Producer)",
        production_notes: "Giornata complessa: scene 12 e 14.",
        created_at: now,
      },
    ],
    callSheets: [
      {
        id: `cs-${projectId}-1`,
        project_id: projectId,
        shooting_day_id: sd1,
        version: 1,
        status: "draft" as const,
        generated_by: "user-alfa",
        production_title: companyName,
        project_title: projectTitle,
        day_number: "Day 04",
        date: "2026-06-09",
        location: "Location esterna — Mercato",
        maps_link: "https://maps.google.com/",
        weather_notes: "Previsione: sereno, 24°C. Tramonto 20:45.",
        schedule: [
          { time: "06:00", activity: "Convocazione crew generale" },
          { time: "06:30", activity: "Convocazione trucco e parrucco" },
          { time: "07:30", activity: "Convocazione cast principale" },
          { time: "08:30", activity: "Prima inquadratura — Scena 12" },
          { time: "13:00", activity: "Pausa pranzo" },
          { time: "22:00", activity: "Wrap stimato" },
        ],
        scenes_to_shoot: ["12", "14"],
        cast_call_times: [
          { name: "Attore Principale", role: "Protagonista A", department: "Cast", call_time: "07:30" },
        ],
        crew_call_times: [
          { name: "Elena Producer", role: "Producer", department: "Produzione", call_time: "06:30" },
          { name: "Luca AD", role: "AD", department: "Regia", call_time: "06:00" },
        ],
        department_notes: {
          Camera: "Due camere. Steadicam per scena 14.",
          Costumi: "Continuità da giornata precedente.",
        },
        parking_notes: "Area mezzi tecnici e bus.",
        transport_notes: "Navetta cast 07:00.",
        emergency_contacts: [
          { name: "Elena Producer", role: "Producer", phone: "+39 335 000 0001" },
        ],
        production_notes: "Versione bozza v1.",
        created_at: now,
        updated_at: now,
      },
    ],
    sampleScript: `SCENA 12 - ESTERNO. MERCATO - GIORNO\n\nDue protagonisti attraversano il mercato affollato.\n\nSCENA 14 - ESTERNO. VICOLI - NOTTE\n\nInseguimento notturno. Conclusione episodio.`,
  };
}

export function createInitialStore(): PlatformStore {
  const serie2Demo = createDemoProjectData(
    IDS.projAlfaSerie2,
    "Produzione Alfa",
    "Serie 2"
  );

  return {
    users: [
      { id: IDS.userOwner, email: "owner@systemlix.it", full_name: "Platform Owner", created_at: now },
      { id: IDS.userAlfa, email: "admin@alfa.it", full_name: "Marco Rossi", created_at: now },
      { id: IDS.userBeta, email: "admin@beta.it", full_name: "Laura Bianchi", created_at: now },
    ],
    companies: [
      { id: IDS.compAlfa, name: "Produzione Alfa", type: "production_house", status: "active", created_at: now },
      { id: IDS.compBeta, name: "Produzione Beta", type: "production_house", status: "active", created_at: now },
    ],
    companyMembers: [
      { id: "cm-owner-alfa", company_id: IDS.compAlfa, user_id: IDS.userOwner, role: "platform_owner", status: "active", joined_at: now },
      { id: "cm-owner-beta", company_id: IDS.compBeta, user_id: IDS.userOwner, role: "platform_owner", status: "active", joined_at: now },
      { id: "cm-alfa", company_id: IDS.compAlfa, user_id: IDS.userAlfa, role: "company_admin", status: "active", joined_at: now },
      { id: "cm-beta", company_id: IDS.compBeta, user_id: IDS.userBeta, role: "company_admin", status: "active", joined_at: now },
    ],
    workspaces: [
      { id: IDS.wsAlfaMain, company_id: IDS.compAlfa, name: "Produzione Principale", description: "Workspace principale Produzione Alfa", status: "active", created_at: now },
      { id: IDS.wsBetaDoc, company_id: IDS.compBeta, name: "Workspace Documentari", description: "Progetti documentari e serie", status: "active", created_at: now },
    ],
    projects: [
      { id: IDS.projAlfaFilm1, workspace_id: IDS.wsAlfaMain, company_id: IDS.compAlfa, title: "Film 1", production_type: "Film", description: "Lungometraggio — pre-produzione", status: "active", start_date: "2026-03-01", end_date: "2026-09-30", created_at: now, updated_at: now },
      { id: IDS.projAlfaSerie2, workspace_id: IDS.wsAlfaMain, company_id: IDS.compAlfa, title: "Serie 2", production_type: "Serie TV", description: "Seconda serie — in produzione", status: "active", start_date: "2026-01-15", end_date: "2026-12-15", created_at: now, updated_at: now },
      { id: IDS.projAlfaSpot3, workspace_id: IDS.wsAlfaMain, company_id: IDS.compAlfa, title: "Spot 3", production_type: "Spot", description: "Campagna pubblicitaria", status: "paused", start_date: "2026-05-01", end_date: "2026-05-30", created_at: now, updated_at: now },
      { id: IDS.projBetaDoc1, workspace_id: IDS.wsBetaDoc, company_id: IDS.compBeta, title: "Documentario 1", production_type: "Documentario", description: "Docufilm in sviluppo", status: "active", start_date: "2026-02-01", end_date: "2026-08-01", created_at: now, updated_at: now },
      { id: IDS.projBetaSerie1, workspace_id: IDS.wsBetaDoc, company_id: IDS.compBeta, title: "Serie TV 1", production_type: "Serie TV", description: "Prima serie originale", status: "active", start_date: "2026-04-01", end_date: "2027-01-01", created_at: now, updated_at: now },
    ],
    projectMembers: [
      { id: "pm-alfa-film", project_id: IDS.projAlfaFilm1, user_id: IDS.userAlfa, role: "project_admin", access_status: "active", created_at: now },
      { id: "pm-alfa-serie", project_id: IDS.projAlfaSerie2, user_id: IDS.userAlfa, role: "project_admin", access_status: "active", created_at: now },
      { id: "pm-alfa-spot", project_id: IDS.projAlfaSpot3, user_id: IDS.userAlfa, role: "producer", access_status: "active", created_at: now },
      { id: "pm-beta-doc", project_id: IDS.projBetaDoc1, user_id: IDS.userBeta, role: "project_admin", access_status: "active", created_at: now },
      { id: "pm-beta-serie", project_id: IDS.projBetaSerie1, user_id: IDS.userBeta, role: "project_admin", access_status: "active", created_at: now },
    ],
    scripts: [],
    scenes: serie2Demo.scenes,
    castCrew: serie2Demo.castCrew,
    locations: serie2Demo.locations,
    shootingDays: serie2Demo.shootingDays,
    callSheets: serie2Demo.callSheets,
    archiveLogs: [],
  };
}

export const DEMO_LOGIN_USERS = [
  { email: "owner@systemlix.it", label: "Platform Owner (vede tutto)" },
  { email: "admin@alfa.it", label: "Marco Rossi — Produzione Alfa" },
  { email: "admin@beta.it", label: "Laura Bianchi — Produzione Beta" },
] as const;

export const SAMPLE_SCRIPT_TEXT = createDemoProjectData("demo", "Demo", "Demo").sampleScript;
