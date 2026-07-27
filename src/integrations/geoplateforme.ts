export interface GeocodingSuggestion {
  id: string;
  label: string;
  city?: string;
  postcode?: string;
  latitude: number;
  longitude: number;
  kind?: string;
}

interface CompletionResult {
  x?: number;
  y?: number;
  fulltext?: string;
  city?: string;
  zipcode?: string;
  kind?: string;
}

interface CompletionResponse {
  status?: string;
  results?: CompletionResult[];
}

export function normalizeCompletionResponse(payload: CompletionResponse): GeocodingSuggestion[] {
  if (payload.status !== "OK" || !Array.isArray(payload.results)) return [];
  return payload.results.flatMap((result, index) => {
    if (
      !result.fulltext
      || !Number.isFinite(result.x)
      || !Number.isFinite(result.y)
      || result.x! < -180
      || result.x! > 180
      || result.y! < -90
      || result.y! > 90
    ) return [];
    return [{
      id: `${result.x}-${result.y}-${index}`,
      label: result.fulltext,
      city: result.city,
      postcode: result.zipcode,
      latitude: result.y!,
      longitude: result.x!,
      kind: result.kind,
    }];
  });
}

export async function autocompleteAddress(query: string): Promise<GeocodingSuggestion[]> {
  const parameters = new URLSearchParams({
    text: query,
    terr: "METROPOLE",
    type: "StreetAddress,PositionOfInterest",
    maximumResponses: "6",
  });
  const response = await fetch(`https://data.geopf.fr/geocodage/completion/?${parameters}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Géoplateforme: HTTP ${response.status}`);
  return normalizeCompletionResponse(await response.json());
}
