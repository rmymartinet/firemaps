# Décisions

Au 25 juillet 2026 :

- Next.js App Router + TypeScript dans un monolithe modulaire.
- PWA avant natif/Capacitor.
- Leaflet pour les besoins cartographiques simples du MVP.
- Séparation stricte officiel/satellite/citoyen et traçabilité obligatoire.
- Supabase prévu mais différé jusqu’au flux persistant et aux politiques RLS.
- Une adresse surveillée sera conservée localement, sans compte.
- Toutes les observations citoyennes passeront par modération manuelle.
- Le prototype communautaire local permet de valider le parcours et le calcul de statut, mais aucune observation n’est partagée entre appareils avant le backend modéré.
- Cache initial limité au shell ; aucune donnée critique n’est présumée fraîche hors ligne.
- NASA FIRMS VIIRS est la première source réelle, toujours présentée comme détection thermique satellite.
- La carte regroupe les détections jusqu’au zoom 11, n’invente aucune surface autour des points et sépare les périmètres estimés EFFIS.
- La recherche d’adresse est intégrée à la carte via IGN Géoplateforme ; « Mon adresse » sort de la navigation principale.
- Les périmètres NRT VIIRS EFFIS trop grossiers sont exclus ; seule la couche hebdomadaire MODIS/Sentinel‑2, masquée par défaut, reste proposée.
- Le vent à 10 m est une couche optionnelle Open-Meteo/Météo-France sur grille fixe ; les flèches se déplacent vers la destination de l’air, avec une cadence relative à la vitesse, et ne constituent jamais une prévision de propagation du feu.
- La position est demandée uniquement après action explicite ; elle reste en mémoire et un seul lieu surveillé peut être stocké localement sans compte.
- En l’absence d’API nationale opérationnelle validée, la page Informations donne accès aux portails officiels sans prétendre les synchroniser.
- L’outre-mer sort du périmètre demandé et la déduplication inter-capteurs est différée.
- Les couches optionnelles Sentinel-2 et MTG-FRP sont retirées de l’interface : leur apport était trop ambigu ou trop retardé pour l’objectif de lecture immédiate de la carte.
