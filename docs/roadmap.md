# Roadmap MVP

Chaque lot doit finir par lint, typecheck, tests, build et synchronisation documentaire.

## Lot 1 — Socle (terminé)

Next.js/TypeScript, layout mobile, navigation, PWA minimale, Leaflet, modèles initiaux, urgence élémentaire, documentation, ADR, skills et tests de fraîcheur.

## Lot 2 — Autour de moi

1. Terminé : consentement de géolocalisation depuis la carte, précision annoncée et erreurs permission/indisponibilité.
2. Terminé : calcul géodésique de distance et synthèse de la détection affichée la plus proche.
3. Terminé : recherche mondiale Photon/OpenStreetMap directement sur la carte, avec IGN Géoplateforme en secours.
4. Terminé : un lieu en `localStorage`, remplacement/suppression et tests.
5. Terminé : états permission refusée, hors-ligne et aucune donnée. Restant : tests UI automatisés de ces états.

## Lot 3 — Backend et modération

1. Terminé : PostgreSQL Neon, Prisma et migrations versionnées.
2. Partiel : stockage R2 et limites d’upload. Restant : stockage privé,
   suppression EXIF et analyse des médias.
3. Terminé : observation géolocalisée, photo légère ou lien vidéo, marqueur,
   expiration et vote enregistrés côté serveur.
4. Administration minimale et transitions de statut auditées.

## Lot 4 — Première source réelle et carte opérationnelle (partiellement terminé)

1. Terminé : choix NASA FIRMS et documentation licence/fréquence/précision.
2. Terminé : adaptateur CSV, conservation observation/ingestion et trois capteurs VIIRS.
3. Terminé : échec explicite, résultat partiel et indicateurs de fraîcheur.
4. Terminé : tests fixtures et affichage sourcé.
5. Terminé : vérification avec clé réelle, filtres temporels, regroupement au zoom, fond satellite et couche EFFIS hebdomadaire séparée et masquée par défaut.
6. Retiré de l’interface après évaluation : inspection Sentinel-2 L2A et pixels MTG-FRP, jugés trop ambigus ou trop retardés pour la lecture immédiate recherchée.
7. Terminé : couverture FIRMS mondiale par emprise visible et respect de la plage fournisseur de 1 à 5 jours.
8. Restant : schéma runtime complet, déduplication inter-capteurs différée et import/cache vectoriel EFFIS.

## Lot 5 — Informations officielles et vent

1. Terminé : couche optionnelle de vent à 10 m via Open-Meteo et modèles Météo-France, avec flèches animées dans le sens du déplacement de l’air, cadence relative à la vitesse, source, heure et avertissement d’interprétation.
2. Restant : adapter la densité au cadrage/zoom, surveiller les quotas et contractualiser un accès si l’usage devient commercial.
3. Terminé partiellement : liens directs vers FR-Alert, Géorisques/Météo des forêts et annuaire officiel des préfectures.
4. Restant : flux territorial structuré avec statuts/expiration, abris et routes fiables. Aucun flux national public adapté n’a encore été validé. Ne jamais calculer d’itinéraire d’évacuation.

## Lot 6 — Durcissement et pilote

Audit accessibilité/Lighthouse, PNG PWA, tests E2E mobile, budget performance, observabilité respectueuse, politique de cache/données, revue sécurité et déploiement pilote.

Le cache partagé des signalements et les limites applicatives sont en place.
Restent à configurer hors dépôt : règles Vercel WAF, domaine personnalisé R2,
alertes de dépenses et métriques, puis réglage de l’autoscaling Neon.

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

## Lot 9 — Confiance communautaire et modération

1. ✅ Limiter les créations par compte et par empreinte réseau sans conserver
   l’adresse IP brute.
2. ✅ Bloquer les doublons rapprochés d’un même auteur et regrouper visuellement
   les témoignages ponctuels proches de personnes différentes.
3. ✅ Appliquer une expiration courte adaptée à chaque catégorie.
4. Exiger la vérification de l’adresse e-mail avant la première contribution.
5. Construire un score de confiance progressif sans afficher de classement
   public des utilisateurs.
