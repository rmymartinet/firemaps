import { Prisma } from "@/generated/prisma/client";
import { mediaKindFromUrl, type CommunityMediaKind } from "@/domain/community-report";
import { auth } from "@/server/auth";
import { invalidateCommunityReports } from "@/server/community-report-cache";
import { prisma } from "@/server/prisma";
import { consumeRateLimit, rateLimitResponse } from "@/server/rate-limit";
import { verifyR2Object } from "@/server/r2";

const mediaTypeMap: Record<Exclude<CommunityMediaKind, "none">, "PHOTO" | "VIDEO" | "TIKTOK" | "INSTAGRAM" | "EXTERNAL_VIDEO"> = {
  instagram: "INSTAGRAM",
  photo: "PHOTO",
  tiktok: "TIKTOK",
  video: "VIDEO",
  "video-link": "EXTERNAL_VIDEO",
};

type EnrichmentInput = {
  accuracyMeters?: number | null;
  capturedAt?: string;
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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ message: "Connectez-vous pour modifier ce signalement." }, { status: 401 });
  const rateLimit = consumeRateLimit("community-edit", session.user.id, 30, 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);
  const { id } = await context.params;
  const existing = await prisma.communityReport.findFirst({ select: { id: true }, where: { id, reporterId: session.user.id } });
  if (!existing) return Response.json({ message: "Signalement introuvable." }, { status: 404 });
  const body = await request.json().catch(() => null) as EnrichmentInput | null;
  if (!body) return Response.json({ message: "Informations invalides." }, { status: 400 });

  const capturedAt = new Date(body.capturedAt ?? "");
  if (!Number.isFinite(capturedAt.getTime()) || capturedAt.getTime() > Date.now() + 300_000) {
    return Response.json({ message: "Date d’observation invalide." }, { status: 400 });
  }
  if (!Number.isFinite(body.latitude) || Number(body.latitude) < -90 || Number(body.latitude) > 90
    || !Number.isFinite(body.longitude) || Number(body.longitude) < -180 || Number(body.longitude) > 180) {
    return Response.json({ message: "Position invalide." }, { status: 400 });
  }
  const directionDegrees = body.directionDegrees == null ? null : Math.round(body.directionDegrees);
  if (directionDegrees !== null && (directionDegrees < 0 || directionDegrees >= 360 || !body.directionType)) {
    return Response.json({ message: "Direction invalide." }, { status: 400 });
  }
  const zone = body.observedZone?.filter((point) =>
    Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && point.latitude >= -90 && point.latitude <= 90 && point.longitude >= -180 && point.longitude <= 180) ?? null;
  if (zone && (zone.length < 2 || zone.length > 30)) {
    return Response.json({ message: "La géométrie doit contenir entre 2 et 30 points." }, { status: 400 });
  }

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

  await prisma.communityReport.update({
    data: {
      accuracyMeters: body.accuracyMeters == null ? null : Math.max(0, Math.round(body.accuracyMeters)),
      capturedAt,
      description: (body.description ?? "").trim().slice(0, 500),
      directionDegrees,
      directionType: directionDegrees === null ? null : body.directionType,
      latitude: body.latitude!,
      longitude: body.longitude!,
      media: mediaCreate ? { create: mediaCreate } : undefined,
      observedZone: zone ?? Prisma.JsonNull,
    },
    where: { id },
  });
  invalidateCommunityReports();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ message: "Connectez-vous pour supprimer ce signalement." }, { status: 401 });
  const rateLimit = consumeRateLimit("community-delete", session.user.id, 10, 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);
  const { id } = await context.params;
  const deleted = await prisma.communityReport.deleteMany({ where: { id, reporterId: session.user.id } });
  if (deleted.count === 0) return Response.json({ message: "Signalement introuvable ou non autorisé." }, { status: 404 });
  invalidateCommunityReports();
  return new Response(null, { status: 204 });
}
