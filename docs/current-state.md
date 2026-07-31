# État actuel

Mis à jour le 2026-07-31. Source de vérité opérationnelle.

## État global

Firemaps est une PWA mobile-first mondiale. Avec une clé configurée, la carte
affiche les anomalies thermiques VIIRS de l'emprise visible sur une période de
1 à 5 jours ; elles ne constituent jamais des incendies confirmés. Les comptes,
signalements, médias et votes disposent désormais d'un backend persistant.

## Terminé

- Next.js 16 / React 19 / TypeScript / App Router.
- Tailwind CSS v4 configuré via PostCSS ; migration du shell et de la navigation
  effectuée. La migration des composants continue, tandis que Leaflet, les
  filtres SVG et les animations conservent une petite feuille globale technique.
- Shell cartographique responsive ; Informations, urgence, compte et outils s'ouvrent sans quitter la carte.
- Carte Leaflet initialement cadrée sur la France mais capable de charger FIRMS partout dans le monde.
- Adaptateur CSV NASA FIRMS pour VIIRS Suomi-NPP, NOAA-20 et NOAA-21.
- Gestion d’une source partielle, absente ou non configurée sans masquer l’échec.
- Séparation de l’heure d’observation fournisseur et de l’heure d’ingestion.
- Regroupement cartographique jusqu’au zoom 11, filtres 3/6/12/24 h, opacité selon l’âge et taille selon FRP. Aucun halo de surface n’entoure les points.
- Couche hebdomadaire EFFIS MODIS/Sentinel‑2 via WMS, désactivable et masquée par défaut.
- Couche optionnelle de vent modélisé à 10 m via Open-Meteo/Météo-France : flèches animées couvrant la carte, orientées vers la destination de l’air, cadence relative à la vitesse, heure et avertissement anti-confusion avec la propagation.
- Couches Sentinel-2 L2A et MTG-FRP retirées de l’interface après évaluation : elles ne répondaient pas assez clairement à la lecture immédiate des signaux récents.
- Fond hybride Esri World Imagery par défaut, avec limites/noms, et bascule vers OpenStreetMap.
- Légende explicite : point FIRMS = surface inconnue ; zone rouge EFFIS = estimation disponible ; absence de zone ≠ absence de feu.
- Barre de recherche mondiale directement sur la carte avec Photon/OpenStreetMap, secours IGN Géoplateforme, recentrage et repère de lieu.
- Sélection manuelle d’un lieu par clic sur la carte, avec coordonnées, distance et surveillance locale.
- Géolocalisation consentie sur la carte, précision navigateur, calcul de distance vers la détection affichée la plus proche et avertissement sans verdict de sécurité.
- Un lieu surveillé stocké uniquement dans `localStorage`, remplaçable, consultable et supprimable.
- État hors ligne visible ; dernier FIRMS/vent réussi réutilisable par le service worker, sans mise en cache des recherches d’adresse.
- Centre Informations structuré en trois parties : consignes immédiates sourcées, explication des signaux/hachures/EFFIS/vent et accès à FR-Alert, Géorisques/Météo des forêts et l’annuaire officiel des préfectures, sans fausse synchronisation.
- La liste de suggestions se ferme après sélection, avec Échap ou lors d’un clic extérieur, sans relancer la recherche choisie.
- Navigation principale simplifiée à Carte/Informations/Urgence ; l’ancienne page adresse reste non liée en attente du flux de surveillance.
- Écran urgence avec appels 112/18 et géolocalisation à la demande.
- Le panneau `Signaux` donne accès, sans ajouter de commande permanente sur la
  carte, à une fiche d’urgence liée au pays sous le point sélectionné ou au
  centre de la carte. La première version couvre les 27 pays de l’Union
  européenne avec le 112 et les États-Unis avec le 911, détecte le pays
  localement, permet une correction
  manuelle, copie les coordonnées et exige une confirmation avant d’ouvrir
  l’appel.
