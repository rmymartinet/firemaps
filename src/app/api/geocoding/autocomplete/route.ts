import { autocompleteAddress } from "@/integrations/geoplateforme";
import { autocompleteWorldwide } from "@/integrations/photon";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 120) {
    return Response.json(
      { suggestions: [], message: "Saisissez entre 3 et 120 caractères." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const worldwideSuggestions = await autocompleteWorldwide(
      query,
      request.headers.get("accept-language"),
    );
    if (worldwideSuggestions.length > 0) {
      return Response.json(
        { suggestions: worldwideSuggestions },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
  } catch {
    // IGN remains a useful fallback when the worldwide provider is unavailable.
  }

  try {
    return Response.json(
      { suggestions: await autocompleteAddress(query) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { suggestions: [], message: "La recherche d’adresse est temporairement indisponible." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
