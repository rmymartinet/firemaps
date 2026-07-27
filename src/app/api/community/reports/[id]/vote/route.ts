import { auth } from "@/server/auth";
import { prisma } from "@/server/prisma";

export async function POST(request: Request, context: RouteContext<"/api/community/reports/[id]/vote">) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ message: "Connectez-vous pour voter." }, { status: 401 });
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
  return Response.json({
    confirms: grouped.find((item) => item.value === 1)?._count ?? 0,
    disputes: grouped.find((item) => item.value === -1)?._count ?? 0,
    vote: body.value,
  });
}
