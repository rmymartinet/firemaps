# ADR-010 — Sentinel-2 comme couche haute définition à la demande

- Statut : remplacé — fonctionnalité retirée de l’interface le 2026-07-26
- Date : 2026-07-25

## Contexte

Le fond Esri donne du contexte mais sa date est inconnue, tandis que FIRMS localise des anomalies sans image détaillée. Sentinel-2 apporte 10–20 m de résolution, avec une revisite et des contraintes nuageuses incompatibles avec une promesse de direct.

## Décision

Après sélection d’un lieu, proposer volontairement les acquisitions Sentinel-2 L2A des 60 derniers jours et produire une image de 2 × 2 km via Sentinel Hub. Séparer le catalogue OData public du rendu Process API OAuth. Fournir Naturel, Infrarouge SWIR et Changements dNBR avant/après, avec dates, couverture nuageuse, opacité, résolution, attribution et avertissement.

## Alternatives envisagées

Remplacer le fond entier par Sentinel-2, télécharger les produits SAFE, utiliser le STAC public, traiter les bandes localement.

## Raisons

Le rendu ciblé limite les unités de traitement et rend la date explicite. Le STAC public a dépassé 45 secondes lors du test réel ; OData a répondu avec des acquisitions réelles en environ sept secondes.

## Conséquences

Deux secrets Copernicus sont nécessaires côté serveur. Une activation produit une image et consomme du quota. Les couleurs restent des compositions visuelles et ne doivent jamais être présentées comme une confirmation ou un périmètre opérationnel.

## Révision du 2026-07-26

La couche a été retirée de l’interface. Sa temporalité, sa résolution perçue au zoom et l’ambiguïté des compositions ne répondaient pas assez directement au besoin principal : situer rapidement les signaux thermiques récents. Les routes expérimentales sont conservées dans le dépôt, mais le client ne les appelle plus.
