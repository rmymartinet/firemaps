import type { GeoPerimeter } from "@/domain/models";

export interface EffisPerimeter {
  areaHectares: number;
  country?: string;
  geometry: GeoPerimeter;
  id: string;
  lastUpdatedAt?: string;
  province?: string;
  sourceName: "EFFIS / Union européenne";
  sourceUrl: string;
  startAt?: string;
}

interface GeoJsonFeature {
  geometry?: GeoPerimeter;
  id?: string | number;
  properties?: Record<string, unknown>;
  type?: string;
}

interface GeoJsonFeatureCollection {
  features?: GeoJsonFeature[];
  type?: string;
}

function ringAreaSquareMeters(ring: number[][]): number {
  if (ring.length < 3) return 0;
  const earthRadius = 6_371_000;
  const averageLatitude = ring.reduce((sum, coordinate) => sum + coordinate[1], 0) / ring.length * Math.PI / 180;
  const projected = ring.map(([longitude, latitude]) => ({
    x: earthRadius * longitude * Math.PI / 180 * Math.cos(averageLatitude),
    y: earthRadius * latitude * Math.PI / 180,
  }));
  return Math.abs(projected.reduce((sum, point, index) => {
    const next = projected[(index + 1) % projected.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

function polygonAreaSquareMeters(rings: number[][][]): number {
  if (!rings.length) return 0;
  return Math.max(0, ringAreaSquareMeters(rings[0])
    - rings.slice(1).reduce((sum, ring) => sum + ringAreaSquareMeters(ring), 0));
}

export function geometryAreaHectares(geometry: GeoPerimeter): number {
  const squareMeters = geometry.type === "Polygon"
    ? polygonAreaSquareMeters(geometry.coordinates as number[][][])
    : (geometry.coordinates as number[][][][]).reduce((sum, polygon) => sum + polygonAreaSquareMeters(polygon), 0);
  return squareMeters / 10_000;
}

function property(properties: Record<string, unknown>, candidates: string[]): unknown {
  const normalized = new Map(Object.entries(properties).map(([key, value]) => [key.toLowerCase(), value]));
  return candidates.map((candidate) => normalized.get(candidate.toLowerCase())).find((value) => value !== undefined);
}

function textProperty(properties: Record<string, unknown>, candidates: string[]): string | undefined {
  const value = property(properties, candidates);
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function dateProperty(properties: Record<string, unknown>, candidates: string[]): string | undefined {
  const value = textProperty(properties, candidates);
  if (!value) return undefined;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString();
}

export function normalizeEffisFeatureCollection(payload: unknown): EffisPerimeter[] {
  const collection = payload as GeoJsonFeatureCollection;
  if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features)) return [];
  return collection.features.flatMap((feature, index) => {
    const geometry = feature.geometry;
    if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type) || !Array.isArray(geometry.coordinates)) return [];
    const properties = feature.properties ?? {};
    const declaredArea = Number(property(properties, ["area_ha", "area_ha_1", "area", "area_ha_2", "firesize"]));
    const calculatedArea = geometryAreaHectares(geometry);
    const areaHectares = Number.isFinite(declaredArea) && declaredArea > 0 ? declaredArea : calculatedArea;
    if (!Number.isFinite(areaHectares) || areaHectares <= 0) return [];
    return [{
      areaHectares,
      country: textProperty(properties, ["country", "countryname", "cntr_name", "country_name"]),
      geometry,
      id: String(feature.id ?? textProperty(properties, ["id", "fireid", "fire_id", "gid"]) ?? `effis-${index}`),
      lastUpdatedAt: dateProperty(properties, ["lastupdate", "last_update", "updated", "lastdate"]),
      province: textProperty(properties, ["province", "prov_name", "region", "admin_name"]),
      sourceName: "EFFIS / Union européenne" as const,
      sourceUrl: "https://forest-fire.emergency.copernicus.eu/",
      startAt: dateProperty(properties, ["startdate", "start_date", "firedat", "date"]),
    }];
  });
}

function pointInRing(latitude: number, longitude: number, ring: number[][]): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const intersects = (y > latitude) !== (previousY > latitude)
      && longitude < ((previousX - x) * (latitude - y)) / (previousY - y || Number.EPSILON) + x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(latitude: number, longitude: number, rings: number[][][]): boolean {
  return Boolean(rings[0] && pointInRing(latitude, longitude, rings[0])
    && !rings.slice(1).some((hole) => pointInRing(latitude, longitude, hole)));
}

export function perimeterContains(
  perimeter: EffisPerimeter,
  point: { latitude: number; longitude: number },
): boolean {
  return perimeter.geometry.type === "Polygon"
    ? pointInPolygon(point.latitude, point.longitude, perimeter.geometry.coordinates as number[][][])
    : (perimeter.geometry.coordinates as number[][][][])
      .some((polygon) => pointInPolygon(point.latitude, point.longitude, polygon));
}

export async function fetchEffisPerimetersForFrance(): Promise<EffisPerimeter[]> {
  const parameters = new URLSearchParams({
    bbox: "-5.5,41,10,51.5,EPSG:4326",
    maxFeatures: "1000",
    outputformat: "application/json",
    request: "GetFeature",
    service: "WFS",
    srsname: "EPSG:4326",
    typename: "ms:modis.ba.poly",
    version: "1.1.0",
  });
  const response = await fetch(`https://maps.effis.emergency.copernicus.eu/effis?${parameters}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`EFFIS WFS: HTTP ${response.status}`);
  return normalizeEffisFeatureCollection(await response.json());
}
