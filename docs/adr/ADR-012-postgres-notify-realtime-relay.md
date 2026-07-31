# ADR-012 — Postgres LISTEN/NOTIFY comme relais temps réel inter-instances

- Statut : accepté
- Date : 2026-07-31

## Contexte

Les signalements communautaires sont désormais diffusés en direct aux clients
connectés via Server-Sent Events, pour éviter qu'un utilisateur ne voie une
carte périmée pendant une situation de crise. Le bus d'événements initial
vit en mémoire dans le processus Node d'une seule instance. Or Vercel peut
exécuter plusieurs instances serverless en parallèle : un événement publié
sur l'instance qui a traité l'écriture ne serait jamais vu par un client SSE
connecté à une autre instance.

## Décision

Faire relayer chaque événement entre instances par Postgres `LISTEN/NOTIFY`
(fonction `pg_notify`), plutôt que d'introduire un service de pub/sub
externe. Chaque instance qui sert au moins une connexion SSE ouvre une
connexion `pg` dédiée en écoute sur un canal `report_events` ; toute écriture
publie localement (bus en mémoire, latence nulle) puis notifie ce canal pour
les autres instances. Un payload qui dépasserait la limite `pg_notify` de
8000 octets (par exemple une zone dessinée avec de nombreux points) est
remplacé par un signalement minimal ; l'instance réceptrice relit alors le
signalement complet en base avant de le diffuser localement. La connexion
d'écoute se reconnecte automatiquement avec un délai croissant (1 à 30 s) si
elle se coupe.

## Alternatives envisagées

Un service pub/sub managé (Redis/Upstash, Ably, Pusher), un websocket
serveur dédié en dehors de Vercel, ou l'absence de relais avec une
resynchronisation HTTP périodique comme seul mécanisme.

## Raisons

Le projet dépend déjà d'une connexion Postgres directe via Neon
(`@prisma/adapter-pg`, pas le driver HTTP serverless), qui supporte les
connexions persistantes nécessaires à `LISTEN`. Cela évite d'ajouter un
fournisseur, une facturation et des identifiants supplémentaires pour un
MVP dont le volume d'écritures communautaires reste modeste.

## Conséquences positives

Aucune nouvelle dépendance d'infrastructure ; latence de propagation limitée
à celle de Postgres ; repli automatique par relecture pour les payloads trop
volumineux plutôt qu'un événement tronqué silencieusement incomplet.

## Conséquences négatives

`DATABASE_URL` doit pointer vers la connexion directe Neon, pas la connexion
poolée par PgBouncer : ce dernier ne supporte pas `LISTEN` de façon fiable en
mode transaction. La livraison reste au mieux effort (`NOTIFY` n'est pas
persistant : un client déconnecté au moment de l'émission perd l'événement,
rattrapé seulement par la resynchronisation HTTP au reconnect). Le
comportement n'a pas encore été validé contre une vraie base multi-instances
en production ; seule la logique de reconnexion est testée unitairement.
