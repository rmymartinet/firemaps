# ADR-002 — PWA avant application native

- Statut : accepté
- Date : 2026-07-25

## Contexte
L’accès immédiat par lien prime sur la distribution en stores.

## Décision
Livrer une PWA responsive, puis évaluer Capacitor après validation du MVP.

## Alternatives
Swift/Kotlin, React Native, Capacitor dès le premier lot.

## Raisons
Déploiement rapide, code unique et installation sans revue de store.

## Conséquences positives
Itérations immédiates et portée iOS/Android.

## Conséquences négatives
Limites PWA et comportement hors-ligne variables ; future intégration native à tester.
