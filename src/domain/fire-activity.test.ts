import { describe, expect, it } from "vitest";
import type { Incident } from "./models";
import { observedActivityMovement, summarizeFireActivity } from "./fire-activity";

const referenceTime = new Date("2026-07-25T12:00:00Z").getTime();
const incident = (id: string, observedAt: string, radiativePowerMw?: number): Incident => ({
  id, latitude: 44, longitude: -1, title: id, sourceType: "satellite", sourceName: "test",
  confidence: "unverified", status: "unknown", observedAt, updatedAt: observedAt, radiativePowerMw,
});

describe("synthèse d’activité d’une zone", () => {
  it("détecte une hausse récente et additionne les FRP disponibles", () => {
    const summary = summarizeFireActivity([
      incident("old", "2026-07-25T07:00:00Z", 10),
      incident("a", "2026-07-25T10:00:00Z", 20),
      incident("b", "2026-07-25T10:30:00Z", 30),
      incident("c", "2026-07-25T11:00:00Z"),
    ], referenceTime);
    expect(summary.trend).toBe("rising");
    expect(summary.radiativePowerMw).toBe(60);
    expect(summary.recentDetections).toBe(3);
  });

  it("reste prudent lorsque trop peu d’observations sont comparables", () => {
    expect(summarizeFireActivity([
      incident("a", "2026-07-25T11:00:00Z"),
    ], referenceTime).trend).toBe("insufficient");
  });
  it("mesure le déplacement des centres de détection entre deux périodes", () => {
    const movement = observedActivityMovement([
      { ...incident("old-a", "2026-07-25T07:00:00Z"), latitude: 44, longitude: 1 },
      { ...incident("old-b", "2026-07-25T08:00:00Z"), latitude: 44, longitude: 1.01 },
      { ...incident("new-a", "2026-07-25T10:00:00Z"), latitude: 44.02, longitude: 1.02 },
      { ...incident("new-b", "2026-07-25T11:00:00Z"), latitude: 44.02, longitude: 1.03 },
    ], referenceTime);
    expect(movement?.distanceKm).toBeGreaterThan(2);
  });
});
