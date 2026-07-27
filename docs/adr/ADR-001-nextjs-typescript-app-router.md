# ADR-001 — Next.js TypeScript App Router

- Statut : accepté
- Date : 2026-07-25

## Contexte
Le MVP doit être livré rapidement comme PWA, rester typé et permettre ensuite API, administration et déploiement simple.

## Décision
Utiliser Next.js 16, React 19, TypeScript et App Router dans un monolithe modulaire.

## Alternatives
Vite SPA, Remix, application native immédiate.

## Raisons
Routage, métadonnées PWA, composants serveur et déploiement Vercel intégrés ; équipe envisagée déjà alignée sur React.

## Conséquences positives
Un dépôt et une chaîne de livraison ; typage strict ; rendu hybride possible.

## Conséquences négatives
Complexité supérieure à une SPA ; vigilance sur frontières serveur/client et évolutions Next.js.