- Formulaire communautaire mobile-first : catégorie, géométrie point/zone/limite, date automatique, recherche mondiale ou position choisie, description et photo/vidéo facultative.
- Un clic libre sur la carte ouvre automatiquement la popup du point choisi avec « Signaler ici » et « Annuler ». Le signalement s’ouvre dans une feuille modale au-dessus de la carte, sans navigation, puis actualise immédiatement les marqueurs locaux.
- La feuille modale est optimisée pour un signalement en quelques secondes : catégorie, média facultatif, publication ; heure, point, statut et expiration sont automatiques. Les champs secondaires sont repliés.
- Refonte de lisibilité mobile : carte dominante, résumé vitré compact, périodes « Maintenant/Aujourd’hui/24 heures », localisation et signalement flottants, couches regroupées sous « Ce que je veux voir » et vocabulaire non technique.
- Les popups satellite montrent d’abord une phrase simple, l’âge et l’absence éventuelle de confirmation officielle ; capteur, confiance, FRP et limites détaillées restent accessibles sous « Voir les détails ».
- Better Auth, PostgreSQL Neon/Prisma, Cloudflare R2, marqueurs communautaires distincts, fiche média, confirmations/contestations et expiration selon la catégorie.
- Outil de découverte vidéo semi-automatique : recherche Brave ciblée par lieu sur les liens publics TikTok/Instagram, déduplication, ouverture pour vérification et préremplissage du signalement.
- Manifeste, icône SVG, service worker réseau-d’abord limité au shell.
- Modèles TypeScript, règles de fraîcheur, distance, stockage local, regroupement et normalisation, avec vingt-et-un tests unitaires et un test d’interface.
- Documentation, dix ADR et huit skills persistants.

## En cours

- Diffusion SSE des changements communautaires après écriture en base : bus,
  route, heartbeat, reconnexion et tests unitaires sont présents dans le travail
  local, mais les tests multi-clients et la documentation d'exploitation restent
  à finaliser avant de considérer ce lot comme livré.
- Stabilisation E2E responsive et validation du parcours avec de vrais utilisateurs.

## Non commencé

Administration complète de modération, journal d'audit, vérification obligatoire
de l'e-mail avant contribution, nettoyage/analyse des médias, ingestion mondiale
structurée de confirmations officielles, météo locale plus dense,
déduplication durable inter-capteurs et notifications push serveur.

## Architecture actuelle

Monolithe Next.js ; composants serveur par défaut, Leaflet et chargement des
incidents côté client. Domaine typé dans `src/domain`. Les intégrations externes
passent par des routes serveur. PostgreSQL Neon/Prisma persiste les contributions,
Better Auth gère l'identité et Cloudflare R2 stocke les médias.

## Dette technique et limites

- Le cache PWA est minimal et n’affiche pas encore un état hors-ligne.
- L’icône installable n’existe qu’en SVG ; PNG 192/512 requis avant pilote.
- Les tuiles OSM publiques servent au développement uniquement ; fournisseur production à choisir.
- Pas de validation runtime des données ni tests UI/E2E.
- Le parseur FIRMS valide les coordonnées mais pas encore chaque champ avec un schéma runtime complet.
- Les détections de plusieurs capteurs ou passages peuvent se superposer.
- Le clustering est un regroupement d’interface glouton, pas une identification d’incident.
- La couche EFFIS est raster, sans état d’erreur détaillé ni fiche de périmètre.
- La couche NRT VIIRS EFFIS a été retirée de l’interface après observation de grands blocs trompeurs ; `modis.ba.poly.week`, plus consolidée mais plus lente, la remplace.
- Les hachures EFFIS ne sont pas encore réalisables : WFS/GetFeature n’a renvoyé aucune donnée en 60 s. Aucun faux polygone FIRMS n’est généré.
- L’imagerie Esri n’est pas en direct ; licence, quota et fournisseur doivent être contractualisés ou confirmés avant production.
- La route FIRMS couvre le monde mais refuse les vues presque globales et ne peut demander que 1 à 5 jours à l'API Area.
- La recherche mondiale dépend du service public Photon ; IGN ne couvre que le repli métropolitain. Une forte audience exigera un service de géocodage dimensionné.
- Le vent est une sortie de modèles AROME/ARPEGE sur une grille fixe espacée : il ne reflète pas nécessairement le relief ou les rafales locales et ne prédit pas le déplacement du feu.
- L’offre Open-Meteo gratuite documentée convient au prototype non commercial ; un usage commercial exigera une offre adaptée.
- Une recherche peut apparaître dans les journaux d’URL de l’hébergeur ou du fournisseur ; politique de rétention à définir avant production.
- Aucun flux public national documenté ne permet actuellement d’ingérer proprement toutes les consignes opérationnelles SDIS/préfectures ; les portails officiels sont seulement liés.
- Le cache hors ligne ne possède pas encore de durée d’expiration ferme côté navigateur.
- Les routes serveur expérimentales Sentinel-2 et MTG-FRP restent dans le dépôt alors que leurs couches clientes ont été retirées ; elles pourront être supprimées lors d’un nettoyage technique.
- Les contributions sont persistées dans Neon et les médias dans R2. Le stockage local ne constitue plus la source partagée de vérité.
- La découverte vidéo dépend de l’indexation du moteur Brave : elle peut manquer des publications récentes, retourner des vidéos anciennes ou attribuées à tort au lieu recherché. Aucun candidat n’est publié automatiquement.
- Aucun traitement serveur ne retire encore les EXIF des photos. R2, les limites de débit et l'authentification sont présents, mais nettoyage des métadonnées, analyse et modération restent requis pour un déploiement à grande échelle.
- `npm audit --omit=dev` remonte trois paquets de production (`next`, `postcss`, `sharp`) avec sévérité haute. Le correctif automatique proposé rétrograde Next.js vers 9.3.3 et n’est donc pas acceptable ; surveiller une correction amont, sans `audit fix --force`.

