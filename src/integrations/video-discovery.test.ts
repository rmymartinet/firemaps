import { describe, expect, it } from "vitest";
import { normalizeVideoCandidates } from "./video-discovery";

describe("normalizeVideoCandidates", () => {
  it("conserve TikTok et Instagram puis déduplique les URL", () => {
    const payload = {
      web: {
        results: [
          { title: "Feu local", url: "https://www.tiktok.com/@a/video/1", description: "fumée" },
          { title: "Doublon", url: "https://www.tiktok.com/@a/video/1" },
          { title: "Reel", url: "https://www.instagram.com/reel/abc/" },
          { title: "Article", url: "https://example.com/article" },
        ],
      },
    };
    expect(normalizeVideoCandidates([payload], "2026-07-26T10:00:00Z")).toMatchObject([
      { platform: "tiktok", title: "Doublon" },
      { platform: "instagram", title: "Reel" },
    ]);
  });

  it("écarte les pages de découverte et les résultats sans rapport avec le lieu", () => {
    const payload = {
      web: {
        results: [
          { title: "Incendie Lacanau", url: "https://www.tiktok.com/discover/incendie-lacanau" },
          { title: "Feu à Toulouse", url: "https://www.tiktok.com/@media/video/123" },
          { title: "Fumée visible à Lacanau", url: "https://www.instagram.com/reel/abc/" },
        ],
      },
    };
    expect(normalizeVideoCandidates([payload], "2026-07-26T10:00:00Z", "Lacanau")).toMatchObject([
      { platform: "instagram", title: "Fumée visible à Lacanau" },
    ]);
  });
});
