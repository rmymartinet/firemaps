# ADR-009 — Couche de vent Open-Meteo/Météo-France

- Statut : accepté
- Date : 2026-07-25

## Contexte

Le vent aide à comprendre les conditions autour d’une détection, mais une visualisation trop affirmative pourrait être confondue avec une prévision de propagation du feu.

## Décision

Ajouter une couche désactivée par défaut, alimentée par l’API Météo-France d’Open-Meteo. Interroger une grille fixe de 20 points en métropole et Corse, afficher le vent à 10 m avec des flèches animées couvrant la zone visible, et mettre en cache les réponses 15 minutes. Les flèches avancent vers la destination de l’air, avec une cadence relative à la vitesse interpolée : la direction météorologique de provenance est donc inversée de 180°.

Afficher la source et l’heure, ainsi qu’un avertissement permanent lorsque la couche est active : ces flèches ne prédisent pas la propagation d’un incendie.

## Alternatives envisagées

Flux de particules animé, API commerciale spécialisée, données brutes Météo-France, absence de météo.

## Raisons

L’API fournit directement les modèles AROME/ARPEGE, accepte plusieurs coordonnées par requête et permet une première couche lisible sans nouvelle bibliothèque cartographique.

## Conséquences positives

Contexte météo disponible à la demande, coût réseau limité, attribution visible et séparation claire avec les détections FIRMS.

## Conséquences négatives

La grille ne montre pas les variations locales liées au relief. Les données restent des sorties de modèle. L’offre gratuite Open-Meteo est limitée au non-commercial ; une offre adaptée sera nécessaire pour un usage commercial.
