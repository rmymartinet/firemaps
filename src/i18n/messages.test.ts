import { describe, expect, it } from "vitest";
import englishMessages from "./messages/en.json";
import frenchMessages from "./messages/fr.json";
import spanishMessages from "./messages/es.json";
import italianMessages from "./messages/it.json";
import germanMessages from "./messages/de.json";
import portugueseMessages from "./messages/pt.json";
import dutchMessages from "./messages/nl.json";
import polishMessages from "./messages/pl.json";
import arabicMessages from "./messages/ar.json";

function flatten(messages: Record<string, Record<string, string>>) {
  return Object.entries(messages).flatMap(([namespace, entries]) => (
    Object.entries(entries).map(([key, message]) => [`${namespace}.${key}`, message] as const)
  ));
}

function placeholders(message: string) {
  return [...message.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

describe("translation catalogues", () => {
  const french = new Map(flatten(frenchMessages));
  const english = new Map(flatten(englishMessages));
  const spanish = new Map(flatten(spanishMessages));
  const italian = new Map(flatten(italianMessages));
  const german = new Map(flatten(germanMessages));
  const portuguese = new Map(flatten(portugueseMessages));
  const dutch = new Map(flatten(dutchMessages));
  const polish = new Map(flatten(polishMessages));
  const arabic = new Map(flatten(arabicMessages));

  it("contain the same translation keys", () => {
    expect([...english.keys()].sort()).toEqual([...french.keys()].sort());
    for (const catalogue of [spanish, italian, german, portuguese, dutch, polish, arabic]) {
      for (const key of catalogue.keys()) {
        expect(english.has(key), key).toBe(true);
      }
    }
  });

  it("use the same variables in both languages", () => {
    for (const catalogue of [french, spanish, italian, german, portuguese, dutch, polish, arabic]) {
      for (const [key, message] of catalogue) {
        if (!english.has(key)) continue;
        expect(placeholders(english.get(key) ?? ""), key).toEqual(placeholders(message));
      }
    }
  });
});
