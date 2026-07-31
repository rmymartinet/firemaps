# ADR-008 — Recherche sur la carte avec IGN Géoplateforme

- Statut : remplacé par ADR-011
- Date : 2026-07-25

## Contexte

Un onglet « Mon adresse » séparé impose une navigation avant de pouvoir explorer un lieu. L’usage attendu ressemble davantage à une carte grand public avec recherche immédiate.

## Décision

Retirer « Mon adresse » de la navigation principale et placer une barre d’autocomplétion sur la carte. Utiliser le service officiel IGN Géoplateforme via une route serveur sans cache, avec debounce de 350 ms, six réponses maximum et couverture métropolitaine initiale.

## Alternatives envisagées

Conserver la page séparée, ancienne API BAN dépréciée, Nominatim public, fournisseur commercial avec clé.

## Raisons

Interaction plus directe, fournisseur national documenté, adresses BAN et points d’intérêt, absence de clé supplémentaire. L’ancienne API `api-adresse.data.gouv.fr` a été décommissionnée fin janvier 2026.

## Conséquences positives

Recherche accessible immédiatement, recentrage rapide, source explicite, aucune persistance automatique de l’adresse.

## Conséquences négatives

La requête d'adresse est transmise à un service externe ; le quota et la disponibilité s'appliquent. L'outre-mer n'est pas encore couvert. La surveillance locale reste à rattacher à la sélection.

Cette décision décrit l'intégration initiale. Depuis le 31 juillet 2026,
Photon/OpenStreetMap fournit la couverture mondiale et IGN ne sert plus que de
secours métropolitain.
