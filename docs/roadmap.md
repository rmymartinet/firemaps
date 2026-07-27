# Roadmap MVP

Chaque lot doit finir par lint, typecheck, tests, build et synchronisation documentaire.

## Lot 1 — Socle (terminé)

Next.js/TypeScript, layout mobile, navigation, PWA minimale, Leaflet, modèles initiaux, urgence élémentaire, documentation, ADR, skills et tests de fraîcheur.

## Lot 2 — Autour de moi

1. Terminé : consentement de géolocalisation depuis la carte, précision annoncée et erreurs permission/indisponibilité.
2. Terminé : calcul géodésique de distance et synthèse de la détection affichée la plus proche.
3. Terminé : recherche et autocomplétion IGN Géoplateforme directement sur la carte.
4. Terminé : un lieu en `localStorage`, remplacement/suppression et tests.
5. Terminé : états permission refusée, hors-ligne et aucune donnée. Restant : tests UI automatisés de ces états.

## Lot 3 — Backend et modération

1. Projet Supabase et migrations versionnées.
2. RLS, stockage privé, suppression EXIF et limites d’upload.
3. Prototype local terminé : observation géolocalisée, photo légère ou lien vidéo, marqueur, expiration et vote. Restant : remplacer `localStorage` par un envoi `pending` synchronisé.
4. Administration minimale et transitions de statut auditées.

## Lot 4 — Première source réelle et carte opérationnelle (partiellement terminé)

1. Terminé : choix NASA FIRMS et documentation licence/fréquence/précision.
2. Terminé : adaptateur CSV, conservation observation/ingestion et trois capteurs VIIRS.
3. Terminé : échec explicite, résultat partiel et indicateurs de fraîcheur.
4. Terminé : tests fixtures et affichage sourcé.
5. Terminé : vérification avec clé réelle, filtres temporels, regroupement au zoom, fond satellite et couche EFFIS hebdomadaire séparée et masquée par défaut.
6. Retiré de l’interface après évaluation : inspection Sentinel-2 L2A et pixels MTG-FRP, jugés trop ambigus ou trop retardés pour la lecture immédiate recherchée.
7. Restant : schéma runtime complet, déduplication inter-capteurs différée et import/cache vectoriel EFFIS. L’outre-mer est hors périmètre demandé.

## Lot 5 — Informations officielles et vent

1. Terminé : couche optionnelle de vent à 10 m via Open-Meteo et modèles Météo-France, avec flèches animées dans le sens du déplacement de l’air, cadence relative à la vitesse, source, heure et avertissement d’interprétation.
2. Restant : adapter la densité au cadrage/zoom, surveiller les quotas et contractualiser un accès si l’usage devient commercial.
3. Terminé partiellement : liens directs vers FR-Alert, Géorisques/Météo des forêts et annuaire officiel des préfectures.
4. Restant : flux territorial structuré avec statuts/expiration, abris et routes fiables. Aucun flux national public adapté n’a encore été validé. Ne jamais calculer d’itinéraire d’évacuation.

## Lot 6 — Durcissement et pilote

Audit accessibilité/Lighthouse, PNG PWA, tests E2E mobile, budget performance, observabilité respectueuse, politique de cache/données, revue sécurité et déploiement pilote.

## Lot 7 — Lisibilité, performance et validation utilisateur

1. ✅ Regrouper les attributions cartographiques et les fournisseurs de données
   derrière un accès « Sources » discret, tout en conservant les mentions
   obligatoires immédiatement accessibles.
2. 🟡 Ajouter des tests visuels responsives pour détecter automatiquement les
   chevauchements sur mobile, tablette et petits écrans d’ordinateur.
   Le scénario Playwright et ses trois formats d’écran sont présents ; sa
   stabilisation dans l’environnement local reste à terminer.
3. ✅ Afficher partout une fraîcheur compréhensible, par exemple « Mis à jour il y
   a 18 min », sans présenter une détection satellite comme une confirmation.
4. ✅ Renforcer la distinction visuelle entre les détections satellite, les
   périmètres officiels et les signalements citoyens.
5. ✅ Conserver une légende miniature directement sur la carte pour expliquer les
   halos, couleurs et niveaux de confiance sans ouvrir un panneau complet.
6. ✅ Charger à la demande les couches secondaires et leurs données afin de
   réduire le temps d’affichage et la consommation réseau sur mobile.
7. 🟡 Tester le parcours complet avec des utilisateurs : repérer une zone,
   sélectionner un point ou tracer une limite, publier un signalement, ajouter
   une preuve puis retrouver et gérer sa contribution.
   Le protocole est prêt dans
   [`product/usability-test-plan.md`](product/usability-test-plan.md) ; les
   sessions avec de vrais utilisateurs restent à conduire.

## Lot 8 — Stabilisation avant nouvelles fonctionnalités

Ces travaux sont prioritaires avant d’élargir le périmètre fonctionnel :

1. Stabiliser et exécuter les scénarios Playwright sur mobile, tablette et
   ordinateur.
2. Faire tester le parcours complet par au moins cinq personnes selon le
   protocole prévu, puis corriger d’abord les blocages observés plusieurs fois.
3. Vérifier toutes les interactions tactiles sur de vrais appareils iPhone et
   Android, notamment les tracés, fenêtres, boutons de validation et zones
   proches des bords de l’écran.
4. Renforcer les états de réseau lent, hors connexion, délai dépassé et API
   indisponible, sans jamais présenter une absence de réponse comme une absence
   de feu.
5. Réaliser une passe d’accessibilité : clavier, focus, lecteurs d’écran,
   contrastes, tailles tactiles et réduction des animations.
6. Mesurer puis optimiser les performances lorsque beaucoup de signaux sont
   visibles simultanément, en particulier sur les téléphones modestes.
7. Vérifier dans tous les écrans que les détections satellite, informations
   officielles et contributions citoyennes restent clairement différenciées.

# Après la vue opérationnelle

- Remplacer le WMS EFFIS par un flux vectoriel autorisé lorsqu’un endpoint
  pérenne est disponible, afin d’associer réellement les périmètres aux zones.
- Ajouter un backend de notifications push pour surveiller un lieu lorsque
  l’application est fermée sur tous les navigateurs. Le mode PWA actuel utilise
  déjà Periodic Background Sync lorsqu’il est disponible.
- Intégrer des communiqués préfectoraux ou SDIS uniquement lorsqu’une source
  structurée, attribuable et suffisamment homogène est disponible.
