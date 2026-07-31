import { describe, expect, it } from "vitest";
import { serializeCommunityReport } from "./community-report-dto";

const record = {
  accuracyMeters: 12,
  capturedAt: new Date("2026-07-29T10:00:00.000Z"),
  category: "SMOKE",
  createdAt: new Date("2026-07-29T10:01:00.000Z"),
  description: "Fumée visible",
  directionDegrees: 90,
  directionType: "smoke",
  expiresAt: new Date("2026-07-29T13:00:00.000Z"),
  id: "7dd18174-4d2e-4e64-9058-f6de275460b4",
  latitude: { toString: () => "44.840000" },
  longitude: { toString: () => "-0.580000" },
  media: [{ type: "PHOTO", url: "https://media.example/report.png" }],
  observedZone: null,
  reporterId: "user-1234",
  votes: [{ value: 1 }, { value: 1 }, { value: -1 }],
};

describe("serializeCommunityReport", () => {
  it("produit le même DTO JSON pour REST et le temps réel", () => {
    expect(serializeCommunityReport(record, "user-1234")).toMatchObject({
      capturedAt: "2026-07-29T10:00:00.000Z",
      category: "smoke",
      confirms: 2,
      disputes: 1,
      latitude: 44.84,
      longitude: -0.58,
      mediaKind: "photo",
      ownedByViewer: true,
    });
  });

  it("ne marque pas comme propriétaire le DTO public diffusé à tous", () => {
    expect(serializeCommunityReport(record).ownedByViewer).toBe(false);
  });
});

