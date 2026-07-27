import { fetchFirmsForFrance, type FirmsResult } from "@/integrations/firms";

export const runtime = "nodejs";

const successfulResults = new Map<number, { expiresAt: number; result: FirmsResult }>();
const pendingRequests = new Map<number, Promise<FirmsResult>>();
let latestSuccessfulResult: FirmsResult | null = null;

async function loadFirms(mapKey: string, dayRange: number): Promise<FirmsResult> {
  const cached = successfulResults.get(dayRange);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const pending = pendingRequests.get(dayRange);
  if (pending) return pending;

  const request = fetchFirmsForFrance(mapKey, dayRange).finally(() => {
    pendingRequests.delete(dayRange);
  });
  pendingRequests.set(dayRange, request);
  const result = await request;
  if (result.successfulSources.length > 0) {
    successfulResults.set(dayRange, { expiresAt: Date.now() + 5 * 60_000, result });
    latestSuccessfulResult = result;
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
    const requestedDays = Number(new URL(request.url).searchParams.get("days") ?? 1);
    const dayRange = Number.isFinite(requestedDays) ? Math.min(8, Math.max(1, Math.round(requestedDays))) : 1;
    const result = await loadFirms(mapKey, dayRange);
    const fallback = result.successfulSources.length === 0 ? latestSuccessfulResult : null;
    const responseResult = fallback ?? result;
    const status = responseResult.successfulSources.length > 0 ? 200 : 502;
    return Response.json(responseResult, {
      status,
      headers: {
        "Cache-Control": status === 200
          ? "public, s-maxage=300, stale-while-revalidate=600"
          : "no-store",
        ...(fallback ? { "X-Firemaps-Fallback": "stale-firms" } : {}),
      },
    });
  } catch {
    if (latestSuccessfulResult) {
      return Response.json(latestSuccessfulResult, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
          "X-Firemaps-Fallback": "stale-firms",
        },
      });
    }
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
