# Architecture actuelle

Monolithe Next.js 16 App Router en TypeScript, déployable sur Vercel. Les composants serveur sont utilisés par défaut ; Leaflet, le chargement de carte, la géolocalisation et le service worker restent côté client.

## Flux des détections

NASA FIRMS → `src/integrations/firms.ts` → route serveur `/api/incidents/firms` → modèle `Incident` traçable → filtres et regroupement client → Leaflet.

La clé FIRMS reste exclusivement côté serveur. Les trois capteurs sont
interrogés indépendamment ; la route peut rendre un résultat partiel. Une
réponse réussie est cachée cinq minutes par le CDN avec trente minutes de
`stale-while-revalidate`. La dernière réponse réussie disponible dans
l'instance serveur peut être rendue comme secours. Côté client, les erreurs
initiales déclenchent des reprises espacées ; une reconnexion ou le retour au
premier plan relance également FIRMS lorsque la carte est en erreur. L'emprise
est mondiale, les vues presque globales demandent un zoom supplémentaire et la
période FIRMS est limitée à cinq jours conformément à l'API fournisseur.

## Carte

Leaflet est chargé dynamiquement pour éviter le rendu serveur. Le fond par défaut combine Esri World Imagery et sa couche de noms/limites ; OpenStreetMap reste sélectionnable. Les points FIRMS sont regroupés jusqu’au zoom 11 et individuels ensuite. Ils ne produisent jamais de surface calculée.

EFFIS est d’abord interrogé par WFS (`ms:modis.ba.poly`) via
`/api/perimeters/effis`. Les entités GeoJSON sont normalisées, leur surface
déclarée est conservée ou calculée depuis la géométrie, puis associée aux
regroupements thermiques par inclusion spatiale. Si le WFS ne répond pas, la
couche raster WMS `modis.ba.poly.week` prend automatiquement le relais. Une
zone rouge reste une estimation consolidée, non une confirmation.

La recherche cartographique utilise `/api/geocoding/autocomplete`, qui valide
la requête puis appelle Photon/OpenStreetMap pour une couverture mondiale. IGN
Géoplateforme reste un secours métropolitain. Le navigateur ne contacte pas
directement les fournisseurs. Les résultats normalisés recentrent Leaflet et
restent uniquement en mémoire.

Le vent est chargé via `/api/weather/wind` pour alimenter les fiches de zone ;
le bouton Vent contrôle seulement les flèches. L’adaptateur Open-Meteo
interroge les modèles Météo-France sur une grille fixe de 20 points. Leaflet
interpole les quatre vecteurs les plus proches. Le vent ne contribue jamais au
score confirmant l’existence d’un feu.

Les routes expérimentales Sentinel-2 et MTG-FRP restent temporairement dans le
dépôt pour historique technique, mais leurs couches ont été retirées de
l'interface : leur temporalité et leur interprétation étaient trop ambiguës
pour la lecture immédiate recherchée.

## Informations officielles et contexte

`/api/official/notices` expose un tableau local strictement validé par
`src/domain/official-notice.ts`. Il constitue la frontière prévue pour un futur
back-office éditorial ; aucune consigne de démonstration n’est injectée.

Les autres sources restent séparées des détections :

- `/api/fire-danger/forest-weather` décompresse et normalise la dernière
  publication de l’archive CSV officielle Météo des forêts, l’associe aux
  contours départementaux officiels et conserve un cache de 15 minutes ;
- `/api/air-quality/current` normalise les conditions CAMS Europe retournées par
  Open-Meteo au point sélectionné ; `/api/air-quality/grid` échantillonne
  l’emprise visible sur 42 cellules au maximum pour la couche colorée ;
- `/api/context/nearby` interroge Overpass à la demande dans un rayon limité de
  15 km, déduplique implicitement les objets OSM et retourne au plus 30 lieux ;
- le WMS IGN 1.3.0 `LANDCOVER.FORESTINVENTORY.V2` est affiché directement par
  Leaflet via le point d’accès `/wms-r/wms` ;
- `/api/history/bdiff` appelle l’API publique de la réutilisation data.gouv.fr
  « Historique des feux de végétation par commune », filtre une année, puis
  limite les agrégats communaux à l’emprise utile. Le portail BDIFF direct n’est
  pas appelé côté serveur car sa chaîne de certificat n’est actuellement pas
  vérifiable par Node.js. La source reste annuelle et séparée du temps réel.

Ces données n’entrent pas dans le score d’existence d’un feu. Les consignes
officielles restent prioritaires ; les lieux OSM, la qualité de l’air, la
végétation, le relief et l’historique sont des couches de contexte.

## Fusion incendie

Le score de confiance dans `src/domain/fire-event-confidence.ts` reste
explicable. Il tient compte de la fraîcheur, du nombre de plateformes, de la
densité, de la répétition temporelle, de la confiance FIRMS, de la FRP et de la
présence éventuelle d’un périmètre EFFIS. Activité thermique, surface brûlée,
analyse optique et contexte météo restent des dimensions séparées.

## Domaine et persistance

`src/domain` contient les modèles, la fraîcheur, le calcul de distance et le
regroupement, indépendamment de l'interface. PostgreSQL Neon est accédé avec
Prisma. Better Auth gère les utilisateurs, comptes, sessions et vérifications.
Les signalements, géométries, médias et votes sont persistés côté serveur ; les
fichiers sont envoyés vers Cloudflare R2 au moyen d'URL signées courtes.

Les lectures communautaires partagent un cache Next/Vercel de 20 secondes,
invalidé après une création, une modification, un vote ou une suppression. Un
flux SSE de diffusion des changements est en cours de développement et n'est
pas encore considéré comme une fonctionnalité livrée.

La découverte vidéo passe par `/api/videos/discover`. La route valide un nom de lieu, construit deux requêtes limitées aux domaines TikTok et Instagram, puis appelle Brave Search avec une clé exclusivement serveur. L’adaptateur filtre les autres domaines et déduplique les URL. L’outil ne scrape pas les plateformes, ne télécharge aucun média et ne publie aucun résultat sans action humaine.

Frontière cible des prochaines intégrations : fournisseur → adaptateur et validation runtime → modèle interne traçable → API/cache → interface avec états d’erreur et de fraîcheur.
