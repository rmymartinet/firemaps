import { fetchFirmsForFrance } from "@/integrations/firms";

export const runtime = "nodejs";

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
    const result = await fetchFirmsForFrance(mapKey, dayRange);
    const status = result.successfulSources.length > 0 ? 200 : 502;
    return Response.json(result, {
      status,
      headers: {
        "Cache-Control": status === 200
          ? "public, s-maxage=300, stale-while-revalidate=600"
          : "no-store",
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
