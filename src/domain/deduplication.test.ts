import { describe, expect, it } from "vitest";
import type { Incident } from "./models";
import { deduplicateSatelliteIncidents } from "./deduplication";

const incident = (id: string, latitude: number, observedAt: string, sourceName: string, frp: number): Incident => ({
  id, latitude, longitude: 2, title: id, sourceType: "satellite", sourceName,
  confidence: "unverified", status: "unknown", observedAt, updatedAt: observedAt, radiativePowerMw: frp,
});

describe("déduplication satellite", () => {
  it("fusionne les observations proches dans le temps et l’espace sans additionner la FRP", () => {
    const result = deduplicateSatelliteIncidents([
      incident("a", 44, "2026-07-25T10:00:00Z", "SNPP", 20),
      incident("b", 44.003, "2026-07-25T10:08:00Z", "NOAA-20", 35),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].radiativePowerMw).toBe(35);
    expect(result[0].mergedDetectionCount).toBe(2);
    expect(result[0].sensorNames).toEqual(["SNPP", "NOAA-20"]);
  });

  it("conserve les observations éloignées dans le temps", () => {
    expect(deduplicateSatelliteIncidents([
      incident("a", 44, "2026-07-25T10:00:00Z", "SNPP", 20),
      incident("b", 44, "2026-07-25T11:00:00Z", "NOAA-20", 35),
    ])).toHaveLength(2);
  });
});
