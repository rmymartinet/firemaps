# Synthèse des retours utilisateurs — juillet 2026

Ce document regroupe les idées reçues, retire les doublons et les classe sans
les transformer automatiquement en promesses produit. Firemaps reste un outil
d'information : une donnée satellite, citoyenne ou calculée ne remplace ni une
alerte officielle, ni les secours, ni une décision d'évacuation.

## Ce que les retours confirment

Les utilisateurs perçoivent Firemaps comme une plateforme collaborative d'aide
en situation de crise, et pas seulement comme une carte de points thermiques.
Les attentes principales sont : confiance dans les signalements, fraîcheur
visible, alertes de proximité, contexte utile autour d'un feu, fonctionnement
mobile rapide et accès immédiat aux secours.

## Déjà présent ou partiellement présent

| Besoin exprimé | État actuel |
| --- | --- |
| Vue satellite et hotspots NASA | Disponible avec Esri World Imagery et NASA FIRMS VIIRS. FIRMS est proche du temps réel, pas du direct continu. |
| Date et heure de mise à jour | Les observations et la synchronisation sont horodatées ; la présentation doit encore être auditée sur toutes les fiches. |
| Vérification communautaire | Confirmations, contestations, expiration, regroupement et limites anti-abus sont présents. Le seuil de confiance et la résistance aux votes coordonnés restent à renforcer. |
| Photo et vidéo | Ajout facultatif via Cloudflare R2. Une preuve ne doit pas devenir obligatoire si elle pousse une personne à s'exposer. |
| Bouton d'appel d'urgence | Présent, avec pays détecté localement, confirmation avant l'appel et coordonnées copiables. |
| Langues | Neuf langues sont proposées ; l'anglais est la langue par défaut. |
| Hors connexion | Le shell et certaines dernières réponses peuvent être repris, mais le mode dégradé complet et son expiration doivent être durcis. |
| Photos et vidéos publiques | Les contributions acceptent des médias ; la découverte de liens publics reste semi-automatique et nécessite une vérification humaine. |
| Optimisation et raccourcis | Plusieurs optimisations mobile/carte et menus rapides existent ; les mesures de performance et tests sur appareils modestes restent prioritaires. |

## Classement global

Le classement utilise quatre critères : valeur immédiate pour la sécurité et la
compréhension, fréquence du besoin dans les retours, dépendances externes et
risque si la fonction se trompe.

| Priorité | Signification | Décision |
| --- | --- | --- |
| P0 | Indispensable avant d'élargir Firemaps | À traiter maintenant |
| P1 | Forte valeur, après stabilisation P0 | Prochain cycle produit |
| P2 | Utile pour développer la plateforme | Moyen terme |
| P3 | Dépend d'une source, d'une validation ou d'un partenaire | Exploration uniquement |
| Déjà présent | Besoin déjà couvert au moins partiellement | Améliorer et mesurer |

### Backlog ordonné

