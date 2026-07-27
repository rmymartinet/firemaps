import { describe, expect, it } from "vitest";
import type { Incident } from "./models";
import { scoreFireEvent } from "./fire-event-confidence";

const referenceTime = new Date("2026-07-26T12:00:00Z").getTime();

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    confidence: "probable",
    description: "Test",
    id: crypto.randomUUID(),
    latitude: 44,
    longitude: -1,
    observedAt: "2026-07-26T11:00:00Z",
    sourceName: "NASA FIRMS — VIIRS NOAA-20",
    sourceType: "satellite",
    status: "unknown",
    title: "Détection thermique",
    updatedAt: "2026-07-26T11:00:00Z",
    ...overrides,
  };
}

describe("scoreFireEvent", () => {
  it("reste faible pour un signal isolé", () => {
    expect(scoreFireEvent([incident()], referenceTime).level).toBe("low");
  });

  it("augmente avec plusieurs plateformes, périodes et un périmètre", () => {
    const incidents = [
      incident({ id: "a", sourceName: "NASA FIRMS — VIIRS NOAA-20", radiativePowerMw: 20 }),
      incident({ id: "b", sourceName: "NASA FIRMS — VIIRS NOAA-21" }),
      incident({ id: "c", sourceName: "NASA FIRMS — VIIRS SNPP" }),
      incident({ id: "d", observedAt: "2026-07-26T08:00:00Z" }),
      incident({ id: "e", observedAt: "2026-07-26T08:10:00Z" }),
      incident({ id: "f", observedAt: "2026-07-26T08:20:00Z" }),
    ];
    const result = scoreFireEvent(incidents, referenceTime, true);
    expect(result.level).toBe("high");
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.reasons).toContain("Périmètre de zone brûlée associé.");
  });
});
