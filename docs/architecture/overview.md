# Architecture actuelle

Monolithe Next.js 16 App Router en TypeScript, déployable sur Vercel. Les composants serveur sont utilisés par défaut ; Leaflet, le chargement de carte, la géolocalisation et le service worker restent côté client.

## Flux des détections

NASA FIRMS → `src/integrations/firms.ts` → route serveur `/api/incidents/firms` → modèle `Incident` traçable → filtres et regroupement client → Leaflet.

La clé FIRMS reste exclusivement côté serveur. Les trois capteurs sont
interrogés indépendamment ; la route peut rendre un résultat partiel. Une
réponse réussie est cachée cinq minutes par le CDN avec dix minutes de
`stale-while-revalidate`. La dernière réponse réussie disponible dans
l’instance serveur peut être rendue comme secours. Côté client, les erreurs
initiales déclenchent des reprises espacées ; une reconnexion ou le retour au
premier plan relance également FIRMS lorsque la carte est en erreur.

## Carte

Leaflet est chargé dynamiquement pour éviter le rendu serveur. Le fond par défaut combine Esri World Imagery et sa couche de noms/limites ; OpenStreetMap reste sélectionnable. Les points FIRMS sont regroupés jusqu’au zoom 11 et individuels ensuite. Ils ne produisent jamais de surface calculée.

EFFIS est d’abord interrogé par WFS (`ms:modis.ba.poly`) via
`/api/perimeters/effis`. Les entités GeoJSON sont normalisées, leur surface
déclarée est conservée ou calculée depuis la géométrie, puis associée aux
regroupements thermiques par inclusion spatiale. Si le WFS ne répond pas, la
couche raster WMS `modis.ba.poly.week` prend automatiquement le relais. Une
zone rouge reste une estimation consolidée, non une confirmation.

La recherche cartographique utilise `/api/geocoding/autocomplete`, qui valide la requête puis appelle l’autocomplétion IGN Géoplateforme. Le navigateur ne contacte pas directement le fournisseur. Les résultats normalisés recentrent Leaflet et restent uniquement en mémoire.

Le vent est chargé via `/api/weather/wind` pour alimenter les fiches de zone ;
le bouton Vent contrôle seulement les flèches. L’adaptateur Open-Meteo
interroge les modèles Météo-France sur une grille fixe de 20 points. Leaflet
interpole les quatre vecteurs les plus proches. Le vent ne contribue jamais au
score confirmant l’existence d’un feu.

Sentinel-2 est appelé à la demande depuis une fiche de zone. Le catalogue
cherche une image claire avant et après l’événement avec une marge de six
heures. Le rendu dNBR masque nuages, ombres et pixels invalides ; sans paire
valide, aucun résultat n’est montré. MTG-FRP reste expérimental et non exposé.

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

`src/domain` contient les modèles, la fraîcheur, le calcul de distance et le regroupement, indépendamment de l’interface. Il n’existe actuellement ni base, ni authentification, ni persistance distante. Supabase reste prévu pour les observations, la modération et les informations officielles.

Le prototype communautaire conserve jusqu’à 100 fiches dans `localStorage` et les blobs photo/vidéo dans IndexedDB, avec catégorie, position, précision annoncée, heure observée, média local ou URL vidéo, compteurs de votes et expiration. La position peut venir de l’appareil, d’une adresse IGN ou d’un point choisi sur la carte. Un vote par signalement et par navigateur est mémorisé localement. Trois confirmations avec au moins 67 % d’avis favorables produisent le libellé « soutenu par la communauté » ; deux contestations majoritaires produisent « contesté ». Ces statuts sont uniquement communautaires. Aucun contenu n’est synchronisé entre appareils avant le backend Supabase.

La découverte vidéo passe par `/api/videos/discover`. La route valide un nom de lieu, construit deux requêtes limitées aux domaines TikTok et Instagram, puis appelle Brave Search avec une clé exclusivement serveur. L’adaptateur filtre les autres domaines et déduplique les URL. L’outil ne scrape pas les plateformes, ne télécharge aucun média et ne publie aucun résultat sans action humaine.

Frontière cible des prochaines intégrations : fournisseur → adaptateur et validation runtime → modèle interne traçable → API/cache → interface avec états d’erreur et de fraîcheur.