## Blocages

Les services externes doivent être configurés dans chaque environnement de
déploiement. Avant une ouverture à grande échelle, il reste surtout à ajouter
la vérification obligatoire de l'e-mail, le nettoyage/analyse des médias et une
interface de modération avec journal d'audit.

## Risques

Interprétation erronée d’une anomalie ou d’un périmètre estimé comme feu confirmé ; confusion du vent modélisé avec une prévision de propagation ; faux positifs ou feux manqués ; disponibilité/latence/quota FIRMS et Open-Meteo ; forte latence WMS EFFIS observée ; géolocalisation sensible ; politique tuiles ; obsolescence hors ligne ; modération insuffisante.

## Prochaines étapes recommandées

Ajouter des tests UI/E2E mobiles sur la géolocalisation, le stockage et le mode hors ligne. Poursuivre la recherche d’un flux officiel territorial contractualisable et d’une stratégie d’import/cache vectoriel EFFIS.

## Commandes utiles

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Tests et build

Historique de validation complète du 2026-07-25 (les nombres de routes et de
tests ci-dessous décrivent ce jalon, pas le dépôt actuel) :

- `npm run lint` : réussi.
- `npm run typecheck` : réussi.
- `npm test` : réussi, 9 fichiers et 22 tests.
- `npm run build` : réussi, 7 routes statiques et 5 routes dynamiques (FIRMS, autocomplétion, vent et deux routes Sentinel-2).
- Appel FIRMS réel du 2026-07-25 : HTTP 200, 1 228 détections normalisées ; Suomi-NPP et NOAA-21 réussis, NOAA-20 indisponible. L’état partiel prévu fonctionne.
- Catalogue EFFIS GetCapabilities : réussi. GetMap de l’ancienne couche NRT EFFIS : interrompu après plus de 60 s sans réponse.
- WFS EFFIS France : deux tentatives interrompues après 30 puis 60 s sans aucun octet.
- Tuile Esri World Imagery : réponse JPEG 256 × 256 réussie.
- Autocomplétion de bout en bout : HTTP 200, six suggestions normalisées pour une adresse de test.
- Vent de bout en bout : HTTP 200, 20 points normalisés avec vitesse, direction, rafales et heure du modèle.
- Catalogue Copernicus de bout en bout : HTTP 200, 17 acquisitions Sentinel-2 L2A normalisées autour de Bordeaux. Les trois premiers rendus OAuth ont été vérifiés visuellement ; le mode Brûlé mono-date trompeur a ensuite été remplacé par Changements dNBR avant/après.
- Catalogue STAC Copernicus : deux tentatives interrompues après 15 puis 45 secondes sans octet ; catalogue OData retenu après réponse HTTP 200 en environ sept secondes.
- Démarrage HTTP local : réussi avec autorisation ciblée sur `127.0.0.1:3010`, puis serveur arrêté proprement.
- Validation officielle des huit skills : réussie avec le validateur `quick_validate.py` et un `PyYAML` installé temporairement dans `/tmp`.

