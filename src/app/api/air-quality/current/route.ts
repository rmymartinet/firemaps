function coordinate(value: string | null, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = coordinate(url.searchParams.get("lat"), -90, 90);
  const longitude = coordinate(url.searchParams.get("lon"), -180, 180);
  if (latitude === null || longitude === null) {
    return Response.json({ message: "Coordonnées invalides." }, { status: 400 });
  }
  const endpoint = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  endpoint.searchParams.set("latitude", String(latitude));
  endpoint.searchParams.set("longitude", String(longitude));
  endpoint.searchParams.set("current", "european_aqi,pm2_5,pm10");
  endpoint.searchParams.set("timezone", "auto");
  try {
    const response = await fetch(endpoint, { next: { revalidate: 900 }, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Air quality ${response.status}`);
    const payload = await response.json() as {
      current?: { european_aqi?: number; interval?: number; pm10?: number; pm2_5?: number; time?: string };
    };
    if (!payload.current) throw new Error("Mesure absente");
    return Response.json({
      ...payload.current,
      latitude,
      longitude,
      model: "CAMS Europe",
      resolutionKm: 11,
      source: "Open-Meteo / Copernicus Atmosphere Monitoring Service",
    }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
  } catch {
    return Response.json({ message: "La qualité de l’air est momentanément indisponible." }, { status: 503 });
  }
}
