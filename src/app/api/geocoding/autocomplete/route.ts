import { autocompleteAddress } from "@/integrations/geoplateforme";

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
