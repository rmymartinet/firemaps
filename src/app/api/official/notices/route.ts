import { officialNotices } from "@/data/official-notices";
import { parseOfficialNotices } from "@/domain/official-notice";

export function GET() {
  return Response.json({
    fetchedAt: new Date().toISOString(),
    notices: parseOfficialNotices(officialNotices),
    sourceStatus: officialNotices.length ? "verified-feed" : "awaiting-editorial-source",
  }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
