---
name: testing-and-quality
description: Valider une modification Sentinel avant de la déclarer terminée. Utiliser après tout changement de code, dépendance, configuration, modèle, source ou flux utilisateur et lors d’une revue de qualité.
---

# Tests et qualité

1. Ajouter ou adapter les tests au niveau le plus bas utile.
2. Tester succès, absence de données, erreur, obsolescence et entrées limites.
3. Exécuter `npm run lint`, `npm run typecheck`, `npm test` et `npm run build`.
4. Pour une interface, vérifier au minimum une largeur mobile et l’accessibilité des actions.
5. Examiner les nouvelles dépendances et alertes sans appliquer de correction destructive automatique.
6. Consigner commandes, résultats et tests non exécutés dans `docs/current-state.md`.
7. Ne jamais qualifier de terminé un contrôle échoué sans documenter le blocage.
