import { describe, expect, it } from "vitest";
import {
  applyCommunityVote,
  communityReportStatus,
  mediaKindFromUrl,
  reportExpiry,
  type CommunityReport,
} from "./community-report";

const report: CommunityReport = {
  id: "report-1",
  category: "smoke",
  description: "",
  latitude: 44,
  longitude: -1,
  accuracyMeters: null,
  mediaKind: "none",
  mediaUrl: null,
  capturedAt: "2026-07-26T09:00:00.000Z",
  createdAt: "2026-07-26T09:00:00.000Z",
  expiresAt: "2026-07-26T12:00:00.000Z",
  confirms: 0,
  disputes: 0,
};

describe("community reports", () => {
  it("expire les observations temporaires", () => {
    expect(reportExpiry("flames", new Date("2026-07-26T09:00:00Z"))).toBe("2026-07-26T11:00:00.000Z");
    expect(communityReportStatus(report, new Date("2026-07-26T13:00:00Z").getTime())).toBe("expired");
  });

  it("demande plusieurs confirmations concordantes", () => {
    const beforeExpiry = new Date("2026-07-26T10:00:00Z").getTime();
    expect(communityReportStatus({ ...report, confirms: 3, disputes: 1 }, beforeExpiry)).toBe("supported");
    expect(communityReportStatus({ ...report, confirms: 1, disputes: 2 }, beforeExpiry)).toBe("contested");
  });

  it("remplace le vote précédent", () => {
    expect(applyCommunityVote({ ...report, confirms: 1 }, 1, -1)).toMatchObject({ confirms: 0, disputes: 1 });
  });

  it("reconnaît les plateformes sociales", () => {
    expect(mediaKindFromUrl("https://www.tiktok.com/@a/video/1")).toBe("tiktok");
    expect(mediaKindFromUrl("https://instagram.com/reel/a")).toBe("instagram");
  });
});
