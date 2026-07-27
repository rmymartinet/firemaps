import { fetchEffisPerimetersForFrance } from "@/integrations/effis-perimeters";

export const runtime = "nodejs";

export async function GET() {
  try {
    const perimeters = await fetchEffisPerimetersForFrance();
    return Response.json({
      available: true,
      fetchedAt: new Date().toISOString(),
      perimeters,
    }, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch {
    return Response.json({
      available: false,
      fetchedAt: new Date().toISOString(),
      message: "Les périmètres vectoriels EFFIS sont temporairement indisponibles.",
      perimeters: [],
    }, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
    });
  }
}
