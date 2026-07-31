import { describe, expect, it } from "vitest";
import type { CommunityReport } from "./community-report";
import {
  applyReportRealtimeEvent,
  parseReportRealtimeEvent,
  type ReportRealtimeEvent,
} from "./report-realtime-event";

const deletedEvent = {
  id: "event-123",
  reportId: "report-456",
  timestamp: "2026-07-29T10:00:00.000Z",
  type: "report.deleted",
} satisfies ReportRealtimeEvent;

describe("parseReportRealtimeEvent", () => {
  it("accepte un événement connu et correctement formé", () => {
    expect(parseReportRealtimeEvent(JSON.stringify(deletedEvent))).toEqual(deletedEvent);
  });

  it("refuse un type d’événement inconnu", () => {
    expect(parseReportRealtimeEvent(JSON.stringify({
      ...deletedEvent,
      type: "report.unknown",
    }))).toBeNull();
  });

  it("refuse un message ou des données de vote invalides", () => {
    expect(parseReportRealtimeEvent("pas du JSON")).toBeNull();
    expect(parseReportRealtimeEvent(JSON.stringify({
      ...deletedEvent,
      data: { confirms: "deux", disputes: 0, score: 2 },
      type: "report.vote-updated",
    }))).toBeNull();
  });
});

const report = {
  accuracyMeters: null,
  capturedAt: "2026-07-29T10:00:00.000Z",
  category: "smoke",
  confirms: 0,
  createdAt: "2026-07-29T10:01:00.000Z",
  description: "",
  disputes: 0,
  expiresAt: "2026-07-29T13:00:00.000Z",
  id: "report-456",
  latitude: 44.84,
  longitude: -0.58,
  mediaKind: "none",
  mediaUrl: null,
} satisfies CommunityReport;

describe("applyReportRealtimeEvent", () => {
  it("ajoute une création une seule fois", () => {
    const created = {
      ...deletedEvent,
      data: report,
      type: "report.created",
    } satisfies ReportRealtimeEvent;

    expect(applyReportRealtimeEvent([], created)).toEqual([report]);
    expect(applyReportRealtimeEvent([report], created)).toEqual([report]);
  });

  it("préserve la propriété propre au client lors d’une mise à jour", () => {
    const ownedReport = { ...report, ownedByViewer: true };
    const updated = {
      ...deletedEvent,
      data: { ...report, description: "Description enrichie", ownedByViewer: false },
      type: "report.updated",
    } satisfies ReportRealtimeEvent;

    expect(applyReportRealtimeEvent([ownedReport], updated)[0]).toMatchObject({
      description: "Description enrichie",
      ownedByViewer: true,
    });
  });

  it("applique les votes puis la suppression", () => {
    const vote = {
      ...deletedEvent,
      data: { confirms: 4, disputes: 1, score: 3 },
      type: "report.vote-updated",
    } satisfies ReportRealtimeEvent;
    const votedReports = applyReportRealtimeEvent([report], vote);

    expect(votedReports[0]).toMatchObject({ confirms: 4, disputes: 1 });
    expect(applyReportRealtimeEvent(votedReports, deletedEvent)).toEqual([]);
  });
});
