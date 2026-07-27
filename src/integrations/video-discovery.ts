export type VideoPlatform = "tiktok" | "instagram";

export interface VideoCandidate {
  id: string;
  platform: VideoPlatform;
  title: string;
  url: string;
  description: string;
  discoveredAt: string;
}

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
}

interface BraveSearchResponse {
  web?: { results?: BraveWebResult[] };
}

export function normalizeVideoCandidates(
  payloads: BraveSearchResponse[],
  discoveredAt = new Date().toISOString(),
  place = "",
): VideoCandidate[] {
  const primaryPlaceToken = place.toLocaleLowerCase("fr-FR").split(/[\s,()'-]+/).find((token) => token.length >= 3) ?? "";
  const candidates = payloads.flatMap((payload) => payload.web?.results ?? []).flatMap((result) => {
    if (!result.url || !result.title) return [];
    let platform: VideoPlatform | null = null;
    try {
      const url = new URL(result.url);
      const hostname = url.hostname.replace(/^www\./, "");
      if ((hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) && /\/video\/\d+/.test(url.pathname)) {
        platform = "tiktok";
      }
      if ((hostname === "instagram.com" || hostname.endsWith(".instagram.com")) && url.pathname.startsWith("/reel/")) {
        platform = "instagram";
      }
    } catch {
      return [];
    }
    if (!platform) return [];
    const searchableText = `${result.title} ${result.description ?? ""} ${result.url}`.toLocaleLowerCase("fr-FR");
    if (primaryPlaceToken && !searchableText.includes(primaryPlaceToken)) return [];
    return [{
      id: `${platform}-${result.url}`,
      platform,
      title: result.title.slice(0, 180),
      url: result.url,
      description: (result.description ?? "").slice(0, 400),
      discoveredAt,
    }];
  });
  return [...new Map(candidates.map((candidate) => [candidate.url, candidate])).values()];
}

export async function discoverPublicFireVideos(place: string): Promise<VideoCandidate[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new Error("BRAVE_SEARCH_NOT_CONFIGURED");
  const terms = `"${place}" (incendie OR feu OR fumée OR "feu de forêt")`;
  const queries = [`site:tiktok.com ${terms}`, `site:instagram.com/reel ${terms}`];
  const payloads = await Promise.all(queries.map(async (query) => {
    const parameters = new URLSearchParams({
      q: query,
      count: "20",
      country: "fr",
      freshness: "pw",
      search_lang: "fr",
      safesearch: "moderate",
    });
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${parameters}`, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`BRAVE_SEARCH_HTTP_${response.status}`);
    return response.json() as Promise<BraveSearchResponse>;
  }));
  return normalizeVideoCandidates(payloads, new Date().toISOString(), place);
}
