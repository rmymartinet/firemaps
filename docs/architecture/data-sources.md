# Sources de données

## NASA FIRMS — intégration implémentée

Fournisseur : NASA LANCE, Fire Information for Resource Management System.

- Origine : anomalies thermiques VIIRS Suomi-NPP, NOAA-20 et NOAA-21 en traitement proche du temps réel.
- Accès : API Area CSV avec `MAP_KEY` gratuite, conservée uniquement côté serveur.
- Couverture actuelle : France métropolitaine et Corse, boîte `-5.5,41,10,51.5`, dernières 24 heures.
- Fréquence : liée aux passages satellites ; FIRMS publie du NRT et ses services cartographiques sont actualisés jusqu’à toutes les 15 minutes. Cela ne garantit pas une nouvelle observation toutes les 15 minutes.
- Précision : pixel VIIRS nominal de 375 m ; le point est le centre d’un pixel contenant une anomalie, pas la position exacte d’une flamme.
- Limite API annoncée : 5 000 transactions par fenêtre de 10 minutes ; une requête peut compter plusieurs transactions.
- Format utilisé : CSV, normalisé vers `Incident` avec `sourceType: satellite`.
- Horodatages : `observedAt` vient de `acq_date`/`acq_time` FIRMS ; `updatedAt` reste égal à l’observation faute d’heure de révision fournisseur ; `ingestedAt` conserve la synchronisation Sentinel.
- Confiance : les signaux FIRMS élevés deviennent `probable`; tous les autres restent `unverified`. Aucun signal satellite ne devient `confirmed`.
- Résilience : les trois capteurs sont interrogés indépendamment ; un résultat partiel est signalé. Sans clé ou si tous échouent, aucun marqueur n’est affiché et l’indisponibilité est explicite.
- Conditions : données NASA ouvertes, avec attribution NASA FIRMS ; vérifier les mentions et conditions à chaque évolution du service.

Limites importantes : faux positifs possibles (autres sources de chaleur), feux petits ou masqués par nuage/fumée non détectés, doublons possibles entre capteurs et passages successifs, absence de confirmation opérationnelle. Les départements et territoires ultramarins ne sont pas encore interrogés.

Implémentation : `src/integrations/firms.ts` et `src/app/api/incidents/firms/route.ts`. La réponse HTTP est mise en cache 15 minutes par le CDN avec tolérance stale de 30 minutes ; les erreurs ne sont pas mises en cache.

## Fond cartographique

Deux fonds sont disponibles :

- Satellite par défaut : Esri World Imagery, compilation d’imagerie Esri, Maxar, Earthstar Geographics et communauté SIG, complétée par la couche de référence World Boundaries and Places.
- Plan : OpenStreetMap.

Les attributions sont affichées sur la carte. Ces services publics servent au prototype. Avant production, contractualiser ou confirmer explicitement les conditions d’usage, quotas, cache et niveau de service d’un fournisseur dimensionné. La date de l’imagerie satellite varie selon le territoire : elle ne représente pas une vue en direct et ne doit jamais servir à localiser visuellement un feu actuel.

## EFFIS — périmètres satellitaires estimés

Fournisseur : European Forest Fire Information System, Commission européenne / Joint Research Centre.

- Accès : WMS public `https://maps.effis.emergency.copernicus.eu/effis`.
- Couche active : `modis.ba.poly.week`, zones des sept derniers jours issues du produit EFFIS MODIS/Sentinel‑2.
- Couche rejetée pour l’interface : `effis.nrt.ba.poly`. Son regroupement automatique VIIRS produisait de grands blocs pouvant être interprétés à tort comme des périmètres fiables.
- Fréquence : produit consolidé plus tardif que FIRMS ; EFFIS traite quotidiennement MODIS et peut raffiner certains périmètres avec Sentinel‑2.
- Usage Sentinel : couche raster transparente, masquée par défaut, activable séparément, opacité 55 %, date courante transmise au paramètre `TIME`.
- Licence : contenu UE sous CC BY 4.0 sauf mention contraire ; attribution EFFIS / Union européenne affichée sur la carte.
- Limites : périmètre algorithmique et satellitaire, pas périmètre opérationnel confirmé ; feux petits ou récents potentiellement absents ; dépendance directe au WMS ; absence d’état détaillé par tuile dans Leaflet.

Les tests GetMap et WFS/GetFeature limités à la France n’ont pas répondu en 60 secondes et ont été interrompus. La couche raster ne bloque pas FIRMS ni le fond de carte, mais sa latence doit être surveillée avant production. Le rendu hachuré interactif exige un flux vectoriel, un proxy/cache EFFIS ou un autre fournisseur fiable ; il n’est pas simulé à partir des points FIRMS.

