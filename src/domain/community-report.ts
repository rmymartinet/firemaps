export const COMMUNITY_REPORTS_KEY = "sentinel.community-reports.v1";
export const COMMUNITY_VOTES_KEY = "sentinel.community-votes.v1";

export type CommunityCategory = "flames" | "smoke" | "road" | "response" | "evacuation" | "other";
export type CommunityMediaKind = "photo" | "video" | "tiktok" | "instagram" | "video-link" | "none";
export type CommunityReportStatus = "new" | "supported" | "contested" | "expired";

export interface CommunityReport {
  id: string;
  category: CommunityCategory;
  description: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  directionType?: "smoke" | "spread" | null;
  directionDegrees?: number | null;
  observedZone?: Array<{ latitude: number; longitude: number }> | null;
  mediaKind: CommunityMediaKind;
  mediaUrl: string | null;
  capturedAt: string;
  createdAt: string;
  expiresAt: string;
  confirms: number;
  disputes: number;
  ownedByViewer?: boolean;
  reporterAlias?: string;
  storedLocally?: boolean;
}

const categoryLifetimeHours: Record<CommunityCategory, number> = {
  flames: 2,
  smoke: 3,
  road: 6,
  response: 4,
  evacuation: 2,
  other: 3,
};

export function reportExpiry(category: CommunityCategory, createdAt: Date): string {
  return new Date(createdAt.getTime() + categoryLifetimeHours[category] * 3_600_000).toISOString();
}

export function communityReportStatus(report: CommunityReport, referenceTime = Date.now()): CommunityReportStatus {
  if (new Date(report.expiresAt).getTime() <= referenceTime) return "expired";
  const total = report.confirms + report.disputes;
  if (report.disputes >= 2 && report.disputes > report.confirms) return "contested";
  if (report.confirms >= 3 && report.confirms / Math.max(1, total) >= 0.67) return "supported";
  return "new";
}

export function parseCommunityReports(raw: string | null): CommunityReport[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is CommunityReport =>
      typeof item?.id === "string"
      && typeof item?.latitude === "number"
      && typeof item?.longitude === "number"
      && typeof item?.createdAt === "string"
      && typeof item?.expiresAt === "string"
      && typeof item?.confirms === "number"
      && typeof item?.disputes === "number");
  } catch {
    return [];
  }
}

export function mediaKindFromUrl(url: string): CommunityMediaKind {
  if (!url) return "none";
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) return "tiktok";
    if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) return "instagram";
    return "video-link";
  } catch {
    return "none";
  }
}

export function applyCommunityVote(
  report: CommunityReport,
  previousVote: -1 | 0 | 1,
  nextVote: -1 | 1,
): CommunityReport {
  const confirms = report.confirms - (previousVote === 1 ? 1 : 0) + (nextVote === 1 ? 1 : 0);
  const disputes = report.disputes - (previousVote === -1 ? 1 : 0) + (nextVote === -1 ? 1 : 0);
  return { ...report, confirms: Math.max(0, confirms), disputes: Math.max(0, disputes) };
}
