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
  reportCount?: number;
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

export function groupNearbyCommunityReports(
  reports: CommunityReport[],
  maximumDistanceKm = 0.5,
  maximumTimeDifferenceMs = 2 * 3_600_000,
): CommunityReport[] {
  const groups: CommunityReport[][] = [];
  for (const report of reports) {
    if (report.observedZone?.length) {
      groups.push([report]);
      continue;
    }
    const group = groups.find((candidate) => {
      const anchor = candidate[0];
      return !anchor.observedZone?.length
        && anchor.category === report.category
        && Math.abs(new Date(anchor.capturedAt).getTime() - new Date(report.capturedAt).getTime()) <= maximumTimeDifferenceMs
        && distanceKm(anchor, report) <= maximumDistanceKm;
    });
    if (group) group.push(report);
    else groups.push([report]);
  }
  return groups.map((group) => {
    const representative = group.find((report) => report.ownedByViewer) ?? group[0];
    if (group.length === 1) return representative;
    return {
      ...representative,
      confirms: group.reduce((total, report) => total + report.confirms, 0) + group.length - 1,
      disputes: group.reduce((total, report) => total + report.disputes, 0),
      reporterAlias: `${group.length} membres`,
      reportCount: group.length,
    };
  });
}

export function parseCommunityReports(raw: string | null): CommunityReport[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(isCommunityReport);
  } catch {
    return [];
  }
}

export function isCommunityReport(item: unknown): item is CommunityReport {
  if (!item || typeof item !== "object") return false;
  const report = item as Partial<CommunityReport>;
  return typeof report.id === "string"
    && typeof report.latitude === "number"
    && typeof report.longitude === "number"
    && typeof report.createdAt === "string"
    && typeof report.expiresAt === "string"
    && typeof report.confirms === "number"
    && typeof report.disputes === "number";
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
import { distanceKm } from "./distance";
