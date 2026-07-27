import { describe, expect, it } from "vitest";
import { parseBdiffMap } from "./bdiff";

describe("BDIFF", () => {
  it("normalise et filtre les communes visibles", () => {
    const parsed = parseBdiffMap({
      features: [{
        type: "Feature",
        geometry: { type: "Point", coordinates: [-0.5, 44.8] },
        properties: { code_insee: "33001", nom: "Arès", nb_incendies: 2, surface_totale_m2: 35_000 },
      }, {
        type: "Feature",
        geometry: { type: "Point", coordinates: [7, 48] },
        properties: { code_insee: "67001", nom: "Ailleurs", nb_incendies: 1, surface_totale_m2: 1 },
      }],
    }, 2025, { west: -1, east: 0, south: 44, north: 45 });
    expect(parsed).toEqual([expect.objectContaining({
      areaHectares: 3.5,
      communeCode: "33001",
      communeName: "Arès",
      count: 2,
    })]);
  });
});
