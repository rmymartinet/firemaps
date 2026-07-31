import { randomUUID } from "node:crypto";
import type {
  ReportRealtimeEvent,
  ReportRealtimeEventInput,
} from "@/domain/report-realtime-event";

export type ReportEventListener = (event: ReportRealtimeEvent) => void;
export type UnsubscribeFromReportEvents = () => void;

export class ReportEventBus {
  private readonly listeners = new Set<ReportEventListener>();

  subscribe(listener: ReportEventListener): UnsubscribeFromReportEvents {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(input: ReportRealtimeEventInput): ReportRealtimeEvent {
    const event = {
      ...input,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    } as ReportRealtimeEvent;

    this.dispatch(event);

    return event;
  }

  /** Diffuse localement un événement déjà formé, reçu d'une autre instance. */
  dispatch(event: ReportRealtimeEvent): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch (error) {
        console.error("A report realtime listener failed.", error);
      }
    }
  }

  get subscriberCount(): number {
    return this.listeners.size;
  }
}

const globalReportEventBus = globalThis as typeof globalThis & {
  firemapsReportEventBus?: ReportEventBus;
};

/**
 * Singleton partagé par les Route Handlers exécutés dans la même instance
 * Node.js. Un bus externe sera nécessaire si plusieurs instances sont lancées.
 */
export const reportEventBus =
  globalReportEventBus.firemapsReportEventBus ??= new ReportEventBus();

