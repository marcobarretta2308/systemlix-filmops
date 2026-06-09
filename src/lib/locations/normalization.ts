import { normalizeSceneKey } from "@/lib/ai/script-breakdown-pro";
import type { Location } from "@/lib/types";

export type LocationTypeCode =
  | "interior"
  | "exterior"
  | "mixed"
  | "vehicle"
  | "unknown";
export type LocationStatus =
  | "scouting"
  | "confirmed"
  | "permit_pending"
  | "ready"
  | "suggestion"
  | "archived";

export type ParsedLocationParts = {
  canonical_name: string;
  sub_location: string;
  display_name: string;
  warnings: string[];
};

const MAIN_SUB_SEPARATORS = /\s*[-–—|/]\s*/;

const GENERIC_ENGLISH_PATTERNS: RegExp[] = [
  /^inside\s+/i,
  /^interior\s+of\s+/i,
  /street\s+in\s+the/i,
  /^the\s+street$/i,
  /^house$/i,
  /^office$/i,
  /^kitchen$/i,
  /^bedroom$/i,
];

const ENGLISH_TO_ITALIAN_HINTS: Array<{ pattern: RegExp; replace: (m: RegExpMatchArray) => string }> = [
  {
    pattern: /^inside\s+(.+?)['']s\s+black\s+car$/i,
    replace: (m) => `Auto nera di ${titleCase(m[1])}`,
  },
  {
    pattern: /^inside\s+(.+?)['']s\s+car$/i,
    replace: (m) => `Auto di ${titleCase(m[1])}`,
  },
  {
    pattern: /^street\s+in\s+the\s+neighborhood$/i,
    replace: () => "Strada del quartiere",
  },
  {
    pattern: /^abandoned\s+warehouse$/i,
    replace: () => "Magazzino abbandonato",
  },
  {
    pattern: /^old\s+station$/i,
    replace: () => "Vecchia stazione",
  },
  {
    pattern: /^ghost\s+train\s+carriage$/i,
    replace: () => "Carrozza del treno fantasma",
  },
  {
    pattern: /^train\s+carriage$/i,
    replace: () => "Carrozza del treno",
  },
];

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function capitalizeFirst(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function normalizeLocationKey(name: string): string {
  return normalizeSceneKey(
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s']/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function fixGenericEnglishLocationName(raw: string): {
  name: string;
  wasTranslated: boolean;
} {
  const trimmed = raw.trim();
  for (const hint of ENGLISH_TO_ITALIAN_HINTS) {
    const match = trimmed.match(hint.pattern);
    if (match) {
      return { name: hint.replace(match), wasTranslated: true };
    }
  }
  return { name: trimmed, wasTranslated: false };
}

export function detectGenericEnglishLocation(name: string): boolean {
  return GENERIC_ENGLISH_PATTERNS.some((re) => re.test(name.trim()));
}

export function parseMainSubLocation(rawName: string): ParsedLocationParts {
  const warnings: string[] = [];
  let name = rawName.trim();
  if (!name) {
    return {
      canonical_name: "",
      sub_location: "",
      display_name: "",
      warnings: ["Nome location vuoto"],
    };
  }

  const fixed = fixGenericEnglishLocationName(name);
  if (fixed.wasTranslated) {
    name = fixed.name;
    warnings.push(`Nome normalizzato da inglese generico: "${rawName}" → "${name}"`);
  }

  if (detectGenericEnglishLocation(name)) {
    warnings.push("Location generica in inglese — verificare e correggere");
  }

  const dellaMatch = name.match(
    /^(binari|atrio|ingresso|corridoio|sala|piano|interno)\s+(?:della|del|dell[''])\s+(.+)$/i
  );
  if (dellaMatch) {
    const sub = capitalizeFirst(dellaMatch[1]);
    const canonical = capitalizeFirst(dellaMatch[2]);
    return {
      canonical_name: canonical,
      sub_location: sub,
      display_name: `${canonical} — ${sub}`,
      warnings,
    };
  }

  const parts = name.split(MAIN_SUB_SEPARATORS).map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const canonical = capitalizeFirst(parts[0]);
    const sub = capitalizeFirst(parts.slice(1).join(" - "));
    return {
      canonical_name: canonical,
      sub_location: sub,
      display_name: `${canonical} — ${sub}`,
      warnings,
    };
  }

  const single = capitalizeFirst(name);
  return {
    canonical_name: single,
    sub_location: "",
    display_name: single,
    warnings,
  };
}

export function findSimilarExistingLocation(
  canonicalName: string,
  subLocation: string,
  existing: Location[]
): Location | null {
  const key = normalizeLocationKey(canonicalName);
  if (!key) return null;

  for (const loc of existing) {
    const existingCanonical = loc.canonical_name || loc.name;
    if (normalizeLocationKey(existingCanonical) === key) {
      return loc;
    }
  }

  if (subLocation) {
    const subKey = normalizeLocationKey(subLocation);
    for (const loc of existing) {
      const locSub = loc.sub_location ?? "";
      const locCanonical = loc.canonical_name || loc.name;
      if (
        normalizeLocationKey(locSub) === subKey ||
        normalizeLocationKey(locCanonical) === subKey
      ) {
        return loc;
      }
    }
  }

  return null;
}

export function intExtToLocationType(intExt: string): LocationTypeCode {
  const raw = intExt.toUpperCase();
  if (raw.includes("INT/EXT") || raw.includes("I/E")) return "mixed";
  if (raw.startsWith("EXT") || raw === "ESTERNO") return "exterior";
  if (raw.startsWith("INT") || raw === "INTERNO") return "interior";
  return "unknown";
}

const VEHICLE_KEYWORDS =
  /\b(auto|car|veicolo|vehicle|furgone|van|camion|moto|motorcycle|bus)\b/i;

const MIXED_VENUE_KEYWORDS =
  /\b(stazione|station|tunnel|sottopasso|underpass|centro commerciale|mall|ospedale|hotel)\b/i;

export function inferLocationType(
  canonical: string,
  sub: string,
  intExt: string
): LocationTypeCode {
  const combined = `${canonical} ${sub}`.toLowerCase();

  if (VEHICLE_KEYWORDS.test(combined) || /^auto\b/i.test(canonical)) {
    return "vehicle";
  }

  const fromIntExt = intExtToLocationType(intExt);
  if (fromIntExt !== "unknown") {
    if (MIXED_VENUE_KEYWORDS.test(combined) && fromIntExt === "interior") {
      return "mixed";
    }
    return fromIntExt;
  }

  if (MIXED_VENUE_KEYWORDS.test(combined)) return "mixed";
  if (VEHICLE_KEYWORDS.test(combined)) return "vehicle";

  return "unknown";
}

export type LocationMetadata = {
  sub_locations?: Array<{
    name: string;
    scenes: string[];
    day_night?: string[];
    warnings?: string[];
  }>;
  day_night_usage?: string[];
  warnings?: string[];
  linked_scene_numbers?: string[];
};

export function buildDisplayName(
  canonical: string,
  sub?: string | null
): string {
  if (!sub?.trim()) return canonical;
  return `${canonical} — ${sub}`;
}
