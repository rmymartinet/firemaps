import { describe, expect, it } from "vitest";
import type { CommunityReport } from "@/domain/community-report";
import type { ReportRealtimeEvent } from "@/domain/report-realtime-event";
import {
  decodeNotifyPayload,
  encodeNotifyPayload,
  resolveNotifiedEvent,
} from "./report-event-notify-payload";

const report = {
  accuracyMeters: null,
  capturedAt: "2026-07-29T08:00:00.000Z",
  category: "smoke",
  confirms: 2,
  createdAt: "2026-07-29T08:01:00.000Z",
  description: "",
  disputes: 1,
  expiresAt: "2026-07-29T11:00:00.000Z",
  id: "7dd18174-4d2e-4e64-9058-f6de275460b4",
  latitude: 44.84,
  longitude: -0.58,
  mediaKind: "none",
  mediaUrl: null,
} satisfies CommunityReport;

const createdEvent = {
  data: report,
  id: "event-1",
  reportId: report.id,
  timestamp: "2026-07-29T08:01:00.000Z",
  type: "report.created",
} satisfies ReportRealtimeEvent;

describe("encodeNotifyPayload / decodeNotifyPayload", () => {
  it("aller-retour un événement complet lorsqu'il tient dans la limite", () => {
    const payload = encodeNotifyPayload(createdEvent, "instance-a");
    const decoded = decodeNotifyPayload(payload);

    expect(decoded).toEqual({ event: createdEvent, instanceId: "instance-a" });
  });

  it("tronque en stub lorsque le payload dépasse la limite pg_notify", () => {
    const bigZone = Array.from({ length: 30 }, (_, index) => ({
      latitude: index / 100,
      longitude: index / 100,
    }));
    const bigEvent = {
      ...createdEvent,
      data: { ...report, description: "x".repeat(8000), observedZone: bigZone },
    } satisfies ReportRealtimeEvent;

    const payload = encodeNotifyPayload(bigEvent, "instance-a");
    const decoded = decodeNotifyPayload(payload);

    expect(decoded).toEqual({
      event: {
        id: bigEvent.id,
        reportId: bigEvent.reportId,
        timestamp: bigEvent.timestamp,
        truncated: true,
        type: bigEvent.type,
      },
      instanceId: "instance-a",
    });
  });

  it("rejette un JSON invalide", () => {
    expect(decodeNotifyPayload("not json")).toBeNull();
  });

  it("rejette un événement dont le type est inconnu", () => {
    const payload = JSON.stringify({
      event: { ...createdEvent, type: "report.unknown" },
      instanceId: "instance-a",
    });

    expect(decodeNotifyPayload(payload)).toBeNull();
  });
});

describe("resolveNotifiedEvent", () => {
  it("renvoie l'événement tel quel lorsqu'il n'est pas tronqué", async () => {
    const fetchReport = async () => null;
    await expect(resolveNotifiedEvent(createdEvent, fetchReport)).resolves.toEqual(createdEvent);
  });

  it("reconstruit un événement de suppression sans relire la base", async () => {
    const fetchReport = async () => {
      throw new Error("ne devrait pas être appelé");
    };
    const stub = {
      id: "event-2",
      reportId: report.id,
      timestamp: "2026-07-29T09:00:00.000Z",
      truncated: true,
      type: "report.deleted",
    } as const;

    await expect(resolveNotifiedEvent(stub, fetchReport)).resolves.toEqual({
      id: "event-2",
      reportId: report.id,
      timestamp: "2026-07-29T09:00:00.000Z",
      type: "report.deleted",
    });
  });

  it("relit le signalement pour reconstruire un événement de vote tronqué", async () => {
    const fetchReport = async (reportId: string) => reportId === report.id ? report : null;
    const stub = {
      id: "event-3",
      reportId: report.id,
      timestamp: "2026-07-29T09:00:00.000Z",
      truncated: true,
      type: "report.vote-updated",
    } as const;

    await expect(resolveNotifiedEvent(stub, fetchReport)).resolves.toEqual({
      data: { confirms: 2, disputes: 1, score: 1 },
      id: "event-3",
      reportId: report.id,
      timestamp: "2026-07-29T09:00:00.000Z",
      type: "report.vote-updated",
    });
  });

  it("renvoie null lorsque le signalement tronqué a disparu", async () => {
    const fetchReport = async () => null;
    const stub = {
      id: "event-4",
      reportId: report.id,
      timestamp: "2026-07-29T09:00:00.000Z",
      truncated: true,
      type: "report.updated",
    } as const;

    await expect(resolveNotifiedEvent(stub, fetchReport)).resolves.toBeNull();
  });
});
