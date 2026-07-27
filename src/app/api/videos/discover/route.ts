import { discoverPublicFireVideos } from "@/integrations/video-discovery";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const place = new URL(request.url).searchParams.get("place")?.trim() ?? "";
  if (place.length < 2 || place.length > 80 || !/^[\p{L}\p{N}\s'’().-]+$/u.test(place)) {
    return Response.json(
      { candidates: [], message: "Saisissez un lieu valide entre 2 et 80 caractères." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    return Response.json(
      { candidates: await discoverPublicFireVideos(place), place, searchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (error) {
    const notConfigured = error instanceof Error && error.message === "BRAVE_SEARCH_NOT_CONFIGURED";
    return Response.json(
      {
        candidates: [],
        code: notConfigured ? "VIDEO_SEARCH_NOT_CONFIGURED" : "VIDEO_SEARCH_UNAVAILABLE",
        message: notConfigured
          ? "La découverte vidéo nécessite BRAVE_SEARCH_API_KEY côté serveur."
          : "La recherche de vidéos est temporairement indisponible.",
      },
      { status: notConfigured ? 503 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
