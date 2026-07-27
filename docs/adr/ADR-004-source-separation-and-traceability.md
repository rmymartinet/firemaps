# ADR-004 — Séparation et traçabilité des sources

- Statut : accepté
- Date : 2026-07-25

## Contexte
Confondre une détection ou un signalement avec une confirmation officielle crée un risque de sécurité.

## Décision
Conserver et afficher type, nom, URL, observation, mise à jour et confiance. Maintenir les observations séparées des incidents jusqu’à modération.

## Alternatives
Fusion par proximité, score unique opaque.

## Raisons
Permettre à l’utilisateur de comprendre l’origine et les limites.

## Conséquences positives
Auditabilité et prudence explicites.

## Conséquences négatives
Interface et normalisation plus exigeantes ; doublons possibles entre sources.
