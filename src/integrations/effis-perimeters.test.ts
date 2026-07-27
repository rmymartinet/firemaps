import { describe, expect, it } from "vitest";
import { geometryAreaHectares, normalizeEffisFeatureCollection, perimeterContains } from "./effis-perimeters";

const geometry = {
  type: "Polygon" as const,
  coordinates: [[
    [-1, 44],
    [-0.99, 44],
    [-0.99, 44.01],
    [-1, 44.01],
    [-1, 44],
  ]],
};

describe("périmètres EFFIS", () => {
  it("calcule une surface positive à partir de la géométrie", () => {
    expect(geometryAreaHectares(geometry)).toBeGreaterThan(80);
  });

  it("normalise une collection GeoJSON et privilégie la surface déclarée", () => {
    const [perimeter] = normalizeEffisFeatureCollection({
      type: "FeatureCollection",
      features: [{ id: 12, geometry, properties: { AREA_HA: 42, PROVINCE: "Gironde" } }],
    });
    expect(perimeter.areaHectares).toBe(42);
    expect(perimeter.province).toBe("Gironde");
    expect(perimeterContains(perimeter, { latitude: 44.005, longitude: -0.995 })).toBe(true);
    expect(perimeterContains(perimeter, { latitude: 45, longitude: 0 })).toBe(false);
  });
});