## Open-Meteo / Météo-France — vent modélisé

- Fournisseur API : Open-Meteo, endpoint Météo-France `https://api.open-meteo.com/v1/meteofrance`.
- Origine : modèles numériques AROME/ARPEGE de Météo-France, et non mesures prises sur place.
- Variables : vitesse et direction du vent à 10 m, ainsi que rafales, en km/h.
- Couverture actuelle : grille fixe légère de 20 points sur la métropole et la Corse.
- Sémantique : la direction fournisseur indique la provenance météorologique ; Sentinel inverse cette valeur de 180°, interpole les quatre points les plus proches sur la zone visible et anime les flèches vers la destination de l’air. La cadence varie relativement avec la vitesse interpolée.
- Usage : couche désactivée par défaut, chargée uniquement à son activation. Heure du modèle, vitesse et rafales restent accessibles.
- Cache : réponse réussie mise en cache 15 minutes par le CDN avec tolérance stale de 30 minutes ; erreur non mise en cache.
- Conditions : données Open-Meteo sous CC BY 4.0 avec attribution. L’accès gratuit annoncé est réservé au non-commercial ; un contrat commercial sera nécessaire si le produit change de cadre.
- Limites : grille météo espacée et interpolation d’écran purement visuelle, relief et phénomènes locaux non représentés, prévision susceptible d’évoluer. Le vent seul ne permet pas de prévoir la propagation d’un incendie.

Implémentation : `src/integrations/open-meteo.ts`, route `/api/weather/wind` et couche Leaflet dans `src/components/incident-map.tsx`.

## Copernicus Data Space / Sentinel Hub — Sentinel-2 haute définition (retiré de l’interface)

Cette intégration expérimentale n’est plus proposée à l’utilisateur depuis le 26 juillet 2026. Les éléments ci-dessous documentent l’implémentation serveur conservée temporairement dans le dépôt.

- Catalogue : API OData officielle Copernicus Data Space, sans secret, limitée aux produits Sentinel-2 L2A couvrant le point choisi sur les 60 derniers jours.
- Rendu : Sentinel Hub Process API authentifiée par OAuth2 client credentials, exclusivement côté serveur.
- Emprise : carré d’environ 2 × 2 km autour du lieu recherché, géolocalisé ou surveillé ; image PNG 512 × 512. Réduire l’emprise améliore le cadrage mais ne dépasse pas la résolution physique des bandes.
- Modes : couleurs naturelles à 10 m ; composition « Infrarouge SWIR » dont certaines bandes sont à 20 m ; « Changements » calcule le dNBR entre une image avant et une image après.
- dNBR : deux entrées Sentinel-2 distinctes dans une requête Data Fusion ; masquage des classes nuage/ombre/neige SCL ; pixels sous 0,1 transparents puis échelle jaune/orange/rouge. Il s’agit d’une aide visuelle, pas d’une classification validée.
- Temporalité : jusqu’à huit acquisitions récentes sélectionnables, avec date et couverture nuageuse du produit.
- Cache : catalogue une heure ; image réussie un jour avec tolérance stale d’une semaine.
- Quotas : chaque rendu consomme des unités de traitement Copernicus ; aucune image n’est demandée avant activation volontaire et sélection d’une acquisition.
- Sécurité : `COPERNICUS_CLIENT_ID` et `COPERNICUS_CLIENT_SECRET` ne sont jamais exposés au navigateur ; le jeton OAuth est réutilisé côté serveur jusqu’à proximité de son expiration.
- Limites : Sentinel-2 n’est pas en direct, revisite nominale de cinq jours, nuages/fumée possibles. Le dNBR peut aussi réagir aux récoltes, sécheresses, ombres et autres changements de végétation. Les compositions visuelles ne constituent ni une détection de flamme, ni une confirmation, ni un périmètre brûlé.

Le catalogue STAC public a été testé deux fois le 25 juillet 2026 sans recevoir d’octet en 15 puis 45 secondes. L’API OData officielle a répondu HTTP 200 en environ sept secondes et a donc été retenue. Implémentation : `src/integrations/copernicus.ts` et routes `/api/satellite/sentinel-2/scenes` et `/api/satellite/sentinel-2/image`.

## Non connectées

Aucune source officielle de confirmation, consigne ou périmètre opérationnel n’est connectée. EFFIS reste une estimation satellite, pas une confirmation officielle. La météo connectée est une sortie de modèle, pas une observation locale officielle.

## Portails officiels référencés, sans synchronisation

