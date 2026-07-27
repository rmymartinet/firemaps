import { createHmac } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { distanceKm } from "@/domain/distance";
import {
  groupNearbyCommunityReports,
  mediaKindFromUrl,
  reportExpiry,
  type CommunityCategory,
  type CommunityMediaKind,
  type CommunityReport,
} from "@/domain/community-report";
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
const USER_REPORT_LIMIT_PER_HOUR = 5;
const USER_REPORT_LIMIT_PER_DAY = 15;
const IP_REPORT_LIMIT_PER_HOUR = 20;
const IP_REPORT_LIMIT_PER_DAY = 60;
const OWN_DUPLICATE_RADIUS_KM = 0.5;
const OWN_DUPLICATE_WINDOW_MS = 2 * 3_600_000;

class ReportProtectionError extends Error {
  constructor(
    message: string,
    readonly status: 409 | 429,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

function requestIpHash(request: Request): string | null {
  const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim();
  const secret = process.env.COMMUNITY_RATE_LIMIT_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!rawIp || !secret) return null;
  return createHmac("sha256", secret).update(rawIp).digest("hex");
}

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
}, viewerId?: string): CommunityReport {
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
    directionType: report.directionType === "smoke" || report.directionType === "spread" ? report.directionType : null,
    disputes,
    expiresAt: report.expiresAt.toISOString(),
    id: report.id,
    latitude: Number(report.latitude),
    longitude: Number(report.longitude),
    mediaKind,
    mediaUrl: media?.url ?? null,
    observedZone: report.observedZone as CommunityReport["observedZone"],
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
  const reportsPayload = groupNearbyCommunityReports(
    reports.map((report) => serializeReport(report, session?.user?.id)),
  );
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
  const category = body.category;
  const databaseCategory = categoryMap[category];
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
  const ipHash = requestIpHash(request);
  let report;
  try {
    report = await prisma.$transaction(async (transaction) => {
      const hourStart = new Date(now.getTime() - 3_600_000);
      const dayStart = new Date(now.getTime() - 24 * 3_600_000);
      const [userHourCount, userDayCount, ipHourCount, ipDayCount] = await Promise.all([
        transaction.communityReport.count({ where: { createdAt: { gte: hourStart }, reporterId: session.user.id } }),
        transaction.communityReport.count({ where: { createdAt: { gte: dayStart }, reporterId: session.user.id } }),
        ipHash ? transaction.communityReport.count({ where: { createdAt: { gte: hourStart }, reporterIpHash: ipHash } }) : Promise.resolve(0),
        ipHash ? transaction.communityReport.count({ where: { createdAt: { gte: dayStart }, reporterIpHash: ipHash } }) : Promise.resolve(0),
      ]);
      if (userHourCount >= USER_REPORT_LIMIT_PER_HOUR) {
        throw new ReportProtectionError("Vous avez atteint la limite de 5 signalements par heure.", 429, 3_600);
      }
      if (userDayCount >= USER_REPORT_LIMIT_PER_DAY) {
        throw new ReportProtectionError("Vous avez atteint la limite de 15 signalements par jour.", 429, 86_400);
      }
      if (ipHourCount >= IP_REPORT_LIMIT_PER_HOUR || ipDayCount >= IP_REPORT_LIMIT_PER_DAY) {
        throw new ReportProtectionError("Trop de signalements ont été envoyés depuis cette connexion. Réessayez plus tard.", 429, 3_600);
      }

      if (!zone?.length) {
        const latitudeDelta = OWN_DUPLICATE_RADIUS_KM / 111;
        const longitudeDelta = OWN_DUPLICATE_RADIUS_KM
          / Math.max(20, 111 * Math.cos(Number(body.latitude) * Math.PI / 180));
        const candidates = await transaction.communityReport.findMany({
          select: { latitude: true, longitude: true },
          where: {
            capturedAt: { gte: new Date(capturedAt.getTime() - OWN_DUPLICATE_WINDOW_MS) },
            category: databaseCategory,
            expiresAt: { gt: now },
            latitude: { gte: Number(body.latitude) - latitudeDelta, lte: Number(body.latitude) + latitudeDelta },
            longitude: { gte: Number(body.longitude) - longitudeDelta, lte: Number(body.longitude) + longitudeDelta },
            moderationStatus: { in: ["PENDING", "PUBLISHED"] },
            observedZone: { equals: Prisma.JsonNull },
            reporterId: session.user.id,
          },
        });
        if (candidates.some((candidate) => distanceKm(
          { latitude: Number(body.latitude), longitude: Number(body.longitude) },
          { latitude: Number(candidate.latitude), longitude: Number(candidate.longitude) },
        ) <= OWN_DUPLICATE_RADIUS_KM)) {
          throw new ReportProtectionError("Vous avez déjà publié une observation similaire à proximité.", 409);
        }
      }

      return transaction.communityReport.create({
        data: {
          accuracyMeters: body.accuracyMeters == null ? null : Math.max(0, Math.round(body.accuracyMeters)),
          capturedAt,
          category: databaseCategory,
          description: (body.description ?? "").trim().slice(0, 500),
          directionDegrees,
          directionType: directionDegrees === null ? null : body.directionType,
          expiresAt: new Date(reportExpiry(category, now)),
          latitude: body.latitude!,
          longitude: body.longitude!,
          media: mediaCreate ? { create: mediaCreate } : undefined,
          observedZone: zone ?? undefined,
          reporterId: session.user.id,
          reporterIpHash: ipHash,
        },
        include: { media: true, votes: { select: { value: true } } },
      });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof ReportProtectionError) {
      return Response.json(
        { code: error.status === 429 ? "REPORT_RATE_LIMIT" : "DUPLICATE_REPORT", message: error.message },
        {
          status: error.status,
          headers: error.retryAfter ? { "Retry-After": String(error.retryAfter) } : undefined,
        },
      );
    }
    throw error;
  }
  return Response.json({ report: serializeReport(report, session.user.id) }, { status: 201 });
}
