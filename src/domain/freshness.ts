export type Freshness = "fresh" | "aging" | "stale";

export function getFreshness(observedAt: string, now = new Date()): Freshness {
  const ageMinutes = (now.getTime() - new Date(observedAt).getTime()) / 60_000;
  if (ageMinutes <= 30) return "fresh";
  if (ageMinutes <= 180) return "aging";
  return "stale";
}
export function formatAge(observedAt: string, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(observedAt).getTime()) / 60_000));
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.floor(minutes / 60)} h`;
}
