import { describe, expect, it } from "vitest";
import { formatAge, getFreshness } from "./freshness";
const now = new Date("2026-07-25T12:00:00.000Z");
describe("freshness", () => {
  it("classe une observation récente", () => expect(getFreshness("2026-07-25T11:45:00.000Z", now)).toBe("fresh"));
  it("signale une donnée ancienne", () => expect(getFreshness("2026-07-25T08:00:00.000Z", now)).toBe("stale"));
  it("formate un âge lisible", () => expect(formatAge("2026-07-25T10:00:00.000Z", now)).toBe("il y a 2 h"));
});
