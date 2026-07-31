import {
  fetchFirmsForArea,
  normalizeFirmsDayRange,
  serializeFirmsArea,
  type FirmsArea,
  type FirmsResult,
} from "@/integrations/firms";

export const runtime = "nodejs";

const successfulResults = new Map<string, { expiresAt: number; result: FirmsResult }>();
const pendingRequests = new Map<string, Promise<FirmsResult>>();
const latestSuccessfulResults = new Map<string, FirmsResult>();

async function loadFirms(mapKey: string, dayRange: number, area: FirmsArea): Promise<FirmsResult> {
  const cacheKey = `${dayRange}:${serializeFirmsArea(area)}`;
  const cached = successfulResults.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const request = fetchFirmsForArea(mapKey, area, dayRange).finally(() => {
    pendingRequests.delete(cacheKey);
  });
  pendingRequests.set(cacheKey, request);
  const result = await request;
  if (result.successfulSources.length > 0) {
    successfulResults.set(cacheKey, { expiresAt: Date.now() + 5 * 60_000, result });
    latestSuccessfulResults.set(cacheKey, result);
    if (successfulResults.size > 100) {
      const oldestKey = successfulResults.keys().next().value;
      if (oldestKey) {
        successfulResults.delete(oldestKey);
        latestSuccessfulResults.delete(oldestKey);
      }
    }
  }
  return result;
}

export async function GET(request: Request) {
  const mapKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!mapKey) {
    return Response.json(
      {
        code: "FIRMS_NOT_CONFIGURED",
        message: "La source NASA FIRMS n’est pas configurée.",
        incidents: [],
        fetchedAt: null,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const parameters = new URL(request.url).searchParams;
    const requestedDays = Number(parameters.get("days") ?? 1);
    const dayRange = Number.isFinite(requestedDays) ? normalizeFirmsDayRange(requestedDays) : 1;
    const zoom = Number(parameters.get("zoom"));
    if (Number.isFinite(zoom) && zoom <= 3) {
      return Response.json({
        incidents: [],
        fetchedAt: new Date().toISOString(),
        successfulSources: [],
        failedSources: [],
        zoomRequired: true,
        message: "Rapprochez la carte pour charger les détections de cette région.",
      }, {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=60" },
      });
    }
    const area: FirmsArea = {
      west: Number(parameters.get("west")),
      south: Number(parameters.get("south")),
      east: Number(parameters.get("east")),
      north: Number(parameters.get("north")),
    };
    if (!Number.isFinite(area.west) || !Number.isFinite(area.south) || !Number.isFinite(area.east) || !Number.isFinite(area.north)
      || area.west < -180 || area.east > 180 || area.south < -90 || area.north > 90
      || area.west >= area.east || area.south >= area.north) {
      return Response.json({ code: "INVALID_AREA", message: "Zone cartographique invalide.", incidents: [], fetchedAt: null }, { status: 400 });
    }
    const cacheKey = `${dayRange}:${serializeFirmsArea(area)}`;
    const result = await loadFirms(mapKey, dayRange, area);
    const fallback = result.successfulSources.length === 0 ? latestSuccessfulResults.get(cacheKey) ?? null : null;
    const responseResult = fallback ?? result;
    const status = responseResult.successfulSources.length > 0 ? 200 : 502;
    return Response.json(responseResult, {
      status,
      headers: {
        "Cache-Control": status === 200
          ? "public, s-maxage=300, stale-while-revalidate=1800"
          : "no-store",
        ...(fallback ? { "X-Firemaps-Fallback": "stale-firms" } : {}),
      },
    });
  } catch {
    return Response.json(
      {
        code: "FIRMS_UNAVAILABLE",
        message: "NASA FIRMS est temporairement indisponible.",
        incidents: [],
        fetchedAt: null,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