## Déploiement

L'application est déployable sur Vercel avec PostgreSQL Neon, Cloudflare R2 et
Resend. Les variables requises sont décrites dans `.env.example`. Les règles
WAF, le domaine média personnalisé, les alertes de dépenses et les seuils
d'autoscaling restent des opérations manuelles documentées dans
`docs/architecture/security.md`.

## Sources connectées

NASA FIRMS VIIRS est active via `NASA_FIRMS_MAP_KEY` sur les plateformes
SNPP, NOAA-20 et NOAA-21. Les observations proches sont dédupliquées et les
anomalies explicitement classées comme volcan, source statique ou détection
offshore sont écartées.

EFFIS est interrogé par WFS pour obtenir les géométries et hectares. Lorsque le
service vectoriel est indisponible, la couche WMS reste automatiquement
affichable sans inventer de surface.

Open-Meteo fournit le vent issu des modèles Météo-France. Photon/OpenStreetMap
fournit l'autocomplétion mondiale, avec IGN Géoplateforme comme secours
français. Esri World Imagery fournit le fond satellite par défaut et
OpenStreetMap le fond plan.

Sentinel-2 a été évalué depuis la fiche d'une zone comme analyse optique
différée avant/après. Cette expérimentation a finalement été retirée de
l'interface, comme MTG-FRP ; seules leurs routes serveur restent temporairement
dans le dépôt.

## Lecture opérationnelle de la carte

- L’interface de carte est désormais compacte : un bouton flottant affiche le
  nombre de signaux et ouvre à la demande le détail, les couches, la chronologie
  et la légende.
- Les réglages courants sont accessibles depuis une colonne d’icônes
  indépendantes : fond de carte, zones estimées, vent, partage, informations et
  localisation. Chaque icône repose sur un fond crème translucide, hachuré de
  fins traits graphite et entouré d’un contour unique légèrement irrégulier.
  Une option active utilise des hachures et un contour rouge feu. Ce traitement
  conserve la lisibilité sur l’imagerie satellite tout en évoquant une
  annotation dessinée sur la carte.
- L’action de signalement reste une icône ronde distincte afin de conserver la
  carte presque entièrement visible.
- La recherche d’adresse reste visible, car elle constitue l’entrée principale
  pour atteindre rapidement un lieu.
- Le panneau détaillé ne répète plus les commandes de fond de carte, de zones
  estimées et de vent, déjà accessibles depuis la colonne d’icônes.
- Le panneau détaillé reprend le même langage graphique que les outils :
  papier crème translucide, texture hachurée discrète, contours graphite
  légèrement irréguliers et sélection rouge feu. Les textes d’information
  conservent une typographie standard pour rester immédiatement lisibles.
- Son contenu est recentré sur la situation : nombre de signaux, message de
  lecture prudent, dernière observation et trois secteurs prioritaires. Les
  informations FIRMS, la synchronisation, la déduplication et l’actualisation
  sont regroupées sous « Détails techniques ».
- La surveillance d’un lieu et les alertes disposent maintenant de leur propre
  commande étoile dans la colonne d’outils. Le partage reste une commande
  extérieure et la légende est consultable depuis la page Informations.
- Les zones hachurées affichent au survol une fiche courte avec le nombre de
  signaux, la dernière observation, la FRP, le déplacement apparent, le vent et
  la confiance. Le clic ouvre une fiche complète. La surface reste explicitement
  indisponible sans périmètre adapté ; le déplacement des centroïdes et le vent
  sont présentés comme des observations distinctes, jamais comme une prévision
  du front de feu.
- Sur écran tactile, le toucher remplace le survol et ouvre la fiche complète.
  Les fiches sont limitées à la largeur et à la hauteur de l’écran, le panneau
  de surveillance devient une feuille inférieure, et la colonne d’outils ainsi
  que la chronologie utilisent des dimensions mobiles dédiées.
