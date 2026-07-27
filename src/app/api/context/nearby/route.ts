type OverpassElement = {
  center?: { lat?: number; lon?: number };
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  type: string;
};

const categoryByTag: Record<string, string> = {
  "amenity=fire_station": "Centre de secours",
  "amenity=fuel": "Station-service",
  "amenity=hospital": "Hôpital",
  "amenity=nursing_home": "Établissement médico-social",
  "amenity=school": "École",
  "tourism=camp_site": "Camping",
};
const overpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function coordinate(value: string | null, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = coordinate(url.searchParams.get("lat"), -90, 90);
  const longitude = coordinate(url.searchParams.get("lon"), -180, 180);
  if (latitude === null || longitude === null) {
    return Response.json({ message: "Coordonnées invalides." }, { status: 400 });
  }
  const radius = 15_000;
  const query = `[out:json][timeout:12];(
nwr["amenity"~"^(hospital|school|nursing_home|fuel|fire_station)$"](around:${radius},${latitude},${longitude});
nwr["tourism"="camp_site"](around:${radius},${latitude},${longitude});
);out center tags 60;`;
  try {
    let payload: { elements?: OverpassElement[] } | null = null;
    const failures: number[] = [];
    for (const endpoint of overpassEndpoints) {
      try {
        const response = await fetch(endpoint, {
          body: new URLSearchParams({ data: query }),
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": "Sentinel-FireMap/0.1 (public-safety-map)",
          },
          method: "POST",
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
          failures.push(response.status);
          continue;
        }
        payload = await response.json() as { elements?: OverpassElement[] };
        break;
      } catch {
        failures.push(0);
      }
    }
    if (!payload) throw new Error(`Overpass indisponible (${failures.join(",")})`);
    const places = (payload.elements ?? []).flatMap((element) => {
      const itemLatitude = element.lat ?? element.center?.lat;
      const itemLongitude = element.lon ?? element.center?.lon;
      if (!Number.isFinite(itemLatitude) || !Number.isFinite(itemLongitude)) return [];
      const tag = element.tags?.amenity ? `amenity=${element.tags.amenity}` : `tourism=${element.tags?.tourism}`;
      return [{
        category: categoryByTag[tag] ?? "Lieu sensible",
        distanceKm: distanceKm(
          { latitude, longitude },
          { latitude: itemLatitude!, longitude: itemLongitude! },
        ),
        id: `${element.type}-${element.id}`,
        latitude: itemLatitude!,
        longitude: itemLongitude!,
        name: element.tags?.name || categoryByTag[tag] || "Lieu sans nom",
      }];
    }).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 30);
    return Response.json({
      fetchedAt: new Date().toISOString(),
      places,
      radiusKm: radius / 1000,
      source: "OpenStreetMap contributors / Overpass API",
    }, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } });
  } catch (error) {
    return Response.json({
      message: "Les lieux proches sont momentanément indisponibles.",
      reason: error instanceof Error ? error.message : "Erreur Overpass",
    }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
