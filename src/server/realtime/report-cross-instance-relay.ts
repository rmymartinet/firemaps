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

const globalRelay = globalThis as typeof globalThis & {
  firemapsReportEventRelayClient?: Client;
};

/**
 * Démarre l'écoute Postgres LISTEN pour cette instance Node. Idempotent :
 * un appel répété (à chaque connexion SSE) ne recrée pas la connexion.
 */
export function startReportEventRelay(): void {
  if (globalRelay.firemapsReportEventRelayClient) return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  const client = new Client({ connectionString });
  globalRelay.firemapsReportEventRelayClient = client;

  client.on("notification", (message) => {
    handleNotification(message.payload).catch((error) => {
      console.error("Échec de traitement d'un événement de signalement distant.", error);
    });
  });
  client.on("error", (error) => {
    console.error("Connexion d'écoute inter-instances des signalements interrompue.", error);
  });

  client.connect()
    .then(() => client.query(`LISTEN ${REPORT_EVENTS_CHANNEL}`))
    .catch((error) => {
      console.error("Impossible de démarrer l'écoute inter-instances des signalements.", error);
      globalRelay.firemapsReportEventRelayClient = undefined;
    });
}
