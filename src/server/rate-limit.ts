type RateLimitEntry = { count: number; expiresAt: number };

const globalForRateLimit = globalThis as unknown as {
  firemapsRateLimits?: Map<string, RateLimitEntry>;
};

const entries = globalForRateLimit.firemapsRateLimits ?? new Map<string, RateLimitEntry>();
globalForRateLimit.firemapsRateLimits = entries;

function prune(now: number) {
  if (entries.size < 5_000) return;
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
  while (entries.size > 10_000) entries.delete(entries.keys().next().value!);
}

export function consumeRateLimit(scope: string, subject: string, limit: number, windowMs: number) {
  const now = Date.now();
  prune(now);
  const key = `${scope}:${subject}`;
  const current = entries.get(key);
  const entry = !current || current.expiresAt <= now
    ? { count: 1, expiresAt: now + windowMs }
    : { count: current.count + 1, expiresAt: current.expiresAt };
  entries.set(key, entry);
  return {
    allowed: entry.count <= limit,
    retryAfter: Math.max(1, Math.ceil((entry.expiresAt - now) / 1_000)),
  };
}

export function rateLimitResponse(retryAfter: number) {
  return Response.json(
    { code: "RATE_LIMITED", message: "Trop de demandes. Réessayez dans quelques instants." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
