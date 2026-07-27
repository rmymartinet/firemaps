import { describe, expect, it } from "vitest";
import { consumeRateLimit } from "./rate-limit";

describe("limitation applicative", () => {
  it("refuse les demandes qui dépassent la fenêtre autorisée", () => {
    const subject = crypto.randomUUID();
    expect(consumeRateLimit("test", subject, 2, 60_000).allowed).toBe(true);
    expect(consumeRateLimit("test", subject, 2, 60_000).allowed).toBe(true);
    const rejected = consumeRateLimit("test", subject, 2, 60_000);
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfter).toBeGreaterThan(0);
  });
});
