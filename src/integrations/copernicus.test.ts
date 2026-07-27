import { describe, expect, it } from "vitest";
import { areaBounds, normalizeScenes, selectBurnComparison } from "./copernicus";

describe("Copernicus Sentinel-2", () => {
  it("construit une emprise ordonnée autour du lieu", () => {
    const [west, south, east, north] = areaBounds(44.84, -0.58);
    expect(west).toBeLessThan(-0.58);
    expect(east).toBeGreaterThan(-0.58);
    expect(south).toBeLessThan(44.84);
    expect(north).toBeGreaterThan(44.84);
  });

  it("normalise et trie les acquisitions STAC", () => {
    expect(normalizeScenes({
      features: [
        { id: "older", properties: { datetime: "2026-07-20T10:00:00Z", "eo:cloud_cover": 12 } },
        { id: "newer", properties: { datetime: "2026-07-24T10:00:00Z", "eo:cloud_cover": 35 } },
        { properties: {} },
      ],
    })).toEqual([
      { id: "newer", observedAt: "2026-07-24T10:00:00Z", cloudCoverPercent: 35 },
      { id: "older", observedAt: "2026-07-20T10:00:00Z", cloudCoverPercent: 12 },
    ]);
  });

  it("normalise le catalogue OData de repli", () => {
    expect(normalizeScenes({
      value: [{
        Id: "scene",
        ContentDate: { Start: "2026-07-21T10:56:21Z" },
        Attributes: [{ Name: "cloudCover", Value: 0.34 }],
      }],
    })).toEqual([{ id: "scene", observedAt: "2026-07-21T10:56:21Z", cloudCoverPercent: 0.34 }]);
  });

  it("sélectionne des images claires avant et après un événement", () => {
    expect(selectBurnComparison([
      { id: "cloudy", observedAt: "2026-07-20T10:00:00Z", cloudCoverPercent: 90 },
      { id: "before", observedAt: "2026-07-24T10:00:00Z", cloudCoverPercent: 12 },
      { id: "after", observedAt: "2026-07-27T10:00:00Z", cloudCoverPercent: 8 },
    ], "2026-07-25T12:00:00Z")).toEqual({
      before: { id: "before", observedAt: "2026-07-24T10:00:00Z", cloudCoverPercent: 12 },
      after: { id: "after", observedAt: "2026-07-27T10:00:00Z", cloudCoverPercent: 8 },
      status: "ready",
    });
  });

  it("indique qu’il faut attendre l’image après l’événement", () => {
    expect(selectBurnComparison([
      { id: "before", observedAt: "2026-07-24T10:00:00Z", cloudCoverPercent: 12 },
    ], "2026-07-25T12:00:00Z").status).toBe("waiting-after");
  });
});
