import type {
  CommunityCategory,
  CommunityReport,
} from "@/domain/community-report";

const reverseCategory: Record<string, CommunityCategory> = {
  EVACUATION: "evacuation",
  FLAMES: "flames",
  OTHER: "other",
  RESPONSE: "response",
  ROAD: "road",
  SMOKE: "smoke",
};

export type CommunityReportRecord = {
  accuracyMeters: number | null;
  capturedAt: Date | string;
  category: string;
  createdAt: Date | string;
  description: string;
  directionDegrees: number | null;
  directionType: string | null;
  expiresAt: Date | string;
  id: string;
  latitude: number | { toString(): string };
  longitude: number | { toString(): string };
  observedZone: unknown;
  reporterId: string | null;
  media: Array<{ type: string; url: string }>;
  votes: Array<{ value: number }>;
};

export function serializeCommunityReport(
  report: CommunityReportRecord,
  viewerId?: string,
): CommunityReport {
  const iso = (value: Date | string) => typeof value === "string" ? value : value.toISOString();
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
    capturedAt: iso(report.capturedAt),
    category: reverseCategory[report.category],
    confirms,
    createdAt: iso(report.createdAt),
    description: report.description,
    directionDegrees: report.directionDegrees,
    directionType: report.directionType === "smoke" || report.directionType === "spread" ? report.directionType : null,
    disputes,
    expiresAt: iso(report.expiresAt),
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

