import { randomUUID } from "node:crypto";
import { Client } from "pg";
import type { CommunityReport } from "@/domain/community-report";
import type { ReportRealtimeEvent, ReportRealtimeEventInput } from "@/domain/report-realtime-event";
import { serializeCommunityReport } from "@/server/community-report-dto";
import { reportEventBus } from "./report-event-bus";
import { decodeNotifyPayload, encodeNotifyPayload, resolveNotifiedEvent } from "./report-event-notify-payload";

const REPORT_EVENTS_CHANNEL = "report_events";

/** Distingue les messages émis par cette instance de ceux reçus d'une autre. */
export const reportEventRelayInstanceId = randomUUID();

/**
 * Import différé : ce module est chargé dès qu'une route de signalement se
 * charge, y compris en environnement de test sans base configurée. Charger
 * `@/server/prisma` de façon paresseuse évite d'instancier Prisma tant
 * qu'aucun signalement n'est réellement lu ou notifié.
 */
async function getPrisma() {
  const { prisma } = await import("@/server/prisma");
  return prisma;
}

async function fetchReport(reportId: string): Promise<CommunityReport | null> {
  const prisma = await getPrisma();
  const record = await prisma.communityReport.findUnique({
    include: { media: true, votes: { select: { value: true } } },
    where: { id: reportId },
  });
  return record ? serializeCommunityReport(record) : null;
}

async function notifyReportEvent(event: ReportRealtimeEvent): Promise<void> {
  const prisma = await getPrisma();
  const payload = encodeNotifyPayload(event, reportEventRelayInstanceId);
  await prisma.$executeRaw`SELECT pg_notify(${REPORT_EVENTS_CHANNEL}, ${payload})`;
}

/**
 * Diffuse un événement aux abonnés locaux puis prévient les autres instances
 * Vercel via Postgres NOTIFY, car le bus en mémoire ne franchit pas le
 * processus.
 */
export function publishReportEvent(input: ReportRealtimeEventInput): ReportRealtimeEvent {
  const event = reportEventBus.publish(input);
  notifyReportEvent(event).catch((error) => {
    console.error("Échec de la notification inter-instances d'un signalement.", error);
  });
  return event;
}

async function handleNotification(raw: string | undefined): Promise<void> {
  if (!raw) return;
  const payload = decodeNotifyPayload(raw);
  if (!payload || payload.instanceId === reportEventRelayInstanceId) return;

  const event = await resolveNotifiedEvent(payload.event, fetchReport);
  if (event) reportEventBus.dispatch(event);
}

export const MIN_RELAY_RECONNECT_DELAY_MS = 1_000;
export const MAX_RELAY_RECONNECT_DELAY_MS = 30_000;

const globalRelay = globalThis as typeof globalThis & {
  firemapsReportEventRelayBackoffMs?: number;
  firemapsReportEventRelayClient?: Client;
  firemapsReportEventRelayReconnectTimer?: ReturnType<typeof setTimeout>;
};

function scheduleRelayReconnect(): void {
  if (globalRelay.firemapsReportEventRelayReconnectTimer) return;
  const delay = globalRelay.firemapsReportEventRelayBackoffMs ?? MIN_RELAY_RECONNECT_DELAY_MS;
  globalRelay.firemapsReportEventRelayBackoffMs = Math.min(delay * 2, MAX_RELAY_RECONNECT_DELAY_MS);
  globalRelay.firemapsReportEventRelayReconnectTimer = setTimeout(() => {
    globalRelay.firemapsReportEventRelayReconnectTimer = undefined;
    connectRelay();
  }, delay);
}

function connectRelay(): void {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  const client = new Client({ connectionString });
  globalRelay.firemapsReportEventRelayClient = client;

  const handleDisconnect = (error?: unknown) => {
    if (globalRelay.firemapsReportEventRelayClient !== client) return;
    if (error) console.error("Connexion d'écoute inter-instances des signalements interrompue.", error);
    globalRelay.firemapsReportEventRelayClient = undefined;
    scheduleRelayReconnect();
  };

  client.on("notification", (message) => {
    handleNotification(message.payload).catch((error) => {
      console.error("Échec de traitement d'un événement de signalement distant.", error);
    });
  });
  client.on("error", handleDisconnect);
  client.on("end", () => handleDisconnect());

  client.connect()
    .then(() => client.query(`LISTEN ${REPORT_EVENTS_CHANNEL}`))
    .then(() => {
      globalRelay.firemapsReportEventRelayBackoffMs = MIN_RELAY_RECONNECT_DELAY_MS;
    })
    .catch((error) => {
      console.error("Impossible de démarrer l'écoute inter-instances des signalements.", error);
      handleDisconnect(error);
    });
}

/**
 * Démarre l'écoute Postgres LISTEN pour cette instance Node. Idempotent :
 * un appel répété (à chaque connexion SSE) ne recrée pas la connexion. Se
 * reconnecte avec un délai croissant (1 s à 30 s) si la connexion se coupe.
 */
export function startReportEventRelay(): void {
  if (globalRelay.firemapsReportEventRelayClient || globalRelay.firemapsReportEventRelayReconnectTimer) return;
  connectRelay();
}
