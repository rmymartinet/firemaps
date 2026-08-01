import { detectCoordinatedVoting } from "@/domain/coordinated-voting";
import { auth } from "@/server/auth";
import { requireVerifiedEmail } from "@/server/require-verified-email";
import { invalidateCommunityReports } from "@/server/community-report-cache";
import { prisma } from "@/server/prisma";
import { consumeRateLimit, rateLimitResponse } from "@/server/rate-limit";
import { requestIpHash } from "@/server/request-ip-hash";
import { publishReportEvent } from "@/server/realtime/report-cross-instance-relay";

const COORDINATED_VOTE_WINDOW_MS = 15 * 60_000;  
const COORDINATED_VOTE_MIN_DISTINCT_VOTERS = 3;

/**
 * Signale (sans jamais bloquer) un vote coordonné probable : marque tous les
 * votes non encore signalés sur ce signalement, depuis cette IP, dans la
 * fenêtre. Aucune décision automatique n'est prise au-delà du marquage : la
 * suite (masquage, exclusion du score) exige une revue humaine via une
 * future file de modération.
 */
async function flagCoordinatedVotingIfDetected(reportId: string, voterIpHash: string | null): Promise<void> {
  if (!voterIpHash) return;
  const windowStart = new Date(Date.now() - COORDINATED_VOTE_WINDOW_MS);
  const recentVotes = await prisma.communityVote.findMany({
    select: { voterId: true },
    where: { createdAt: { gte: windowStart }, reportId, voterIpHash },
  });
  const signal = detectCoordinatedVoting({
    minimumDistinctVoters: COORDINATED_VOTE_MIN_DISTINCT_VOTERS,
    recentVotes,
  });
  if (!signal.flagged) return;
  console.warn(
    `Vote coordonné suspecté : ${signal.distinctVoterCount} comptes distincts ont voté sur le signalement ${reportId} `
    + `depuis la même IP en moins de ${COORDINATED_VOTE_WINDOW_MS / 60_000} min.`,
  );
  await prisma.communityVote.updateMany({
    data: { flaggedAt: new Date() },
    where: { createdAt: { gte: windowStart }, flaggedAt: null, reportId, voterIpHash },
  });
}

export async function POST(request: Request, context: RouteContext<"/api/community/reports/[id]/vote">) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ message: "Connectez-vous pour voter." }, { status: 401 });
  const verificationError = requireVerifiedEmail(session);
  if (verificationError) return verificationError;
  const rateLimit = consumeRateLimit("community-vote", session.user.id, 60, 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { value?: number } | null;
  if (body?.value !== 1 && body?.value !== -1) return Response.json({ message: "Vote invalide." }, { status: 400 });

  const report = await prisma.communityReport.findFirst({
    select: { id: true, reporterId: true },
    where: { id, expiresAt: { gt: new Date() }, moderationStatus: { in: ["PENDING", "PUBLISHED"] } },
  });
  if (!report) return Response.json({ message: "Signalement introuvable ou expiré." }, { status: 404 });
  if (report.reporterId === session.user.id) {
    return Response.json({ message: "Vous ne pouvez pas voter sur votre propre signalement." }, { status: 403 });
  }

  const voterIpHash = requestIpHash(request);
  await prisma.communityVote.upsert({
    create: { reportId: id, value: body.value, voterId: session.user.id, voterIpHash },
    update: { value: body.value, voterIpHash },
    where: { reportId_voterId: { reportId: id, voterId: session.user.id } },
  });
  await flagCoordinatedVotingIfDetected(id, voterIpHash);

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
