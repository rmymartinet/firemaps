import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/server/prisma";

export const COMMUNITY_REPORTS_CACHE_TAG = "community-reports";

export const getCachedCommunityReports = unstable_cache(
  async () => {
    const reports = await prisma.communityReport.findMany({
      include: {
        media: { where: { status: "READY" }, orderBy: { createdAt: "desc" }, take: 1 },
        votes: { select: { value: true, voterId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
      where: {
        expiresAt: { gt: new Date() },
        moderationStatus: { in: ["PENDING", "PUBLISHED"] },
      },
    });
    return reports.map((report) => ({
      ...report,
      capturedAt: report.capturedAt.toISOString(),
      createdAt: report.createdAt.toISOString(),
      expiresAt: report.expiresAt.toISOString(),
      latitude: Number(report.latitude),
      longitude: Number(report.longitude),
      updatedAt: report.updatedAt.toISOString(),
    }));
  },
  ["community-reports-v1"],
  { revalidate: 20, tags: [COMMUNITY_REPORTS_CACHE_TAG] },
);

export function invalidateCommunityReports() {
  revalidateTag(COMMUNITY_REPORTS_CACHE_TAG, { expire: 0 });
}
