# ADR-011 — Recherche mondiale avec Photon

- Statut : accepté
- Date : 2026-07-31

## Contexte

La recherche IGN initiale était explicitement limitée à `METROPOLE`. Firemaps
affiche désormais les détections FIRMS dans le monde ; une barre de recherche
limitée à la France rendait cette couverture difficile à utiliser.

## Décision

Utiliser Photon, basé sur OpenStreetMap, comme fournisseur principal
d'autocomplétion mondiale. La route serveur transmet la langue du navigateur,
normalise au maximum six résultats et conserve IGN Géoplateforme comme secours
si Photon échoue ou ne retourne aucun résultat.

## Alternatives envisagées

Étendre les territoires IGN un par un, utiliser le serveur Nominatim public
pour de l'autocomplétion, ou adopter immédiatement un fournisseur commercial.
Le serveur public Nominatim n'est pas retenu car sa politique interdit
l'autocomplétion côté client.

## Conséquences positives

Recherche cohérente avec la carte mondiale, villes/adresses/points d'intérêt,
absence de nouvelle clé côté navigateur et continuité française grâce au
secours IGN.

## Conséquences négatives

La qualité dépend d'OpenStreetMap et la disponibilité du service public Photon
n'est pas un engagement de niveau de service. Les termes recherchés sont
transmis à un tiers. Une audience importante nécessitera une instance Photon
dédiée ou un fournisseur géré.
