# Décisions

Au 31 juillet 2026 :

- Next.js App Router + TypeScript dans un monolithe modulaire.
- PWA avant natif/Capacitor.
- Leaflet pour les besoins cartographiques simples du MVP.
- Séparation stricte officiel/satellite/citoyen et traçabilité obligatoire.
- PostgreSQL Neon et Prisma assurent la persistance ; Better Auth gère les comptes et Cloudflare R2 les médias.
- Un lieu surveillé peut rester local, tandis que la publication d'une observation exige un compte.
- Les observations citoyennes sont publiées comme non vérifiées, expirent rapidement et sont protégées par des limites, un regroupement et les votes communautaires. Une véritable interface de modération reste à construire.
- Cache initial limité au shell ; aucune donnée critique n’est présumée fraîche hors ligne.
- NASA FIRMS VIIRS est la première source réelle, toujours présentée comme détection thermique satellite.
- La carte regroupe les détections jusqu’au zoom 11, n’invente aucune surface autour des points et sépare les périmètres estimés EFFIS.
- La recherche est intégrée à la carte et couvre le monde via Photon/OpenStreetMap ; IGN Géoplateforme reste un secours français.
- FIRMS couvre l'emprise visible dans le monde, avec un maximum de cinq jours imposé par l'API et un cache partagé de cinq minutes.
- Les périmètres NRT VIIRS EFFIS trop grossiers sont exclus ; seule la couche hebdomadaire MODIS/Sentinel‑2, masquée par défaut, reste proposée.
- Le vent à 10 m est une couche optionnelle Open-Meteo/Météo-France sur grille fixe ; les flèches se déplacent vers la destination de l’air, avec une cadence relative à la vitesse, et ne constituent jamais une prévision de propagation du feu.
- La position est demandée uniquement après action explicite ; elle reste en mémoire et un seul lieu surveillé peut être stocké localement sans compte.
- En l’absence d’API nationale opérationnelle validée, la page Informations donne accès aux portails officiels sans prétendre les synchroniser.
- La déduplication inter-capteurs durable reste différée ; la recherche et les détections ne sont plus limitées à la France.
- Les couches optionnelles Sentinel-2 et MTG-FRP sont retirées de l’interface : leur apport était trop ambigu ou trop retardé pour l’objectif de lecture immédiate de la carte.
- Les changements de signalements communautaires sont diffusés en direct par Server-Sent Events, relayés entre instances Vercel par Postgres LISTEN/NOTIFY plutôt qu'un service pub/sub externe.
