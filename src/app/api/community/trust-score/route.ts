import { computeCommunityTrustScore } from "@/domain/community-trust";
import { auth } from "@/server/auth";
import { prisma } from "@/server/prisma";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ message: "Connectez-vous pour consulter votre score de confiance." }, { status: 401 });

  const [reportsByStatus, votesByValue] = await Promise.all([
    prisma.communityReport.groupBy({
      _count: true,
      by: ["moderationStatus"],
      where: { reporterId: session.user.id },
    }),
    prisma.communityVote.groupBy({
      _count: true,
      by: ["value"],
      where: { report: { reporterId: session.user.id } },
    }),
  ]);

  const publishedReports = reportsByStatus.find((row) => row.moderationStatus === "PUBLISHED")?._count ?? 0;
  const rejectedOrHiddenReports = reportsByStatus
    .filter((row) => row.moderationStatus === "HIDDEN" || row.moderationStatus === "REJECTED")
    .reduce((sum, row) => sum + row._count, 0);
  const totalConfirms = votesByValue.find((row) => row.value === 1)?._count ?? 0;
  const totalDisputes = votesByValue.find((row) => row.value === -1)?._count ?? 0;
  const accountAgeDays = Math.max(0, Math.floor(
    (Date.now() - new Date(session.user.createdAt).getTime()) / 86_400_000,
  ));

  const trust = computeCommunityTrustScore({
    accountAgeDays,
    emailVerified: session.user.emailVerified,
    publishedReports,
    rejectedOrHiddenReports,
    totalConfirms,
    totalDisputes,
  });

  return Response.json(trust, { headers: { "Cache-Control": "no-store" } });
}
