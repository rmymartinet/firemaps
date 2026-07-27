# ADR-007 — Visualisation cartographique progressive

- Statut : accepté
- Date : 2026-07-25

## Contexte

Des points FIRMS bruts se superposent, deviennent illisibles à l’échelle nationale et peuvent suggérer une précision excessive. Les utilisateurs doivent néanmoins accéder aux observations individuelles.

## Décision

Adapter la représentation au zoom : regroupements calculés jusqu’au zoom 11, points individuels au zoom 12+, taille légèrement liée à la puissance radiative et opacité décroissante avec l’âge. Ne dessiner aucune surface autour d’un point FIRMS. Proposer des filtres 3/6/12/24 h. Utiliser une vue hybride Esri World Imagery par défaut avec bascule OpenStreetMap. Proposer séparément, masquée par défaut, la couche EFFIS hebdomadaire `modis.ba.poly.week`.

## Alternatives envisagées

Points bruts permanents, bibliothèque de clustering supplémentaire, enveloppes convexes Firemaps présentées comme zones, EFFIS seul.

## Raisons

Améliorer la lisibilité sans ajouter de dépendance ni inventer un périmètre. Conserver l’accès à chaque observation et distinguer le calcul d’interface du produit EFFIS.

## Conséquences positives

Carte lisible à plusieurs échelles, contexte végétation/habitat visible, temporalité visible et couche de périmètres estimés clairement séparée.

## Conséquences négatives

Le clustering glouton est approximatif et dépend du zoom. L’imagerie n’est pas en direct et ses conditions de production doivent être confirmées. Le WMS EFFIS peut être lent et n’expose pas facilement ses erreurs par tuile. La couche NRT VIIRS `effis.nrt.ba.poly` a été retirée après constat de périmètres trop grossiers.
