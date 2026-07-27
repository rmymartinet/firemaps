export interface BdiffHistoricalPlace {
  areaHectares: number;
  communeCode: string;
  communeName: string;
  count: number;
  latitude: number;
  longitude: number;
  year: number;
}

type HistoryFeature = {
  geometry?: { coordinates?: unknown; type?: string };
  properties?: {
    code_insee?: unknown;
    nb_incendies?: unknown;
    nom?: unknown;
    surface_totale_m2?: unknown;
  };
  type?: string;
};

export function parseBdiffMap(
  payload: unknown,
  year: number,
  bounds: { east: number; north: number; south: number; west: number },
): BdiffHistoricalPlace[] {
  if (!payload || typeof payload !== "object") return [];
  const features = (payload as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];
  return (features as HistoryFeature[]).flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates;
    const properties = feature.properties;
    if (
      feature.type !== "Feature"
      || feature.geometry?.type !== "Point"
      || !Array.isArray(coordinates)
      || !properties
    ) return [];
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);
    const count = Number(properties.nb_incendies);
    const areaSquareMeters = Number(properties.surface_totale_m2);
    if (
      !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < bounds.south || latitude > bounds.north
      || longitude < bounds.west || longitude > bounds.east
      || !Number.isFinite(count) || count < 1
      || typeof properties.code_insee !== "string"
      || typeof properties.nom !== "string"
    ) return [];
    return [{
      areaHectares: Number.isFinite(areaSquareMeters) ? areaSquareMeters / 10_000 : 0,
      communeCode: properties.code_insee,
      communeName: properties.nom,
      count,
      latitude,
      longitude,
      year,
    }];
  });
}
