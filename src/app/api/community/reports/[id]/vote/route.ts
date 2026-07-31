import { auth } from "@/server/auth";
import { invalidateCommunityReports } from "@/server/community-report-cache";
import { prisma } from "@/server/prisma";
import { consumeRateLimit, rateLimitResponse } from "@/server/rate-limit";
import { publishReportEvent } from "@/server/realtime/report-cross-instance-relay";

export async function POST(request: Request, context: RouteContext<"/api/community/reports/[id]/vote">) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ message: "Connectez-vous pour voter." }, { status: 401 });
  const rateLimit = consumeRateLimit("community-vote", session.user.id, 60, 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { value?: number } | null;
  if (body?.value !== 1 && body?.value !== -1) return Response.json({ message: "Vote invalide." }, { status: 400 });

  const report = await prisma.communityReport.findFirst({
    select: { id: true },
    where: { id, expiresAt: { gt: new Date() }, moderationStatus: { in: ["PENDING", "PUBLISHED"] } },
  });
  if (!report) return Response.json({ message: "Signalement introuvable ou expiré." }, { status: 404 });

  await prisma.communityVote.upsert({
    create: { reportId: id, value: body.value, voterId: session.user.id },
    update: { value: body.value },
    where: { reportId_voterId: { reportId: id, voterId: session.user.id } },
  });

  const grouped = await prisma.communityVote.groupBy({
    _count: true,
    by: ["value"],
    where: { reportId: id },
  });
  invalidateCommunityReports();
  const confirms = grouped.find((item) => item.value === 1)?._count ?? 0;
  const disputes = grouped.find((item) => item.value === -1)?._count ?? 0;
  publishReportEvent({
    data: { confirms, disputes, score: confirms - disputes },
    reportId: id,
    type: "report.vote-updated",
  });
  return Response.json({
    confirms,
    disputes,
    vote: body.value,
  });
}
