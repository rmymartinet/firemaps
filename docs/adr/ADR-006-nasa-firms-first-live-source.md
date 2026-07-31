# ADR-006 — NASA FIRMS comme première source réelle

- Statut : accepté
- Date : 2026-07-25

## Contexte

Firemaps doit montrer rapidement où des feux potentiels sont observés en France, sans disposer d’une API nationale unifiée des incendies confirmés.

## Décision

Utiliser les détections VIIRS NRT de NASA FIRMS (Suomi-NPP, NOAA-20, NOAA-21)
comme première couche réelle. Les exposer via une route serveur avec clé
secrète, normalisation et dégradation partielle. L'implémentation actuelle
interroge l'emprise mondiale visible, limite la période à cinq jours comme
l'exige l'API Area et utilise un cache CDN frais cinq minutes avec trente
minutes de `stale-while-revalidate`.

## Alternatives envisagées

EFFIS seul, publications manuelles des préfectures/SDIS, agrégation non officielle, absence de données jusqu’à une confirmation nationale.

## Raisons

Couverture nationale, API officielle documentée, horodatages d’acquisition, résolution VIIRS nominale de 375 m et accès gratuit. EFFIS reste prévu pour enrichir et filtrer, tandis que les autorités restent nécessaires pour confirmer.

## Conséquences positives

Premiers emplacements réels disponibles rapidement ; provenance et confiance conservées ; secret absent du navigateur ; panne d’un capteur non bloquante.

## Conséquences négatives

Les points sont des anomalies thermiques, avec faux positifs, omissions, délais
et doublons. Une clé externe et un quota sont nécessaires. Une vue trop large
doit être rapprochée et l'historique récent exposé par cette route ne dépasse
pas cinq jours. Aucune consigne officielle n'en découle.