- FR-Alert : portail national des alertes et consignes. Sentinel fournit un lien direct vers les alertes en cours, mais aucune API publique documentée n’a été validée pour une ingestion automatique.
- Géorisques / Météo des forêts : information officielle sur le danger départemental en saison ; il s’agit d’un niveau de danger prévisionnel, pas d’incendies actifs.
- Annuaire Service-Public.fr : accès aux sites des préfectures et autorités locales.

Ces liens améliorent l’accès aux informations compétentes sans transformer une page web en faux flux structuré. L’absence de publication visible ne prouve pas l’absence de danger.

## IGN Géoplateforme — autocomplétion connectée

- Fournisseur : IGN, service national Géoplateforme alimenté par la BAN, BD TOPO et Parcellaire Express.
- Endpoint amont : `https://data.geopf.fr/geocodage/completion/`.
- Usage : adresses et points d’intérêt en métropole, six suggestions maximum après trois caractères.
- Fréquence : la documentation BAN annonce une actualisation du moteur deux fois par semaine.
- Quota public : 10 requêtes par seconde et par IP pour l’autocomplétion.
- Précision : coordonnées du localisant retourné ; elles ne constituent pas une position de l’utilisateur.
- Résilience : debounce client de 350 ms, timeout serveur de 5 s, erreur visible, aucune mise en cache.
- Vie privée : texte recherché transmis à Sentinel puis à l’IGN, sans persistance applicative. Les réponses et la sélection restent en mémoire.
- Limites : couverture actuelle forcée à `METROPOLE`; l’outre-mer sera ajouté avec un choix de territoire. La disponibilité n’est pas garantie.

Implémentation : `src/integrations/geoplateforme.ts`, route `/api/geocoding/autocomplete` et `src/components/map-search.tsx`.

## Checklist avant connexion

Documenter fournisseur, origine, licence/conditions, format, fréquence, précision spatiale et temporelle, limites, stratégie d’erreur, dernière réussite et normalisation. Conserver `observedAt` du fournisseur distinct de l’ingestion et de `updatedAt`.

## Brave Search — découverte de vidéos publiques

- Usage : trouver des pages TikTok et Instagram potentiellement liées à un lieu et à un feu, sans scraper directement ces plateformes.
- Accès : Web Search API avec `BRAVE_SEARCH_API_KEY`, conservée exclusivement côté serveur.
- Requêtes : une recherche limitée à TikTok et une limitée aux Reels Instagram, combinant le lieu avec feu, incendie, fumée et feu de forêt.
- Traitement : filtrage strict des domaines, déduplication par URL et présentation dans une file de vérification.
- Limites : l’index peut être incomplet ou retardé ; le titre, la description et les hashtags ne prouvent ni le lieu ni la date de captation. Une validation humaine reste obligatoire.
- Données : Sentinel conserve seulement les liens choisis dans le prototype communautaire ; aucune vidéo n’est copiée ou téléchargée.

Implémentation : `src/integrations/video-discovery.ts`, route `/api/videos/discover` et page `/videos`.
# MTG-FRP — EUMETSAT / LSA SAF (retiré de l’interface)

Cette intégration expérimentale n’est plus proposée à l’utilisateur depuis le 26 juillet 2026. La route serveur est conservée temporairement pour historique technique.

La carte prévoit une couche distincte pour le produit de démonstration
`EO:EUM:DAT:1156` / `LSA-509 MTFRPPIXEL`. Le capteur géostationnaire produit
nominalement une observation toutes les 10 minutes à environ 1 km. Chaque pixel
fournit une puissance radiative du feu (FRP), une incertitude et une confiance.

Cette couche ne représente jamais une surface brûlée ni un périmètre confirmé.
Elle utilise des carrés correspondant à la résolution nominale afin de ne pas
donner une fausse précision.

Le catalogue EUMETSAT référence le produit, mais les fichiers opérationnels
`ListProduct` sont actuellement distribués par le serveur LSA SAF avec une
authentification Basic distincte. Les variables `EUMETSAT_CONSUMER_KEY`,
`EUMETSAT_CONSUMER_SECRET` et `EUMETSAT_API_TOKEN` ne remplacent donc pas
`LSASAF_USERNAME` et `LSASAF_PASSWORD`.

L’API interne `/api/incidents/mtg` :

- découvre le fichier le plus récent sur les trois derniers jours ;
- télécharge et décompresse le CSV côté serveur ;
- filtre les pixels sur la France métropolitaine ;
- ne renvoie jamais les identifiants au navigateur ;
- signale explicitement une observation âgée de plus de 60 minutes.
