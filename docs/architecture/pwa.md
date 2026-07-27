# PWA

`src/app/manifest.ts` fournit le manifeste App Router. `public/sw.js` applique un cache réseau-d’abord au shell local. Les dernières réponses réussies FIRMS et vent peuvent être reprises hors ligne avec un avertissement visible ; les tuiles tierces ne sont pas pré-cachées. Les recherches d’adresse ne sont jamais mises en cache afin de ne pas conserver les termes recherchés. Une API sans cache disponible renvoie une erreur JSON 503 plutôt que le shell HTML. Le service worker est enregistré par un composant client.

L’écran de chargement utilise la vidéo du logo sur les navigateurs autorisant
l’autoplay muet. Safari reçoit à la place une animation CSS du PNG afin
d’éviter toute interaction obligatoire sur iPhone et macOS. Dans les deux cas,
l’écran se retire vers le bas dès que l’état initial est prêt, avec une durée
maximale de sécurité.

Limites actuelles : icône SVG uniquement, aucune page hors-ligne dédiée, aucun indicateur de mise à jour du service worker, aucun test Lighthouse. Avant production, ajouter PNG 192/512, politique d’expiration ferme des données hors ligne et audit installabilité/accessibilité.
