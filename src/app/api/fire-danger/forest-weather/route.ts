import { gunzipSync } from "node:zlib";
import { parseLatestForestWeather } from "@/integrations/forest-weather";
import type { FeatureCollection, Geometry } from "geojson";

const CURRENT_YEAR_CSV =
  `https://meteofrance.s3.sbg.io.cloud.ovh.net/data/BULLETIN/MDF/mdf_${new Date().getUTCFullYear()}.csv.gz`;
const DEPARTMENTS_GEOJSON =
  "https://static.data.gouv.fr/resources/archive-meteo-des-forets/20251218-123448/departements.geojson";

export async function GET() {
  try {
    const response = await fetch(CURRENT_YEAR_CSV, {
      headers: { Accept: "application/gzip" },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Météo-France a répondu ${response.status}`);
    const [csvBuffer, geometryResponse] = await Promise.all([
      response.arrayBuffer(),
      fetch(DEPARTMENTS_GEOJSON, {
        next: { revalidate: 604_800 },
        signal: AbortSignal.timeout(8_000),
      }),
    ]);
    if (!geometryResponse.ok) throw new Error(`Contours départementaux : ${geometryResponse.status}`);
    const csv = gunzipSync(Buffer.from(csvBuffer)).toString("utf8");
    const latest = parseLatestForestWeather(csv);
    if (!latest.publishedAt || latest.departments.length === 0) throw new Error("Publication absente");
    const geometry = await geometryResponse.json() as FeatureCollection<
      Geometry,
      { code?: string; nom?: string }
    >;
    const levelsByCode = new Map(latest.departments.map((department) => [department.code, department]));
    const zones = {
      type: "FeatureCollection" as const,
      features: geometry.features.flatMap((feature) => {
        const department = levelsByCode.get(feature.properties.code ?? "");
        return department ? [{ ...feature, properties: department }] : [];
      }),
    };
    return Response.json({
      ...latest,
      zones,
      source: "Météo-France — Archives de la Météo des forêts",
    }, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch {
    return Response.json(
      { message: "La Météo des forêts est momentanément indisponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