- Un outil de mesure de distance est disponible dans la colonne d’icônes. Les
  clics ajoutent immédiatement des sommets. Dès le premier point, une ligne
  provisoire suit le pointeur et la distance cumulée est mise à jour en direct ;
  un double-clic fixe le dernier point et termine le tracé. Pendant la mesure,
  la sélection de lieu et le zoom au double-clic sont suspendus.
- Un second outil mesure une surface. Les clics ajoutent des sommets et la forme
  suit le pointeur ; un clic sur le premier sommet ou un double-clic ferme le
  polygone. Le résultat est affiché au centre en hectares sous 1 km², puis en
  kilomètres carrés. Les outils distance et surface sont mutuellement exclusifs.
- Une mesure terminée reste visible lorsque son outil est désactivé ou lorsqu’un
  autre outil est choisi. Elle n’est supprimée que par un clic explicite sur la
  croix intégrée à son étiquette de résultat.
- La fermeture par double-clic, ou par retour au premier sommet pour une
  surface, désactive automatiquement l’outil. La mesure reste affichée, mais
  l’utilisateur doit réactiver l’icône pour commencer un nouveau tracé.
- Les étiquettes de résultat n’utilisent plus une largeur fixe : elles
  s’adaptent automatiquement aux grandes valeurs tout en restant centrées sur
  la mesure, sans comprimer le nombre ni la croix.
- Les coordonnées géographiques du pointeur sont affichées discrètement en bas
  à gauche au format degrés, minutes et secondes. Sur écran tactile, la dernière
  position touchée met à jour cette lecture.
- La chronologie est affichée directement en bas de la carte et reste
  indépendante du panneau : lecture, sélection des douze dernières heures,
  heure visualisée et retour immédiat à « Maintenant ».
- La barre de navigation blanche inférieure est masquée sur la carte, qui occupe
  désormais toute la hauteur disponible sous l’en-tête. Les accès aux
  informations, au signalement et à la localisation restent disponibles sous
  forme de commandes rondes sur la carte ; l’urgence reste accessible dans
  l’en-tête. Les pages de contenu conservent leur navigation inférieure.

- FIRMS est rafraîchi automatiquement toutes les 10 minutes et peut être
  actualisé manuellement. Le cache partagé est limité à 5 minutes.
- Les signaux utilisent rouge (moins de 3 h), orange (3 à 6 h) et gris
  (6 à 12 h).
- Les zones hachurées reposent sur un regroupement dense d’au moins trois
  détections dans un voisinage de 2,5 km. Elles ne sont jamais présentées comme
  une surface brûlée.
- La fiche de zone affiche dernière observation, tendance sur deux fenêtres de
  3 h, confiance, somme des FRP disponibles et distance du lieu choisi.
- Une chronologie permet de rejouer les douze dernières heures.
- Une adresse enregistrée peut recevoir des alertes locales dans un rayon de 5,
  10, 25 ou 50 km. Dans le MVP, ces notifications fonctionnent uniquement
  lorsque l’application est ouverte.
- EFFIS reste un WMS raster : son contour est visible, mais ne peut pas encore
  être associé géométriquement de façon fiable à une zone FIRMS. La fiche
  l’indique explicitement, comme elle indique l’absence de confirmation
  opérationnelle nationale.

## Fiabilité et navigation avancées

- Les observations situées à moins de 750 m et 15 minutes sont fusionnées avant
  les calculs. La FRP la plus forte est conservée au lieu d’additionner des
  mesures potentiellement identiques.
- Trois vues sont proposées : signaux récents (3 h), récentes (12 h) et historique
  disponible (24 h).
- Un indicateur global distingue données récentes, anciennes, partielles ou
  indisponibles.
- Les zones sont classées par tendance, confiance, FRP et proximité du lieu
  sélectionné. Leur bouton replace la carte sur la zone.
- Une flèche peut relier les centroïdes des signaux de deux périodes de 3 h.
  Elle représente un déplacement observé, jamais une prévision de propagation.
- Le partage sérialise latitude, longitude, zoom et identifiant de zone dans
  l’URL.
