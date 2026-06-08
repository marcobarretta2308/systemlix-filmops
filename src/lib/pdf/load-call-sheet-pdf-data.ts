import {
  buildCallSheetFilename,
  CALL_SHEET_STATUS_LABELS,
  CAST_STATUS_LABELS,
  COMPLEXITY_LABELS,
  dash,
  formatGeneratedAt,
  type CallSheetPdfData,
} from "@/lib/pdf/call-sheet-types";
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
  CastCrew,
  Location,
  Scene,
  ShootingDay,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LoadParams = {
  projectId: string;
  callSheetId?: string;
  shootingDayId?: string;
};

function findScheduleTime(
  callSheet: CallSheet | null,
  keywords: string[]
): string | undefined {
  const item = callSheet?.schedule.find((entry) =>
    keywords.some((keyword) =>
      entry.activity.toLowerCase().includes(keyword.toLowerCase())
    )
  );
  return item?.time?.trim() || undefined;
}

function buildSchedule(
  callSheet: CallSheet | null,
  day: ShootingDay
): CallSheetPdfData["schedule"] {
  return [
    {
      label: "Crew call",
      time: dash(
        findScheduleTime(callSheet, ["crew", "generale"]) ?? day.general_crew_call
      ),
    },
    {
      label: "Makeup call",
      time: dash(
        findScheduleTime(callSheet, ["trucco", "makeup", "parrucco"]) ??
          day.makeup_call
      ),
    },
    {
      label: "Cast call",
      time: dash(findScheduleTime(callSheet, ["cast"]) ?? day.cast_call),
    },
    {
      label: "Primo ciak",
      time: dash(
        findScheduleTime(callSheet, ["ciak", "shot", "primo"]) ?? day.first_shot
      ),
    },
    {
      label: "Pranzo",
      time: dash(
        findScheduleTime(callSheet, ["pranzo", "lunch", "pausa"]) ?? day.lunch
      ),
    },
    {
      label: "Wrap previsto",
      time: dash(
        findScheduleTime(callSheet, ["wrap", "stimato"]) ?? day.estimated_wrap
      ),
    },
  ];
}

function buildSceneRows(
  scenes: Scene[],
  selectedIds: string[],
  sceneNumbers: string[]
): CallSheetPdfData["scenes"] {
  let selected = scenes.filter((scene) => selectedIds.includes(scene.id));

  if (selected.length === 0 && sceneNumbers.length > 0) {
    selected = scenes.filter((scene) =>
      sceneNumbers.includes(scene.scene_number)
    );
  }

  return selected.map((scene) => ({
    scene_number: dash(scene.scene_number),
    int_ext: dash(scene.int_ext),
    day_night: dash(scene.day_night),
    location: dash(scene.location),
    short_description: dash(scene.short_description),
    characters: dash(scene.characters.join(", ")),
    props: dash(scene.props.slice(0, 4).join(", ")),
    complexity: dash(COMPLEXITY_LABELS[scene.complexity]),
  }));
}

function buildCastCrewRows(
  castCrew: CastCrew[],
  callSheet: CallSheet | null,
  day: ShootingDay
): CallSheetPdfData["castCrew"] {
  const callTimeMap = new Map<string, string>();
  if (callSheet) {
    [...callSheet.cast_call_times, ...callSheet.crew_call_times].forEach(
      (entry) => {
        if (entry.name) callTimeMap.set(entry.name, entry.call_time);
      }
    );
  }

  return castCrew.map((member) => ({
    name: dash(member.full_name),
    role: dash(member.role),
    department: dash(member.department),
    call_time: dash(
      callTimeMap.get(member.full_name) ||
        member.call_time ||
        (member.department === "Cast" ? day.cast_call : day.general_crew_call)
    ),
    status: dash(CAST_STATUS_LABELS[member.status]),
  }));
}

function buildEmergencyContacts(
  callSheet: CallSheet | null,
  day: ShootingDay
): CallSheetPdfData["emergencyContacts"] {
  if (callSheet?.emergency_contacts.length) {
    return callSheet.emergency_contacts.map((contact) => ({
      name: dash(contact.name),
      role: dash(contact.role),
      phone: dash(contact.phone),
    }));
  }

  if (day.emergency_contact?.trim()) {
    return [
      {
        name: "Produzione",
        role: "Emergenza",
        phone: dash(day.emergency_contact),
      },
    ];
  }

  return [];
}

