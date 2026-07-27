# Périmètre MVP

Inclus : carte sourcée, “autour de moi”, une adresse locale, informations officielles, mode urgence, observation citoyenne modérée manuellement, PWA installable.

Exclus : comptes, social, itinéraire d’évacuation, prédiction de propagation, IA image, notifications avancées, paiements et application native complète.

La carte charge les détections réelles NASA FIRMS via une route serveur lorsqu’une clé est configurée. La géolocalisation consentie, la distance à la détection affichée la plus proche et un lieu surveillé dans `localStorage` sont disponibles. Aucun backend persistant ni flux officiel national structuré n’est connecté ; la page Informations dirige vers FR-Alert, Géorisques/Météo des forêts et l’annuaire officiel des préfectures.
