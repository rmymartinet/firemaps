import { describe, expect, it } from "vitest";
import type { Incident } from "./models";
import { clusterDenseIncidents, clusterIncidents, distanceKm } from "./clustering";

const incident = (id: string, latitude: number, longitude: number): Incident => ({
  id, latitude, longitude, title: id, sourceType: "satellite", sourceName: "test",
  confidence: "unverified", status: "unknown", observedAt: "2026-07-25T10:00:00Z",
  updatedAt: "2026-07-25T10:00:00Z",
});

describe("regroupement cartographique", () => {
  it("calcule une distance plausible", () => {
    expect(distanceKm(incident("a", 48.8566, 2.3522), incident("b", 48.8566, 2.4522))).toBeGreaterThan(7);
  });
  it("regroupe les détections proches", () => {
    expect(clusterIncidents([incident("a", 43, 5), incident("b", 43.01, 5.01)], 5)).toHaveLength(1);
  });
  it("conserve les détections éloignées", () => {
    expect(clusterIncidents([incident("a", 43, 5), incident("b", 45, 5)], 5)).toHaveLength(2);
  });
  it("ne crée une zone dense qu’avec au moins trois voisins cohérents", () => {
    const points = [
      incident("a", 43, 5),
      incident("b", 43.005, 5.005),
      incident("c", 43.008, 5.004),
      incident("isolated", 45, 5),
    ];
    const clusters = clusterDenseIncidents(points, 2, 3);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].incidents.map((item) => item.id).sort()).toEqual(["a", "b", "c"]);
  });
});
