import { NextResponse } from "next/server";
import { fetchLatestMtgIncidents, MtgConfigurationError } from "@/integrations/eumetsat";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await fetchLatestMtgIncidents();
    return NextResponse.json({
      ...result,
      fetchedAt: new Date().toISOString(),
      source: "EUMETSAT / LSA SAF · MTG-FRP",
      demo: true,
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300" } });
  } catch (error) {
    const configuration = error instanceof MtgConfigurationError;
    return NextResponse.json({
      message: error instanceof Error ? error.message : "La couche MTG-FRP est indisponible.",
      code: configuration ? "MTG_CONFIGURATION_REQUIRED" : "MTG_UPSTREAM_ERROR",
    }, { status: configuration ? 503 : 502 });
  }
}
