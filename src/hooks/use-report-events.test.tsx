import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReportEvents } from "./use-report-events";

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly close = vi.fn();
  private readonly listeners = new Map<string, Set<EventListener>>();

  constructor(readonly url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, data = ""): void {
    const event = type === "connected"
      ? new Event(type)
      : new MessageEvent(type, { data });
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

describe("useReportEvents", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ouvre une seule connexion, transmet les messages et la ferme", () => {
    const onEvent = vi.fn();
    const { result, unmount } = renderHook(() => useReportEvents(onEvent));
    const source = MockEventSource.instances[0];

    expect(source.url).toBe("/api/community/reports/events");
    expect(MockEventSource.instances).toHaveLength(1);
    expect(result.current).toBe("connecting");

    act(() => source.emit("connected"));
    expect(result.current).toBe("open");

    act(() => source.emit("report.deleted", JSON.stringify({
      id: "event-123",
      reportId: "report-456",
      timestamp: "2026-07-29T10:00:00.000Z",
      type: "report.deleted",
    })));
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
      reportId: "report-456",
      type: "report.deleted",
    }));

    unmount();
    expect(source.close).toHaveBeenCalledOnce();
  });
});

