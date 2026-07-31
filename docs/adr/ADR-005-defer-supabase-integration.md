# ADR-005 — Différer l’intégration Supabase

- Statut : remplacé par l'implémentation Neon/Prisma/Better Auth/R2
- Date : 2026-07-25

## Contexte
Le premier lot doit valider le shell sans inventer de politiques de sécurité ou connecter prématurément des sources critiques.

## Décision
Prévoir Supabase pour PostgreSQL et stockage privé, mais ne l’ajouter qu’avec migrations, RLS et flux de modération.

## Évolution

Cette décision historique a été dépassée : PostgreSQL Neon avec Prisma a été
retenu pour la base, Better Auth pour l'identité et Cloudflare R2 pour les
médias. Supabase ne fait plus partie de l'architecture cible actuelle.

## Alternatives
Installer Supabase immédiatement, API Next.js avec autre PostgreSQL, données locales durables.

## Raisons
Éviter configuration morte et dépendances avant le premier flux persistant.

## Conséquences positives
Socle initial plus simple ; sécurité conçue avec le besoin réel.

## Conséquences négatives
Pas de persistance ni administration dans ce lot ; migration à réaliser au lot 3.
