import { renderSentinelImage, type SentinelRenderMode } from "@/integrations/copernicus";

export const runtime = "nodejs";

function coordinate(value: string | null, minimum: number, maximum: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = coordinate(url.searchParams.get("lat"), -90, 90);
  const longitude = coordinate(url.searchParams.get("lon"), -180, 180);
  const mode = url.searchParams.get("mode") as SentinelRenderMode;
  const observedAt = url.searchParams.get("observedAt");
  const beforeObservedAt = url.searchParams.get("beforeObservedAt");
  if (
    latitude === null
    || longitude === null
    || !["natural", "fire", "burn"].includes(mode)
    || !observedAt
    || Number.isNaN(new Date(observedAt).getTime())
    || (mode === "burn" && (!beforeObservedAt || Number.isNaN(new Date(beforeObservedAt).getTime())))
    || (mode === "burn" && beforeObservedAt && new Date(beforeObservedAt).getTime() >= new Date(observedAt).getTime())
  ) return Response.json({ message: "Paramètres Sentinel-2 invalides." }, { status: 400 });
  try {
    const response = await renderSentinelImage({
      latitude,
      longitude,
      mode,
      observedAt,
      beforeObservedAt: beforeObservedAt ?? undefined,
    });
    if (!response.ok) {
      return Response.json({ message: "Le rendu Sentinel-2 a échoué." }, { status: response.status });
    }
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    const notConfigured = error instanceof Error && error.message === "COPERNICUS_NOT_CONFIGURED";
    return Response.json(
      { message: notConfigured ? "Sentinel-2 n’est pas encore configuré sur ce serveur." : "Sentinel-2 est temporairement indisponible." },
      { status: notConfigured ? 503 : 502 },
    );
  }
}
