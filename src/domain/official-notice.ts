export type OfficialNoticeCategory =
  | "fire-status"
  | "evacuation"
  | "confinement"
  | "road-closure"
  | "forest-closure"
  | "shelter"
  | "information";

export type OfficialNoticeSeverity = "information" | "warning" | "danger";

export interface OfficialNotice {
  category: OfficialNoticeCategory;
  content: string;
  expiresAt?: string;
  id: string;
  instructions: string[];
  latitude: number;
  longitude: number;
  locationLabel: string;
  publishedAt: string;
  severity: OfficialNoticeSeverity;
  sourceName: string;
  sourceUrl: string;
  title: string;
  verifiedAt: string;
}

const categories = new Set<OfficialNoticeCategory>([
  "fire-status", "evacuation", "confinement", "road-closure",
  "forest-closure", "shelter", "information",
]);
const severities = new Set<OfficialNoticeSeverity>(["information", "warning", "danger"]);

export function parseOfficialNotices(payload: unknown, now = Date.now()): OfficialNotice[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const notice = value as Partial<OfficialNotice>;
    if (
      typeof notice.id !== "string"
      || typeof notice.title !== "string"
      || typeof notice.content !== "string"
      || typeof notice.locationLabel !== "string"
      || typeof notice.sourceName !== "string"
      || typeof notice.sourceUrl !== "string"
      || !categories.has(notice.category as OfficialNoticeCategory)
      || !severities.has(notice.severity as OfficialNoticeSeverity)
      || !Number.isFinite(notice.latitude)
      || !Number.isFinite(notice.longitude)
      || Math.abs(notice.latitude!) > 90
      || Math.abs(notice.longitude!) > 180
      || !notice.publishedAt
      || Number.isNaN(new Date(notice.publishedAt).getTime())
      || !notice.verifiedAt
      || Number.isNaN(new Date(notice.verifiedAt).getTime())
      || !/^https:\/\//.test(notice.sourceUrl)
    ) return [];
    if (notice.expiresAt && (Number.isNaN(new Date(notice.expiresAt).getTime()) || new Date(notice.expiresAt).getTime() <= now)) return [];
    return [{
      ...notice,
      instructions: Array.isArray(notice.instructions)
        ? notice.instructions.filter((instruction): instruction is string => typeof instruction === "string" && instruction.trim().length > 0)
        : [],
    } as OfficialNotice];
  });
}
