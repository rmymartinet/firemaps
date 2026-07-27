import { findSentinelScenes } from "@/integrations/copernicus";

export const runtime = "nodejs";

function coordinate(value: string | null, minimum: number, maximum: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = coordinate(url.searchParams.get("lat"), -90, 90);
  const longitude = coordinate(url.searchParams.get("lon"), -180, 180);
  if (latitude === null || longitude === null) {
    return Response.json({ scenes: [], message: "Coordonnées invalides." }, { status: 400 });
  }
  try {
    const scenes = await findSentinelScenes(latitude, longitude);
    return Response.json(
      { scenes },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return Response.json({ scenes: [], message: "Le catalogue Sentinel-2 est temporairement indisponible." }, { status: 502 });
  }
}