| Rang | Idée | Priorité | Pourquoi |
| ---: | --- | :---: | --- |
| 1 | Performance du zoom, du déplacement et des zones denses | P0 | Conditionne toutes les autres fonctions, surtout sur mobile. |
| 2 | Fraîcheur visible de chaque détection et signalement | P0 | Évite de prendre une ancienne donnée pour une situation actuelle. |
| 3 | Vérification communautaire, e-mail vérifié, anti-fraude et modération | P0 | Réduit directement les faux signalements et abus. |
| 4 | Mode hors connexion avec âge et expiration explicites | P0 | Important en zone de crise, sans créer une fausse impression d'actualité. |
| 5 | Tests mobiles, accessibilité et navigation rapide | P0 | Rend les fonctions existantes réellement utilisables sous stress. |
| 6 | Alertes géolocalisées opt-in autour d'un lieu surveillé | P1 | Très forte valeur, mais demande consentement, push serveur et contrôle du bruit. |
| 7 | Points d'eau, hôpitaux et accueils/refuges vérifiables | P1 | Apporte un contexte concret sans prétendre prédire le feu. |
| 8 | Intensité thermique et fumée avec unités et incertitude | P1 | Aide à lire la carte si la sémantique reste précise. |
| 9 | Occupation du sol : forêt, prairie, résidentiel, réserve | P1 | Utile pour comprendre l'environnement, sous réserve d'une source attribuable. |
| 10 | Davantage de photos et vidéos vérifiées | P1 | Renforce le contexte, mais exige modération, sécurité et maîtrise des coûts. |
| 11 | Code couleur strictement lié à une mesure définie | P1 | Rend la carte plus rapide à lire sans inventer une gravité générale. |
| 12 | API publique Firemaps en lecture seule | P2 | Permet un écosystème, après stabilisation du modèle et des quotas. |
| 13 | IA explicable pour déduplication, rapprochement et résumé | P2 | Peut réduire le bruit, mais ne doit jamais confirmer ou conseiller seule. |
| 14 | Discussions locales et coordination de bénévoles | P2 | Potentiel communautaire, avec une charge de modération élevée. |
| 15 | Dons volontaires à Firemaps ou à des associations | P2 | Non essentiel à la sécurité ; exige transparence et cadre juridique. |
| 16 | Partage automatisé vers les secours et autorités | P3 | Impossible sans partenariat officiel, format convenu et accusé de réception. |
| 17 | Données de drones pour détection précoce | P3 | Dépend d'opérateurs, autorisations, couverture et contrat de données. |
| 18 | Itinéraire recommandé par une autorité | P3 | Acceptable uniquement avec routes et consignes officielles fraîches. |
| 19 | Modèle validé de propagation/expansion | P3 | Exige combustible, relief, météo, front et validation scientifique locale. |
| 20 | Personnes bloquées ou déplacements d'animaux | P3 | Données sensibles ou difficiles à vérifier ; aucune exposition publique brute. |

### Fonctions déjà présentes à conserver

- vue satellite et hotspots NASA FIRMS mondiaux ;
- appel d'urgence avec confirmation et coordonnées ;
- médias facultatifs dans les signalements ;
- confirmations et contestations communautaires ;
- plusieurs langues avec anglais par défaut ;
- raccourcis cartographiques et navigation mobile ;
- actualisation régulière selon la disponibilité réelle des fournisseurs.

## Détail des priorités

### P0 — Fiabilité avant de nouvelles fonctions

1. Terminer la modération, la vérification d'e-mail et la protection contre les
   votes coordonnés et faux signalements.
2. Afficher partout l'heure d'observation, l'heure de dernière synchronisation,
   la source et le niveau de confiance sans code couleur trompeur.
3. Mesurer et améliorer les performances pendant zoom, déplacement, clustering
   et chargement de nombreuses détections.
4. Finaliser le mode réseau lent/hors connexion avec mention très visible
   « données enregistrées » et âge maximal.
5. Terminer les tests mobiles, l'accessibilité et les raccourcis essentiels à
   une utilisation rapide sous stress.

### P1 — Contexte opérationnel prudent

1. Concevoir les alertes géolocalisées opt-in pour les lieux surveillés, avec
   consentement, rayon, fréquence, silence et désinscription.
2. Afficher à la demande les points d'eau, hôpitaux et lieux d'accueil issus de
   sources identifiables et fraîches.
3. Étudier les refuges acceptant les animaux uniquement lorsqu'un attribut ou
   une source fiable permet de l'affirmer ; sinon afficher « à vérifier ».
4. Catégoriser le contexte du terrain (forêt, prairie, résidentiel, réserve)
   sans confondre occupation du sol et danger actuel.
5. Améliorer l'affichage de l'intensité thermique FIRMS et de la fumée en
   conservant unités, heure, résolution et incertitude.
6. Enrichir les signalements avec davantage de médias vérifiés, sans encourager
   les personnes à se rapprocher d'un feu.

### P2 — Plateforme et écosystème

1. Concevoir une API Firemaps publique, versionnée, documentée, limitée en
   débit et séparant strictement données officielles, satellite et citoyennes.
2. Étudier des canaux locaux de coordination avec une modération forte. Une
   discussion de groupe non modérée n'est pas adaptée à une situation de crise.
