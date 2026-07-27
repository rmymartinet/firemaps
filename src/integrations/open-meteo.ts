export interface WindObservation {
  id: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  directionFromDegrees: number;
  gustKmh: number;
  observedAt: string;
  sourceName: string;
  sourceUrl: string;
}

interface OpenMeteoLocation {
  latitude?: number;
  longitude?: number;
  current?: {
    time?: string;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
}

const WIND_GRID = [
  [42.5, -4], [42.5, -0.5], [42.5, 3], [42.5, 6.5], [42.5, 9],
  [45, -4], [45, -0.5], [45, 3], [45, 6.5], [45, 9],
  [47.5, -4], [47.5, -0.5], [47.5, 3], [47.5, 6.5], [47.5, 9],
  [50, -4], [50, -0.5], [50, 3], [50, 6.5], [50, 9],
] as const;

export function normalizeWindResponse(payload: OpenMeteoLocation | OpenMeteoLocation[]): WindObservation[] {
  const locations = Array.isArray(payload) ? payload : [payload];
  return locations.flatMap((location, index) => {
    const current = location.current;
    if (
      !Number.isFinite(location.latitude)
      || !Number.isFinite(location.longitude)
      || !current?.time
      || !Number.isFinite(current.wind_speed_10m)
      || !Number.isFinite(current.wind_direction_10m)
    ) return [];
    return [{
      id: `wind-${index}-${location.latitude}-${location.longitude}`,
      latitude: location.latitude!,
      longitude: location.longitude!,
      speedKmh: current.wind_speed_10m!,
      directionFromDegrees: current.wind_direction_10m!,
      gustKmh: Number.isFinite(current.wind_gusts_10m) ? current.wind_gusts_10m! : current.wind_speed_10m!,
      observedAt: `${current.time}:00Z`,
      sourceName: "Open-Meteo · modèles Météo-France AROME/ARPEGE",
      sourceUrl: "https://open-meteo.com/en/docs/meteofrance-api",
    }];
  });
}

export async function fetchCurrentWind(): Promise<WindObservation[]> {
  const parameters = new URLSearchParams({
    latitude: WIND_GRID.map(([latitude]) => latitude).join(","),
    longitude: WIND_GRID.map(([, longitude]) => longitude).join(","),
    current: "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    wind_speed_unit: "kmh",
    timezone: "GMT",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/meteofrance?${parameters}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Open-Meteo: HTTP ${response.status}`);
  return normalizeWindResponse(await response.json());
}
