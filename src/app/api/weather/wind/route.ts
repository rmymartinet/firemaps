import { fetchCurrentWind } from "@/integrations/open-meteo";

export const runtime = "nodejs";

export async function GET() {
  try {
    const observations = await fetchCurrentWind();
    if (observations.length === 0) throw new Error("Aucune observation normalisée");
    return Response.json(
      { observations, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } },
    );
  } catch {
    return Response.json(
      { observations: [], fetchedAt: null, message: "Les données de vent sont temporairement indisponibles." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
