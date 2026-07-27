# ADR-006 — NASA FIRMS comme première source réelle

- Statut : accepté
- Date : 2026-07-25

## Contexte

Firemaps doit montrer rapidement où des feux potentiels sont observés en France, sans disposer d’une API nationale unifiée des incendies confirmés.

## Décision

Utiliser les détections VIIRS NRT de NASA FIRMS (Suomi-NPP, NOAA-20, NOAA-21) comme première couche réelle. Les exposer via une route serveur avec clé secrète, cache CDN de 15 minutes, normalisation et dégradation partielle.

## Alternatives envisagées

EFFIS seul, publications manuelles des préfectures/SDIS, agrégation non officielle, absence de données jusqu’à une confirmation nationale.

## Raisons

Couverture nationale, API officielle documentée, horodatages d’acquisition, résolution VIIRS nominale de 375 m et accès gratuit. EFFIS reste prévu pour enrichir et filtrer, tandis que les autorités restent nécessaires pour confirmer.

## Conséquences positives

Premiers emplacements réels disponibles rapidement ; provenance et confiance conservées ; secret absent du navigateur ; panne d’un capteur non bloquante.

## Conséquences négatives

Les points sont des anomalies thermiques, avec faux positifs, omissions, délais et doublons. La première couverture exclut l’outre-mer. Une clé externe et un quota sont nécessaires. Aucune consigne officielle n’en découle.