- Les calculs de dessin et de regroupement sont limités à l’emprise visible
  élargie de 25 %. Les synthèses nationales restent calculées sur le petit jeu
  FIRMS des dernières 24 h ; un Web Worker ne devient utile qu’à un volume
  nettement supérieur.
- Les états ne reposent pas uniquement sur la couleur : hachures, bordures,
  libellés, infobulles, focus clavier et réduction des animations sont prévus.

## Alertes en arrière-plan

Le service worker stocke localement la configuration d’alerte et utilise
`Periodic Background Sync` lorsque le navigateur et l’installation PWA le
permettent. Cette API reste peu disponible et sa fréquence est contrôlée par le
navigateur. Le service worker sait aussi recevoir un événement Web Push, mais
une livraison garantie nécessite toujours :

- un abonnement Push enregistré côté serveur ;
- des clés VAPID ;
- un stockage durable ;
- une tâche serveur de surveillance.

## Contexte opérationnel et territorial

- Un outil « Consignes officielles » affiche uniquement des avis validés par le
  schéma `OfficialNotice` : source HTTPS, publication, dernière vérification,
  position et éventuelle expiration. Les catégories couvrent état du feu,
  évacuation, confinement, route ou forêt fermée et lieu d’accueil. Le flux
  éditorial est volontairement vide tant qu’aucune source opérationnelle n’est
  raccordée. L’interface précise qu’une liste vide ne signifie pas une absence
  de consigne.
- Les niveaux Météo des forêts J+1/J+2 sont lus dans l’archive CSV officielle
  Météo-France. Le bouton dédié colore directement les contours départementaux
  selon le niveau J+1 ; la légende rappelle la date de publication et un clic
  sur une zone donne les niveaux J+1/J+2. Cette couche n’est jamais présentée
  comme une carte des feux actifs.
- Les détections FIRMS produisent aussi une empreinte thermique visuelle sous
  les points : les halos proches fusionnent et leur intensité dépend de la
  fraîcheur, du nombre de signaux et de la puissance radiative disponible.
  Cette empreinte reste explicitement distincte d’un périmètre de feu ou d’une
  surface brûlée.
- Les hachures et le bouton « zones estimées » sont temporairement retirés de
  la carte. Les détections FIRMS sont représentées par leurs points et leurs
  halos thermiques uniquement ; les données EFFIS restent raccordées côté
  serveur pour une réintroduction ultérieure mieux définie.
- Les marqueurs FIRMS utilisent un rendu compact de type cible thermique :
  noyau lumineux précis, double anneau fin, réticule et lueur rouge maîtrisée.
  Leur teinte et leur opacité continuent d’indiquer la fraîcheur du signal.
- Les regroupements reprennent le même langage visuel avec une cible légèrement
  plus grande et un petit compteur déporté. Ils restent distincts d’un
  périmètre d’incendie.
- Sur la page cartographique, l’en-tête blanc global est masqué et la carte
  occupe toute la hauteur de l’écran. Les autres pages conservent leur en-tête.
- Le bouton Informations ouvre les explications dans un panneau latéral
  attaché aux outils sur ordinateur, sans masquer le centre de la carte. Sur
  mobile, il devient une feuille qui monte depuis le bas et redescend à la
  fermeture. Son contenu reste progressif : urgence visible immédiatement,
  définition des points ouverte par défaut, puis accordéons pour la
  protection, les autres couches et les sources.
- Les modales applicatives utilisent par défaut le même langage que Réglages :
  feuille blanche, double contour irrégulier, sections rectangulaires au stylo
  et contrôles sans aplats inutiles. La modale Informations conserve
  volontairement sa présentation dédiée.
- Les outils ne forment plus une longue colonne permanente. La capsule
  supérieure sépare quatre capsules : Réglages seul, Informations + Partage,
  Distance + Surface, puis Géolocalisation seule. En bas à droite, une autre
  capsule conserve Fond, Apparence, Vent et « … », au-dessus d’un zoom
  `+ / −` séparé.
  Ces capsules sont transparentes et utilisent un double contour volontairement
  irrégulier. Leurs boutons blancs et leurs icônes SVG à traits légèrement
  décalés installent le langage visuel dessiné au stylo de la carte.