3. Préparer les partenariats avec associations, autorités et opérateurs de
   drones avant toute transmission ou intégration opérationnelle.
4. Étudier les dons volontaires avec transparence sur le bénéficiaire, les
   frais, les reçus et l'absence d'influence sur la visibilité des alertes.

## Idées conditionnées par des partenaires officiels

Les fonctions suivantes ne doivent pas être activées par simple envoi
automatique depuis Firemaps :

- notifier les pompiers ou autorités d'un nouveau signalement ;
- transmettre automatiquement GPS, médias ou identité aux secours ;
- contacter ou mobiliser des pompiers volontaires et bénévoles ;
- afficher un nombre de personnes « bloquées » dans une zone ;
- intégrer des données de drones opérationnels.

Elles exigent un accord explicite, un destinataire vérifié, un format convenu,
une base légale, une politique de responsabilité, des tests de charge et un
accusé de réception. Sans cela, Firemaps risquerait d'encombrer les services ou
de transmettre de fausses informations.

## Fonctions à ne pas présenter comme certaines

### Itinéraires et zones sûres

Un itinéraire « le plus rapide vers une zone sûre » ne peut pas être calculé à
partir des seuls feux, du vent et du trafic public. Routes fermées, fumée,
contre-ordres, évolution du front et priorités des secours changent rapidement.
Le MVP ne proposera pas d'itinéraire d'évacuation. Une future intégration ne sera
possible qu'avec des consignes et fermetures officielles fraîches ; elle devra
afficher l'itinéraire recommandé par l'autorité, pas inventer une zone sûre.

### Propagation et risque d'expansion

La vitesse ou la direction de propagation ne doit pas être déduite du vent
seul. Une prévision crédible exige au minimum combustible, humidité, relief,
météo, état du front et modèle validé localement. Toute expérimentation sera
étiquetée « simulation », accompagnée de son horizon, de son incertitude et
désactivée par défaut tant qu'elle n'est pas validée.

### Gravité et intensité

Le code couleur doit représenter une donnée définie — fraîcheur, confiance,
FRP, qualité de l'air ou statut officiel — et jamais une « gravité » générale
inventée. Une légende et les unités sont obligatoires.

### Personnes et animaux

Le nombre de personnes bloquées est une information extrêmement sensible et
difficile à vérifier. Une éventuelle fonction d'appel à l'aide doit minimiser
les données, éviter une position publique précise et être transmise à un acteur
habilité. Les déplacements d'animaux ne seront affichés qu'à partir d'une source
spécialisée traçable ; aucun déplacement ne sera extrapolé à partir du feu.

## Intelligence artificielle

L'IA peut aider à rapprocher des doublons, résumer des sources ou signaler une
incohérence. Elle ne doit ni confirmer seule un incendie, ni produire une
consigne, ni masquer les sources originales. Toute fusion doit rester
explicable, conserver les horodatages et permettre de revenir aux données
brutes. La cadence de 30 à 60 minutes est un objectif de synchronisation, pas
une garantie d'une nouvelle observation satellite.

## Critères de décision pour chaque idée

Avant développement, chaque fonction doit répondre à ces questions :

1. Quelle source et quelle licence ?
2. Quelle fraîcheur, précision et zone couverte ?
3. Que voit l'utilisateur lorsque la donnée manque ou expire ?
4. Quel risque si l'information est fausse ?
5. Quelles données personnelles sont nécessaires ?
6. Quel partenaire doit valider la fonction ?
7. Comment tester la compréhension sur mobile et en situation de stress ?
8. Quel coût réseau, serveur et fournisseur en cas de forte audience ?

## Indicateurs proposés

- temps jusqu'à l'affichage des premiers signaux et fluidité du déplacement ;
- proportion de fiches comprenant source et fraîcheur comprises par les testeurs ;
- signalements avec preuve, taux de contestation et délai de modération ;
- taux d'alertes ouvertes/désactivées et faux positifs perçus ;
- disponibilité hors connexion et âge des données réutilisées ;
- nombre d'appels API par vue et coût par utilisateur actif ;
- erreurs de compréhension entre satellite, officiel et citoyen.
