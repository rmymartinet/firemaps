import { describe, expect, it } from "vitest";
import { parseOfficialNotices } from "./official-notice";

const notice = {
  category: "road-closure",
  content: "La route est fermée.",
  id: "notice-1",
  instructions: ["Évitez le secteur."],
  latitude: 44.5,
  longitude: -1.1,
  locationLabel: "D218",
  publishedAt: "2026-07-26T10:00:00Z",
  severity: "warning",
  sourceName: "Préfecture",
  sourceUrl: "https://example.gouv.fr/communique",
  title: "Route fermée",
  verifiedAt: "2026-07-26T10:05:00Z",
};

describe("informations officielles", () => {
  it("valide une information traçable", () => {
    expect(parseOfficialNotices([notice], new Date("2026-07-26T12:00:00Z").getTime())).toHaveLength(1);
  });

  it("refuse une source non sécurisée et une information expirée", () => {
    expect(parseOfficialNotices([{ ...notice, sourceUrl: "http://example.com" }])).toEqual([]);
    expect(parseOfficialNotices([{ ...notice, expiresAt: "2026-07-26T11:00:00Z" }], new Date("2026-07-26T12:00:00Z").getTime())).toEqual([]);
  });
});