- Le bouton ⚙️ est désormais distinct de « … ». Il ouvre des préférences
  mémorisées localement : police standard ou Crayon, taille des foyers,
  intensité des halos, infobulles, fuseau et format horaire, vitesse de lecture,
  unités du vent, des mesures et des coordonnées, taille du texte, contraste,
  réduction des animations, grands contrôles mobiles et rayon d’alerte.
  « … » reste réservé aux couches et fonctions secondaires. Sur mobile, son
  panneau passe devant la colonne d’outils, avec une légère marge contre le
  bord droit afin qu’aucun bouton partiellement visible ne gêne la lecture.
  Les halos thermiques,
  qui représentent l’information principale, restent toujours visibles et
  n’occupent plus un bouton. « … » ouvre
  les couches secondaires sous forme de lignes nommées ; sur mobile, ce panneau
  devient une feuille en bas d’écran.
- Un mode Nuit mémorisé est disponible directement dans la barre principale
  de la carte. Au premier
  lancement il suit la préférence du système, puis conserve le choix local.
  Il utilise le fond gris anthracite Esri Dark Gray Canvas et une couche
  distincte renforçant frontières et noms. Les pays restent donc lisibles sans
  assombrir artificiellement une image satellite ; les halos et foyers
  thermiques demeurent lumineux. La recherche et les légendes Tailwind
  possèdent également leurs variantes sombres.
- L’outil « Fumée et air » est désactivé au chargement et affiche, lorsqu’il
  est activé volontairement, une couche colorée sur toute l’emprise visible.
  Une grille de 7 × 6 points fournit l’indice européen, les
  PM2.5 et les PM10 issus du modèle CAMS Europe via Open-Meteo ; elle est
  recalculée après déplacement ou zoom. Le bouton dédié affiche ou masque
  directement la couche, sans panneau intermédiaire ; sa légende apparaît
  uniquement en haut à gauche. Le survol donne les valeurs locales. La maille
  source d’environ 11 km et le caractère
  modélisé sont affichés : cette couche ne constitue pas une observation
  satellite de fumée.
- Les hôpitaux, écoles, établissements médico-sociaux, campings, stations
  service et centres de secours dans un rayon de 15 km sont recherchés à la
  demande via OpenStreetMap/Overpass. Le bouton affiche ou masque directement
  leurs repères sur la carte ; une légende en haut à gauche résume les
  catégories, et le clic sur un repère ouvre sa fiche avec distance et source.
  Cet inventaire contributif peut être incomplet et n’est pas utilisé pour
  déclarer un danger ou ordonner une évacuation.
- La végétation forestière peut être superposée avec la couche officielle IGN
  `LANDCOVER.FORESTINVENTORY.V2`. Un troisième fond OpenTopoMap complète les
  fonds satellite et plan pour lire le relief. Aucune classe de combustible ou
  vitesse de propagation n’est déduite de ces couches.
- Le bouton historique fait basculer la carte dans un mode annuel distinct. La
  chronologie inférieure passe de 12 heures à 2006–année N-1, peut être lue
  automatiquement et recharge les communes à chaque année. Les repères
  brun-violet indiquent le nombre de feux et la surface cumulée ; les signaux
  récents et périmètres actifs sont masqués pendant ce mode. Les données sont
  fournies par l’API publique de la réutilisation « Historique des feux de
  végétation par commune », déclarée sur data.gouv.fr et issue de BDIFF,
  Prométhée et autres sources officielles. Les positions sont communales et non
  celles des départs exacts.

## Robustesse mobile et Safari

- Le chargement FIRMS effectue une tentative courte afin de ne pas laisser
  l’interface attendre plusieurs dizaines de secondes. Trois reprises espacées
  restent programmées après 2,5 s, 7,5 s et 15 s. Une remise au premier plan de
  Safari, un retour depuis le cache de page ou une reconnexion réseau relance
  aussi la récupération lorsque l’état est en
  erreur. Un rechargement manuel de l’application ne devrait donc plus être
  nécessaire.
