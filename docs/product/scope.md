# Périmètre MVP

Inclus : carte mondiale sourcée, « autour de moi », recherche mondiale,
informations officielles, numéros d'urgence selon le pays, comptes,
observations citoyennes persistées avec photo/vidéo et votes, PWA installable.

Exclus : réseau social généraliste, itinéraire d'évacuation, prédiction de
propagation, validation automatique d'image par IA, paiements et application
native complète. Une administration de modération complète et les notifications
push serveur restent à réaliser.

La carte charge les détections NASA FIRMS de l'emprise visible via une route
serveur lorsqu'une clé est configurée. La période récente est limitée à cinq
jours par le fournisseur. La géolocalisation consentie, la distance à la
détection affichée la plus proche et un lieu surveillé localement sont
disponibles. Les contributions utilisent PostgreSQL Neon/Prisma, Better Auth et
Cloudflare R2. Aucun flux officiel mondial homogène d'incendies confirmés ou de
consignes n'est connecté ; les sources officielles restent présentées
séparément.
