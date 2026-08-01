import { createHmac } from "node:crypto";

/**
 * Empreinte HMAC de l'adresse IP de la requête, jamais l'IP brute. Utilisée
 * pour les limites anti-abus et, sur les votes, comme base de détection des
 * votes coordonnés (plusieurs comptes votant depuis la même connexion).
 */
export function requestIpHash(request: Request): string | null {
  const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim();
  const secret = process.env.COMMUNITY_RATE_LIMIT_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!rawIp || !secret) return null;
  return createHmac("sha256", secret).update(rawIp).digest("hex");
}
