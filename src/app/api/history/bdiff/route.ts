import { parseBdiffMap } from "@/integrations/bdiff";

const FIRST_YEAR = 2006;

function numberParameter(url: URL, name: string): number | null {
  const value = Number(url.searchParams.get(name));
  return Number.isFinite(value) ? value : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = numberParameter(url, "year");
  const latitude = numberParameter(url, "lat");
  const longitude = numberParameter(url, "lon");
  const zoom = numberParameter(url, "zoom");
  const lastYear = new Date().getUTCFullYear() - 1;
  if (
    year === null || year < FIRST_YEAR || year > lastYear
    || latitude === null || Math.abs(latitude) > 90
    || longitude === null || Math.abs(longitude) > 180
    || zoom === null || zoom < 8 || zoom > 18
  ) {
    return Response.json({ message: "Année, position ou zoom invalide." }, { status: 400 });
  }

  const longitudeSpan = Math.min(3, 720 / 2 ** zoom);
  const latitudeSpan = longitudeSpan * 0.72;
  const bounds = {
    east: longitude + longitudeSpan,
    north: latitude + latitudeSpan,
    south: latitude - latitudeSpan,
    west: longitude - longitudeSpan,
  };
  const endpoint = new URL("https://feuxdeforet.fr/api/historique/v1/map");
  endpoint.searchParams.set("date_from", `${year}-01-01`);
  endpoint.searchParams.set("date_to", `${year}-12-31`);

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "Sentinel-FireMap/0.1 (historical-view)" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Historique ${response.status}`);
    const places = parseBdiffMap(await response.json(), year, bounds);
    return Response.json({
      places,
      total: places.reduce((sum, place) => sum + place.count, 0),
      source: "Feux de Forêt — réutilisation BDIFF et sources officielles",
      year,
    }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return Response.json({ message: "L’historique BDIFF est momentanément indisponible." }, { status: 503 });
  }
}