- L’écran de chargement conserve `logo.mp4` sur Chrome, Firefox, Edge et les
  autres navigateurs. Safari est détecté par sa signature
  `Version/... Safari/...` et utilise une animation CSS de `logo.png`, car iOS
  peut refuser l’autoplay même pour une vidéo muette et intégrée. Cette solution
  ne nécessite aucune interaction et respecte la préférence système de
  réduction des animations.

## Protection contre les abus communautaires

- La création d’un signalement est limitée à 5 par heure et 15 par jour pour
  un compte. Une seconde limite, calculée à partir d’une empreinte HMAC de
  l’adresse IP, autorise au maximum 20 créations par heure et 60 par jour
  depuis une même connexion. Aucune adresse IP brute n’est enregistrée.
- Un auteur ne peut pas créer deux observations ponctuelles de même catégorie
  dans un rayon de 500 m pendant deux heures.
- Les observations ponctuelles similaires de personnes différentes sont
  conservées séparément en base mais regroupées en un seul repère sur la carte.
  Le repère indique le nombre de témoignages associés. Les zones et limites
  dessinées restent toujours distinctes.
- L’expiration dépend de la catégorie : 2 h pour flammes et évacuation, 3 h
  pour fumée et autre, 4 h pour intervention et 6 h pour route fermée.
- Les lectures communautaires partagent désormais un cache Next/Vercel de
  20 secondes, invalidé après chaque écriture. Cela évite qu’un afflux de
  visiteurs répète la même requête lourde sur Neon.
- Les demandes d’upload R2, votes, modifications et suppressions disposent
  aussi de limites applicatives par compte. Better Auth limite les routes de
  connexion, inscription et récupération de mot de passe.
- Ces compteurs applicatifs sont locaux à une instance Vercel. Des règles WAF
  restent nécessaires pour une protection distribuée ; la procédure est
  documentée dans `docs/architecture/security.md`.

## Langues

- L'interface propose français, anglais, espagnol, italien, allemand,
  portugais, néerlandais, polonais et arabe depuis les réglages de la carte.
- Le choix est conservé localement, met à jour la langue du document et adapte
  également les dates, heures et âges des observations.
- Les textes sont centralisés dans les catalogues JSON de
  `src/i18n/messages/`. Les composants
  utilisent désormais des clés avec `t("namespace.message")`, y compris pour
  les messages dynamiques à variables.
- Un test vérifie que les catalogues possèdent les mêmes clés et les mêmes
  variables. Cette structure permet d’ajouter une langue sans modifier chaque
  composant.

## Couverture mondiale des détections

- Les détections NASA FIRMS ne sont plus limitées à l’emprise de la France.
  La carte envoie au serveur les limites de la zone actuellement visible et
  charge les capteurs VIIRS pour cette emprise, partout dans le monde.
- Un déplacement ou un changement de zoom déclenche une récupération différée
  de 650 ms. L’emprise est arrondie vers l’extérieur pour réutiliser le cache
  lors des petits déplacements et éviter les rafales de requêtes.
- À une échelle presque mondiale, Firemaps demande de rapprocher la carte au
  lieu de lancer une requête FIRMS démesurée qui risquerait d’expirer.
- Le regroupement et la déduplication utilisent un index géographique plutôt
  qu’une comparaison de chaque point avec tous les autres. Les contours locaux
  détaillés ne sont calculés qu’à partir du zoom 8 afin qu’une réponse dense sur
  un continent ne bloque pas l’interface.
- Pendant une récupération FIRMS, le résumé « Signaux » conserve le précédent
  résultat et affiche le logo animé avec « Recherche dans cette zone… ». La
  carte reste donc utilisable et l’état de chargement demeure immédiatement
  visible sans ajouter de fenêtre bloquante.
- Un panneau compact et non bloquant apparaît aussi au centre de la carte
  pendant la récupération. Il distingue la recherche, une attente supérieure à
  quatre secondes, le nombre de détections reçues, l’absence de détection, le
  besoin de zoomer et l’indisponibilité de la source. Dans ce dernier cas, une
  nouvelle tentative reste accessible sans empêcher de déplacer la carte.
- Le cache FIRMS est séparé par emprise et par période. Une réponse ancienne
  d’une autre région ne peut donc pas être affichée comme repli local.
