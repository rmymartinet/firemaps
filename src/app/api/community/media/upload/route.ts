import { auth } from "@/server/auth";
import { createCommunityMediaKey, createR2UploadUrl } from "@/server/r2";

const allowedMedia = {
  "image/jpeg": { extension: "jpg", kind: "image", maxBytes: 15_000_000 },
  "image/png": { extension: "png", kind: "image", maxBytes: 15_000_000 },
  "image/webp": { extension: "webp", kind: "image", maxBytes: 15_000_000 },
  "video/mp4": { extension: "mp4", kind: "video", maxBytes: 50_000_000 },
  "video/quicktime": { extension: "mov", kind: "video", maxBytes: 50_000_000 },
  "video/webm": { extension: "webm", kind: "video", maxBytes: 50_000_000 },
} as const;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ message: "Connectez-vous pour publier un média." }, { status: 401 });

  const body = await request.json().catch(() => null) as { contentType?: string; sizeBytes?: number } | null;
  const contentType = body?.contentType as keyof typeof allowedMedia | undefined;
  const media = contentType ? allowedMedia[contentType] : null;
  if (!contentType || !media || !Number.isInteger(body?.sizeBytes) || Number(body?.sizeBytes) <= 0 || Number(body?.sizeBytes) > media.maxBytes) {
    return Response.json({ message: "Format ou taille de média non autorisé." }, { status: 400 });
  }

  const key = createCommunityMediaKey(media.kind, session.user.id, media.extension);
  const signed = await createR2UploadUrl(key, contentType, 300);
  return Response.json({ ...signed, key }, { headers: { "Cache-Control": "no-store" } });
}
