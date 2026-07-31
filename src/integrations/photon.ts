import type { GeocodingSuggestion } from "./geoplateforme";

interface PhotonProperties {
  osm_id?: number;
  osm_type?: string;
  type?: string;
  name?: string;
  housenumber?: string;
  street?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  district?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface PhotonFeature {
  geometry?: {
    coordinates?: unknown[];
  };
  properties?: PhotonProperties;
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

function uniqueParts(parts: Array<string | undefined>) {
  return parts.filter((part, index, values): part is string => (
    Boolean(part?.trim()) && values.findIndex((value) => value?.trim() === part?.trim()) === index
  ));
}

export function normalizePhotonResponse(payload: PhotonResponse): GeocodingSuggestion[] {
  if (!Array.isArray(payload.features)) return [];

  return payload.features.flatMap((feature, index) => {
    const coordinates = feature.geometry?.coordinates;
    const longitude = coordinates?.[0];
    const latitude = coordinates?.[1];
    const properties = feature.properties ?? {};

    if (
      typeof longitude !== "number"
      || typeof latitude !== "number"
      || !Number.isFinite(longitude)
      || !Number.isFinite(latitude)
      || longitude < -180
      || longitude > 180
      || latitude < -90
      || latitude > 90
    ) return [];

    const locality = properties.city ?? properties.town ?? properties.village ?? properties.district;
    const street = properties.street
      ? `${properties.housenumber ? `${properties.housenumber} ` : ""}${properties.street}`
      : undefined;
    const label = uniqueParts([
      properties.name,
      street,
      properties.postcode,
      locality,
      properties.state,
      properties.country,
    ]).join(", ");

    if (!label) return [];

    return [{
      id: `photon-${properties.osm_type ?? "place"}-${properties.osm_id ?? index}`,
      label,
      city: locality,
      postcode: properties.postcode,
      latitude,
      longitude,
      kind: properties.type,
    }];
  });
}

export async function autocompleteWorldwide(
  query: string,
  acceptLanguage?: string | null,
): Promise<GeocodingSuggestion[]> {
  const parameters = new URLSearchParams({ q: query, limit: "6" });
  const response = await fetch(`https://photon.komoot.io/api/?${parameters}`, {
    cache: "no-store",
    headers: acceptLanguage ? { "Accept-Language": acceptLanguage } : undefined,
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) throw new Error(`Photon: HTTP ${response.status}`);
  return normalizePhotonResponse(await response.json());
}
