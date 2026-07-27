const GRID_COLUMNS = 7;
const GRID_ROWS = 6;

function coordinate(value: string | null, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const south = coordinate(url.searchParams.get("south"), -90, 90);
  const west = coordinate(url.searchParams.get("west"), -180, 180);
  const north = coordinate(url.searchParams.get("north"), -90, 90);
  const east = coordinate(url.searchParams.get("east"), -180, 180);
  if (south === null || west === null || north === null || east === null || south >= north || west >= east) {
    return Response.json({ message: "Emprise invalide." }, { status: 400 });
  }

  const latitudeStep = (north - south) / GRID_ROWS;
  const longitudeStep = (east - west) / GRID_COLUMNS;
  const cells = Array.from({ length: GRID_ROWS * GRID_COLUMNS }, (_, index) => {
    const row = Math.floor(index / GRID_COLUMNS);
    const column = index % GRID_COLUMNS;
    return {
      column,
      east: west + (column + 1) * longitudeStep,
      latitude: south + (row + 0.5) * latitudeStep,
      longitude: west + (column + 0.5) * longitudeStep,
      north: south + (row + 1) * latitudeStep,
      row,
      south: south + row * latitudeStep,
      west: west + column * longitudeStep,
    };
  });

  const endpoint = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  endpoint.searchParams.set("latitude", cells.map((cell) => cell.latitude.toFixed(5)).join(","));
  endpoint.searchParams.set("longitude", cells.map((cell) => cell.longitude.toFixed(5)).join(","));
  endpoint.searchParams.set("current", "european_aqi,pm2_5,pm10");
  endpoint.searchParams.set("timezone", "GMT");

  try {
    const response = await fetch(endpoint, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Air quality ${response.status}`);
    const payload = await response.json() as Array<{
      current?: { european_aqi?: number; pm10?: number; pm2_5?: number; time?: string };
    }>;
    if (!Array.isArray(payload)) throw new Error("Grille absente");
    return Response.json({
      cells: cells.flatMap((cell, index) => {
        const current = payload[index]?.current;
        if (!current || !Number.isFinite(current.european_aqi)) return [];
        return [{
          ...cell,
          aqi: current.european_aqi,
          observedAt: current.time,
          pm10: current.pm10,
          pm2_5: current.pm2_5,
        }];
      }),
      model: "CAMS Europe",
      resolutionKm: 11,
      source: "Open-Meteo / Copernicus Atmosphere Monitoring Service",
    }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
  } catch {
    return Response.json({ message: "La grille de qualité de l’air est indisponible." }, { status: 503 });
  }
}
