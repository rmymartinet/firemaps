---
name: architecture-guardian
description: Préserver l’architecture simple et documentée de Sentinel. Utiliser avant tout changement de framework, dépendance, backend, stockage, cache, déploiement, modèle ou frontière serveur-client.
---

# Gardien de l’architecture

1. Lire `docs/current-state.md`, `docs/architecture/overview.md` et les ADR liés.
2. Confirmer que le besoin appartient au MVP et qu’une solution existante ne suffit pas.
3. Préférer la dépendance et la frontière les plus simples compatibles avec sécurité et tests.
4. Créer un ADR seulement si la décision structure plusieurs changements, est coûteuse à inverser ou impose un compromis durable.
5. Mettre à jour architecture, ADR, roadmap et état actuel après l’implémentation.
