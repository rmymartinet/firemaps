export type Freshness = "fresh" | "aging" | "stale";

export function getFreshness(observedAt: string, now = new Date()): Freshness {
  const ageMinutes = (now.getTime() - new Date(observedAt).getTime()) / 60_000;
  if (ageMinutes <= 30) return "fresh";
  if (ageMinutes <= 180) return "aging";
  return "stale";
}
export function formatAge(observedAt: string, now = new Date(), language: "en" | "fr" = "fr"): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(observedAt).getTime()) / 60_000));
  if (minutes < 1) return language === "fr" ? "à l’instant" : "just now";
  if (minutes < 60) return language === "fr" ? `il y a ${minutes} min` : `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return language === "fr" ? `il y a ${hours} h` : `${hours}h ago`;
  return language === "fr" ? `il y a ${Math.floor(hours / 24)} j` : `${Math.floor(hours / 24)}d ago`;
}