function assemblePdfData(input: {
  projectTitle: string;
  productionTitle: string;
  productionType: string;
  version: number;
  statusLabel: string;
  generatedAt: string;
  day: ShootingDay;
  location: Location | null;
  callSheet: CallSheet | null;
  scenes: Scene[];
  castCrew: CastCrew[];
}): CallSheetPdfData {
  const { day, location, callSheet } = input;

  return {
    projectTitle: dash(input.projectTitle),
    productionTitle: dash(input.productionTitle),
    productionType: dash(input.productionType),
    version: input.version,
    statusLabel: dash(input.statusLabel),
    generatedAt: formatGeneratedAt(input.generatedAt),
    dayNumber: dash(day.day_number),
    date: dash(day.date),
    locationName: dash(callSheet?.location || location?.name),
    locationAddress: dash(location?.address),
    mapsLink: dash(callSheet?.maps_link || location?.maps_link),
    parkingNotes: dash(
      callSheet?.parking_notes || day.parking || location?.parking_notes
    ),
    accessNotes: dash(location?.access_notes),
    locationProductionNotes: dash(
      location?.production_notes || day.production_notes
    ),
    schedule: buildSchedule(callSheet, day),
    scenes: buildSceneRows(
      input.scenes,
      day.selected_scene_ids,
      callSheet?.scenes_to_shoot ?? []
    ),
    castCrew: buildCastCrewRows(input.castCrew, callSheet, day),
    transportNotes: dash(callSheet?.transport_notes || day.transport_notes),
    productionNotes: dash(callSheet?.production_notes || day.production_notes),
    emergencyContacts: buildEmergencyContacts(callSheet, day),
  };
}

export async function loadCallSheetPdfData(
  supabase: SupabaseClient,
  params: LoadParams
): Promise<{ data: CallSheetPdfData; filename: string }> {
  const { projectId, callSheetId, shootingDayId } = params;

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

  let callSheet: CallSheet | null = null;
  let day: ShootingDay | null = null;

  if (callSheetId && UUID_RE.test(callSheetId)) {
    const { data: sheetRow, error: sheetError } = await supabase
      .from("call_sheets")
      .select("*")
      .eq("id", callSheetId)
      .eq("project_id", projectId)
      .single();

    if (sheetError || !sheetRow) {
      throw new Error("Call sheet non trovato o accesso negato");
    }

    callSheet = mapCallSheet(sheetRow);

    if (callSheet.shooting_day_id) {
      const { data: dayRow, error: dayError } = await supabase
        .from("shooting_days")
        .select("*")
        .eq("id", callSheet.shooting_day_id)
        .eq("project_id", projectId)
        .single();

      if (!dayError && dayRow) {
        day = mapShootingDay(dayRow);
      }
    }
  }

  if (!day && shootingDayId && UUID_RE.test(shootingDayId)) {
    const { data: dayRow, error: dayError } = await supabase
      .from("shooting_days")
      .select("*")
      .eq("id", shootingDayId)
      .eq("project_id", projectId)
      .single();

    if (dayError || !dayRow) {
      throw new Error("Giornata di ripresa non trovata o accesso negato");
    }

    day = mapShootingDay(dayRow);
  }

  if (!day && callSheet) {
    throw new Error("Giornata di ripresa associata al call sheet non trovata");
  }

  if (!day) {
    throw new Error("Specificare callSheetId o shootingDayId valido");
  }

  const locationId = day.location_id;
  let location: Location | null = null;

  if (locationId && UUID_RE.test(locationId)) {
    const { data: locationRow } = await supabase
      .from("locations")
      .select("*")
      .eq("id", locationId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (locationRow) {
      location = mapLocation(locationRow);
    }
  }

  const [scenesRes, castRes] = await Promise.all([
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
  ]);

  if (scenesRes.error) throw scenesRes.error;
  if (castRes.error) throw castRes.error;

  const scenes = (scenesRes.data ?? []).map(mapScene);
  const castCrew = (castRes.data ?? []).map(mapCastCrew);

  const version = callSheet?.version ?? 1;
  const statusLabel = callSheet
    ? CALL_SHEET_STATUS_LABELS[callSheet.status]
    : CALL_SHEET_STATUS_LABELS.draft;
  const generatedAt = callSheet?.updated_at ?? new Date().toISOString();

  const data = assemblePdfData({
    projectTitle: callSheet?.project_title || project.title,
    productionTitle: callSheet?.production_title || company.name,
    productionType: project.production_type,
    version,
    statusLabel,
    generatedAt,
    day,
    location,
    callSheet,
    scenes,
    castCrew,
  });

  return { data, filename: buildCallSheetFilename(data) };
}
