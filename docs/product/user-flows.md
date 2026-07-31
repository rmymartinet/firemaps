# Flux utilisateurs

- Ouvrir : voir le fond satellite et les dernières détections FIRMS, avec une légende précisant qu’un point n’indique aucune surface.
- Explorer : filtrer sur 3/6/12/24 h, basculer Satellite/Plan, activer volontairement les estimations hebdomadaires EFFIS ou le vent modélisé à 10 m, et zoomer pour séparer les regroupements.
- Lire rapidement : comprendre au premier niveau « chaleur détectée », âge du signal et statut satellite/citoyen ; ouvrir « Voir les détails » uniquement pour les données techniques et les sources.
- Lire le vent : activer la couche et suivre les flèches animées vers la destination de l’air ; leur cadence reflète seulement la vitesse relative interpolée. Consulter l’heure du modèle dans le panneau et ne pas les interpréter comme une trajectoire prévue du feu.
- Rechercher : saisir au moins trois caractères dans la barre de la carte,
  choisir une suggestion mondiale Photon/OpenStreetMap (ou IGN en secours),
  recentrer la carte et afficher un repère distinct sans verdict de sécurité.
- Pointer : cliquer sur n’importe quel endroit libre de la carte pour créer un lieu manuel avec coordonnées, distance à la détection affichée la plus proche et option de surveillance locale.
- Se localiser : consentir explicitement, recentrer la carte et lire la précision annoncée ainsi que la distance à la détection actuellement affichée la plus proche, sans verdict de sécurité.
- Surveiller : depuis un lieu recherché ou la position de l’appareil, conserver un seul lieu dans `localStorage`, le rouvrir ou le supprimer.
- S’informer : retrouver les numéros d’urgence et les premiers réflexes, comprendre les points, hachures, zones EFFIS et flèches de vent, puis ouvrir FR-Alert, Géorisques/Météo des forêts ou l’annuaire officiel des préfectures. Aucun flux national structuré n’est encore synchronisé dans Firemaps.
- Urgence : appeler 112/18, obtenir et partager ses coordonnées, lire la dernière consigne connue.
- Signaler : choisir un point, une zone ou une limite, sélectionner la catégorie,
  ajouter éventuellement une preuve puis publier avec un compte. L'heure et la
  géométrie sont automatiques ; le signalement est persisté dans PostgreSQL et
  le média dans R2.
- Vérifier : ouvrir un marqueur communautaire et choisir « Je confirme » ou
  « Je conteste ». Les votes persistés changent le statut communautaire mais ne
  produisent jamais une confirmation officielle.
- Découvrir une vidéo : saisir une commune, un département ou un massif ; examiner les liens TikTok/Instagram proposés par Brave Search, ouvrir la publication pour contrôler le lieu et la date, puis préremplir un signalement. Aucun résultat n’est accepté automatiquement.
