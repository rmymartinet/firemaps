import { describe, expect, it, vi } from "vitest";
import type { CommunityReport } from "@/domain/community-report";
import { ReportEventBus } from "./report-event-bus";

const report = {
  accuracyMeters: null,
  capturedAt: "2026-07-29T08:00:00.000Z",
  category: "smoke",
  confirms: 0,
  createdAt: "2026-07-29T08:01:00.000Z",
  description: "",
  disputes: 0,
  expiresAt: "2026-07-29T11:00:00.000Z",
  id: "7dd18174-4d2e-4e64-9058-f6de275460b4",
  latitude: 44.84,
  longitude: -0.58,
  mediaKind: "none",
  mediaUrl: null,
} satisfies CommunityReport;

describe("ReportEventBus", () => {
  it("diffuse le même événement enrichi à tous les abonnés", () => {
    const bus = new ReportEventBus();
    const firstListener = vi.fn();
    const secondListener = vi.fn();
    bus.subscribe(firstListener);
    bus.subscribe(secondListener);

    const event = bus.publish({
      data: report,
      reportId: report.id,
      type: "report.created",
    });

    expect(event.id).toEqual(expect.any(String));
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
    expect(firstListener).toHaveBeenCalledWith(event);
    expect(secondListener).toHaveBeenCalledWith(event);
    expect(bus.subscriberCount).toBe(2);
  });

  it("ne diffuse plus rien après le désabonnement", () => {
    const bus = new ReportEventBus();
    const listener = vi.fn();
    const unsubscribe = bus.subscribe(listener);

    unsubscribe();
    bus.publish({ reportId: report.id, type: "report.deleted" });

    expect(listener).not.toHaveBeenCalled();
    expect(bus.subscriberCount).toBe(0);
  });

  it("continue la diffusion lorsqu’un abonné échoue", () => {
    const bus = new ReportEventBus();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const healthyListener = vi.fn();
    bus.subscribe(() => {
      throw new Error("Connexion fermée");
    });
    bus.subscribe(healthyListener);

    const event = bus.publish({ reportId: report.id, type: "report.deleted" });

    expect(healthyListener).toHaveBeenCalledWith(event);
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});