6. Détecter les votes coordonnés et interdire le vote sur sa propre
   contribution.
7. Ajouter une file de modération, un journal d'audit et des actions de
   suspension, regroupement et masquage.

## Lot 10 — Synchronisation temps réel

1. Terminé : diffuser les créations, modifications, suppressions et votes par
   Server-Sent Events après validation en base.
2. Terminé : reconnexion automatique côté client, heartbeat, validation
   runtime des événements et resynchronisation par instantané HTTP.
3. Terminé : relais inter-instances Vercel via Postgres `LISTEN/NOTIFY`
   (`pg_notify`), avec repli sur une relecture du signalement si la charge
   utile dépasse la limite `pg_notify` (8000 octets, par exemple une zone
   dessinée avec de nombreux points).
4. Restant : reconnexion automatique du relais serveur lui-même si la
   connexion `LISTEN` Postgres se coupe (bascule Neon, redémarrage), tests
   multi-instances et observabilité dédiée. La connexion Postgres utilisée
   doit être directe (non poolée par PgBouncer) : voir `.env.example`.

## Lot 11 — Retours utilisateurs prioritaires

Source : [`product/user-feedback-2026-07.md`](product/user-feedback-2026-07.md).

Ordre P0 retenu :

1. Mesurer puis optimiser zoom, déplacement, clustering et rendu des halos sur
   des téléphones modestes avec un jeu de données dense.
2. Auditer la présence et la compréhension de la source, de la date
   d'observation et de la dernière synchronisation sur chaque type de fiche.
3. Renforcer la confiance communautaire : e-mail vérifié, score explicable,
   votes coordonnés, preuve encouragée mais jamais obtenue au prix d'un danger.
4. Finaliser le mode hors connexion : données enregistrées, âge, expiration,
   impossibilité de confondre cache et information actuelle.
5. Terminer les tests mobiles, l'accessibilité et les raccourcis essentiels.

Ordre P1 après stabilisation :

6. Concevoir les alertes de proximité opt-in, avec rayon, fréquence, silence,
   désinscription et protection de la localisation.
7. Ajouter à la demande points d'eau, hôpitaux et accueils/refuges seulement
   après validation des sources, attributs, licences et fraîcheur.
8. Améliorer intensité thermique, fumée, occupation du sol et code couleur sans
   transformer ces données en niveau de gravité inventé.
9. Augmenter la place des médias vérifiés après modération, suppression EXIF et
   maîtrise des coûts R2.

## Lot 12 — API et partenariats

1. Spécifier une API publique Firemaps en lecture seule, versionnée, attribuée,
   documentée et limitée en débit.
2. Définir un contrat de données séparé pour officiel, satellite et citoyen ;
   ne jamais exposer les secrets fournisseurs ni les données privées.
3. Contacter autorités, associations et opérateurs de drones avant toute
   transmission automatisée ou fonction opérationnelle.
4. Étudier un mécanisme de dons uniquement après définition des bénéficiaires,
   obligations légales, frais et règles de transparence.

## Hors roadmap sans source ou validation adaptée

- itinéraire d'évacuation calculé ou promesse de « zone sûre » ;
- vitesse/direction de propagation déduite du vent seul ;
- notification automatique des secours sans intégration officielle ;
- nombre public de personnes bloquées ;
- migration animale extrapolée ;
- confirmation d'un feu ou consigne générée uniquement par IA.

# Après la vue opérationnelle

- Remplacer le WMS EFFIS par un flux vectoriel autorisé lorsqu’un endpoint
  pérenne est disponible, afin d’associer réellement les périmètres aux zones.
- Ajouter un backend de notifications push pour surveiller un lieu lorsque
  l’application est fermée sur tous les navigateurs. Le mode PWA actuel utilise
  déjà Periodic Background Sync lorsqu’il est disponible.
- Intégrer des communiqués préfectoraux ou SDIS uniquement lorsqu’une source
  structurée, attribuable et suffisamment homogène est disponible.
