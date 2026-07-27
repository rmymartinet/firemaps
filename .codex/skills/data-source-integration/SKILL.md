---
name: data-source-integration
description: Intégrer une source externe incendie, officielle, météo, géocodage, route ou abri avec traçabilité et résilience. Utiliser avant d’ajouter un fournisseur, un flux d’ingestion, un adaptateur ou une variable fournisseur.
---

# Intégration d’une source

1. Documenter dans `docs/architecture/data-sources.md` : fournisseur, origine, format, licence, quota, fréquence, précision, couverture et limites.
2. Distinguer heure d’observation, publication, ingestion, mise à jour et dernière synchronisation réussie.
3. Normaliser par un adaptateur vers `src/domain`; valider les entrées à l’exécution.
4. Conserver l’URL et l’identifiant d’origine quand disponibles.
5. Concevoir timeout, retry borné, cache, indisponibilité, obsolescence et suppression/doublon.
6. Ajouter fixtures, tests de contrat et tests d’erreur.
7. Rendre la source, la confiance et la fraîcheur visibles dans l’interface.
8. Mettre à jour architecture, sécurité, ADR éventuel et état actuel avant de terminer.
