import type { Prisma } from "@/generated/prisma/client";
import { mediaKindFromUrl, reportExpiry, type CommunityCategory, type CommunityMediaKind } from "@/domain/community-report";
import { auth } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { verifyR2Object } from "@/server/r2";

const categoryMap = {
  evacuation: "EVACUATION",
  flames: "FLAMES",
  other: "OTHER",
  response: "RESPONSE",
  road: "ROAD",
  smoke: "SMOKE",
} as const;
const reverseCategory = Object.fromEntries(Object.entries(categoryMap).map(([key, value]) => [value, key])) as Record<string, CommunityCategory>;
const mediaTypeMap: Record<Exclude<CommunityMediaKind, "none">, "PHOTO" | "VIDEO" | "TIKTOK" | "INSTAGRAM" | "EXTERNAL_VIDEO"> = {
  instagram: "INSTAGRAM",
  photo: "PHOTO",
  tiktok: "TIKTOK",
  video: "VIDEO",
  "video-link": "EXTERNAL_VIDEO",
};

type ReportInput = {
  accuracyMeters?: number | null;
  capturedAt?: string;
  category?: CommunityCategory;
  description?: string;
  directionDegrees?: number | null;
  directionType?: "smoke" | "spread" | null;
  latitude?: number;
  longitude?: number;
  media?: {
    contentType?: string;
    key?: string;
    kind?: CommunityMediaKind;
    sizeBytes?: number;
    url?: string;
  } | null;
  observedZone?: Array<{ latitude: number; longitude: number }> | null;
};

function serializeReport(report: Awaited<ReturnType<typeof prisma.communityReport.findMany>>[number] & {
  media: Array<{ type: string; url: string }>;
  votes: Array<{ value: number }>;
}, viewerId?: string) {
  const confirms = report.votes.filter((vote) => vote.value === 1).length;
  const disputes = report.votes.filter((vote) => vote.value === -1).length;
  const media = report.media[0];
  const mediaKind = media?.type === "PHOTO" ? "photo"
    : media?.type === "VIDEO" ? "video"
    : media?.type === "TIKTOK" ? "tiktok"
    : media?.type === "INSTAGRAM" ? "instagram"
    : media ? "video-link" : "none";
  const reporterAlias = report.reporterId
    ? `Membre ${report.reporterId.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase().padStart(4, "0")}`
    : "Membre";
  return {
    accuracyMeters: report.accuracyMeters,
    capturedAt: report.capturedAt.toISOString(),
    category: reverseCategory[report.category],
    confirms,
    createdAt: report.createdAt.toISOString(),
    description: report.description,
    directionDegrees: report.directionDegrees,
    directionType: report.directionType,
    disputes,
    expiresAt: report.expiresAt.toISOString(),
    id: report.id,
    latitude: Number(report.latitude),
    longitude: Number(report.longitude),
    mediaKind,
    mediaUrl: media?.url ?? null,
    observedZone: report.observedZone,
    ownedByViewer: Boolean(viewerId && report.reporterId === viewerId),
    reporterAlias,
  };
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
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
  const reportsPayload = reports.map((report) => serializeReport(report, session?.user?.id));
  const viewerVotes = session?.user
    ? Object.fromEntries(reports.flatMap((report) => {
        const vote = report.votes.find((item) => item.voterId === session.user.id);
        return vote ? [[report.id, vote.value]] : [];
      }))
    : {};
  return Response.json({ reports: reportsPayload, viewerVotes }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ message: "Connectez-vous pour publier un signalement." }, { status: 401 });
  const body = await request.json().catch(() => null) as ReportInput | null;
  if (!body?.category || !(body.category in categoryMap)) return Response.json({ message: "Catégorie invalide." }, { status: 400 });
  if (!Number.isFinite(body.latitude) || Number(body.latitude) < -90 || Number(body.latitude) > 90
    || !Number.isFinite(body.longitude) || Number(body.longitude) < -180 || Number(body.longitude) > 180) {
    return Response.json({ message: "Position invalide." }, { status: 400 });
  }
  const capturedAt = new Date(body.capturedAt ?? "");
  if (!Number.isFinite(capturedAt.getTime()) || capturedAt.getTime() > Date.now() + 300_000) {
    return Response.json({ message: "Date d’observation invalide." }, { status: 400 });
  }
  const directionDegrees = body.directionDegrees == null ? null : Math.round(body.directionDegrees);
  if (directionDegrees !== null && (directionDegrees < 0 || directionDegrees >= 360 || !body.directionType)) {
    return Response.json({ message: "Direction invalide." }, { status: 400 });
  }
  const zone = body.observedZone?.filter((point) =>
    Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && point.latitude >= -90 && point.latitude <= 90 && point.longitude >= -180 && point.longitude <= 180) ?? null;
  if (zone && (zone.length < 2 || zone.length > 30)) return Response.json({ message: "La géométrie doit contenir entre 2 et 30 points." }, { status: 400 });

  let mediaCreate: Prisma.CommunityMediaCreateWithoutReportInput | undefined;
  if (body.media?.url && body.media.kind && body.media.kind !== "none") {
    if ((body.media.kind === "photo" || body.media.kind === "video") && body.media.key) {
      const object = await verifyR2Object(body.media.key);
      if (!object.ContentLength || object.ContentLength !== body.media.sizeBytes) {
        return Response.json({ message: "Le média envoyé est incomplet." }, { status: 400 });
      }
      mediaCreate = {
        mimeType: body.media.contentType,
        sizeBytes: body.media.sizeBytes,
        status: "READY",
        storageKey: body.media.key,
        type: mediaTypeMap[body.media.kind],
        url: body.media.url,
      };
    } else {
      const kind = mediaKindFromUrl(body.media.url);
      if (kind === "none") return Response.json({ message: "Lien média invalide." }, { status: 400 });
      mediaCreate = { status: "READY", type: mediaTypeMap[kind], url: body.media.url };
    }
  }

  const now = new Date();
  const report = await prisma.communityReport.create({
    data: {
      accuracyMeters: body.accuracyMeters == null ? null : Math.max(0, Math.round(body.accuracyMeters)),
      capturedAt,
      category: categoryMap[body.category],
      description: (body.description ?? "").trim().slice(0, 500),
      directionDegrees,
      directionType: directionDegrees === null ? null : body.directionType,
      expiresAt: new Date(reportExpiry(body.category, now)),
      latitude: body.latitude!,
      longitude: body.longitude!,
      media: mediaCreate ? { create: mediaCreate } : undefined,
      observedZone: zone ?? undefined,
      reporterId: session.user.id,
    },
    include: { media: true, votes: { select: { value: true } } },
  });
  return Response.json({ report: serializeReport(report, session.user.id) }, { status: 201 });
}
