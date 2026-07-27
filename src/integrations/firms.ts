import type { Confidence, Incident } from "@/domain/models";

export const FIRMS_SOURCES = [
  "VIIRS_SNPP_NRT",
  "VIIRS_NOAA20_NRT",
  "VIIRS_NOAA21_NRT",
] as const;

export type FirmsSource = (typeof FIRMS_SOURCES)[number];

export interface FirmsResult {
  incidents: Incident[];
  fetchedAt: string;
  successfulSources: FirmsSource[];
  failedSources: FirmsSource[];
}

export interface FirmsArea {
  east: number;
  north: number;
  south: number;
  west: number;
}

export function serializeFirmsArea(area: FirmsArea): string {
  return [area.west, area.south, area.east, area.north]
    .map((coordinate) => Number(coordinate.toFixed(4)))
    .join(",");
}

interface FirmsRow {
  latitude: string;
  longitude: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  confidence: string;
  frp?: string;
  daynight?: string;
  type?: string;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

export function parseFirmsCsv(csv: string): FirmsRow[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as unknown as FirmsRow;
  });
}

function toObservedAt(date: string, time: string): string {
  const paddedTime = time.padStart(4, "0");
  const hours = paddedTime.slice(0, 2);
  const minutes = paddedTime.slice(2, 4);
  return new Date(`${date}T${hours}:${minutes}:00Z`).toISOString();
}

function normalizeConfidence(value: string): Confidence {
  const normalized = value.toLowerCase();
  if (normalized === "h" || normalized === "high" || Number(value) >= 80) return "probable";
  return "unverified";
}

export function normalizeFirmsRows(rows: FirmsRow[], source: FirmsSource, ingestedAt: string): Incident[] {
  return rows.flatMap((row) => {
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    if (row.type && row.type !== "0") return [];
    const observedAt = toObservedAt(row.acq_date, row.acq_time);
    const sensor = `${row.instrument || "VIIRS"} ${row.satellite}`.trim();
    return [{
      id: `firms-${source}-${latitude}-${longitude}-${observedAt}`,
      title: "Détection thermique satellite",
      description: `Anomalie thermique détectée par ${sensor}${row.daynight ? ` de ${row.daynight.toUpperCase() === "N" ? "nuit" : "jour"}` : ""}. Elle ne confirme pas à elle seule un incendie.${row.frp ? ` Puissance radiative mesurée : ${row.frp} MW.` : ""}`,
      latitude,
      longitude,
      sourceType: "satellite" as const,
      sourceName: `NASA FIRMS — ${sensor}`,
      sourceUrl: "https://firms.modaps.eosdis.nasa.gov/",
      confidence: normalizeConfidence(row.confidence),
      status: "unknown" as const,
      radiativePowerMw: row.frp && Number.isFinite(Number(row.frp)) ? Number(row.frp) : undefined,
      observedAt,
      updatedAt: observedAt,
      ingestedAt,
    }];
  });
}

export async function fetchFirmsForArea(mapKey: string, area: FirmsArea, dayRange = 1): Promise<FirmsResult> {
  const fetchedAt = new Date().toISOString();
  const serializedArea = serializeFirmsArea(area);
  const safeDayRange = Math.min(10, Math.max(1, Math.round(dayRange)));
  const results = await Promise.allSettled(
    FIRMS_SOURCES.map(async (source) => {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/${source}/${serializedArea}/${safeDayRange}`;
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error(`FIRMS ${source}: HTTP ${response.status}`);
      const csv = await response.text();
      if (csv.trimStart().startsWith("<")) throw new Error(`FIRMS ${source}: réponse inattendue`);
      return { source, incidents: normalizeFirmsRows(parseFirmsCsv(csv), source, fetchedAt) };
    }),
  );

  const incidents: Incident[] = [];
  const successfulSources: FirmsSource[] = [];
  const failedSources: FirmsSource[] = [];
  results.forEach((result, index) => {
    const source = FIRMS_SOURCES[index];
    if (result.status === "fulfilled") {
      successfulSources.push(source);
      incidents.push(...result.value.incidents);
    } else {
      failedSources.push(source);
    }
  });
  return { incidents, fetchedAt, successfulSources, failedSources };
}
