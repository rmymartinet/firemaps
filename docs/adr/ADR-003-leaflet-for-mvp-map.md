# ADR-003 — Leaflet pour la carte MVP

- Statut : accepté
- Date : 2026-07-25

## Contexte
Le MVP affiche points et futurs périmètres sans rendu 3D.

## Décision
Utiliser Leaflet via React Leaflet, chargé uniquement côté client.

## Alternatives
MapLibre GL, carte statique, SDK propriétaire.

## Raisons
API légère, mature et suffisante pour les géométries prévues.

## Conséquences positives
Implémentation courte, faible complexité.

## Conséquences négatives
Moins adapté aux volumes et styles vectoriels complexes ; migration possible si les besoins évoluent.
