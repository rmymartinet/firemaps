import { describe, expect, it } from "vitest";
import { normalizeCompletionResponse } from "./geoplateforme";

describe("autocomplétion Géoplateforme", () => {
  it("normalise longitude x et latitude y", () => {
    expect(normalizeCompletionResponse({
      status: "OK",
      results: [{ x: 2.3522, y: 48.8566, fulltext: "Paris", city: "Paris", zipcode: "75001" }],
    })[0]).toMatchObject({ label: "Paris", longitude: 2.3522, latitude: 48.8566 });
  });
  it("écarte les coordonnées invalides", () => {
    expect(normalizeCompletionResponse({
      status: "OK",
      results: [{ x: 250, y: 48, fulltext: "Invalide" }],
    })).toEqual([]);
  });
  it("gère une réponse fournisseur incomplète", () => {
    expect(normalizeCompletionResponse({ status: "ERROR" })).toEqual([]);
  });
});
