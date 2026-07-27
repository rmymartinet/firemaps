---
name: documentation-sync
description: Synchroniser la documentation persistante de Sentinel avec le dépôt réel. Utiliser après une tâche importante ou tout changement d’architecture, modèle, sécurité, déploiement, source, flux, périmètre ou état de fonctionnalité.
---

# Synchronisation documentaire

1. Relire le diff et vérifier le comportement réellement présent.
2. Mettre à jour `docs/current-state.md` : terminé, en cours, dette, risques, blocages, sources, tests, déploiement et prochaines étapes.
3. Mettre à jour le document produit ou architecture directement concerné.
4. Créer ou modifier un ADR uniquement pour une décision structurante.
5. Ajuster `docs/roadmap.md` si ordre, portée ou jalon change.
6. Corriger ou supprimer toute affirmation devenue fausse.
7. Ne pas documenter une architecture seulement envisagée comme déjà implémentée.
