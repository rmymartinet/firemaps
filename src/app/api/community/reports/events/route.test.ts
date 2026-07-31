import { afterEach, describe, expect, it, vi } from "vitest";
import { reportEventBus } from "@/server/realtime/report-event-bus";
import {
  GET,
  REPORT_SSE_HEARTBEAT_INTERVAL_MS,
} from "./route";

const decoder = new TextDecoder();

describe("GET /api/community/reports/events", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ouvre le flux, envoie les heartbeats et nettoie la connexion", async () => {
    vi.useFakeTimers();
    const initialSubscriberCount = reportEventBus.subscriberCount;
    const abortController = new AbortController();
    const response = await GET(new Request(
      "http://localhost/api/community/reports/events",
      { signal: abortController.signal },
    ));
    const reader = response.body?.getReader();

    expect(response.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(reportEventBus.subscriberCount).toBe(initialSubscriberCount + 1);
    expect(decoder.decode((await reader?.read())?.value)).toContain("event: connected");

    const nextMessage = reader?.read();
    await vi.advanceTimersByTimeAsync(REPORT_SSE_HEARTBEAT_INTERVAL_MS);
    expect(decoder.decode((await nextMessage)?.value)).toBe(": heartbeat\n\n");

    abortController.abort();
    await Promise.resolve();
    expect(reportEventBus.subscriberCount).toBe(initialSubscriberCount);
  });
});

