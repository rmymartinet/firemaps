# Sécurité et vie privée

L’authentification repose sur Better Auth et les signalements sont conservés
dans PostgreSQL via Prisma. Les médias sont téléversés directement vers
Cloudflare R2 avec une URL signée de courte durée, puis vérifiés côté serveur
avant d’être associés à une contribution.

Les recherches d’adresse passent par une route serveur sans cache puis par l’IGN Géoplateforme. Firemaps ne les stocke pas, mais elles peuvent apparaître dans les journaux techniques de l’hébergeur ou du fournisseur. Avant production, désactiver la journalisation des chaînes de requête ou définir une rétention minimale et l’expliquer dans l’information de confidentialité.

## Protection des contributions

- La publication exige une session authentifiée.
- Un compte est limité à 5 signalements par heure et 15 par période glissante
  de 24 heures.
- Une empreinte HMAC irréversible de l’adresse IP applique en complément une
  limite de 20 signalements par heure et 60 par période glissante de 24 heures.
  L’adresse IP brute n’est jamais conservée. Le secret utilisé est
  `COMMUNITY_RATE_LIMIT_SECRET`, avec `BETTER_AUTH_SECRET` comme repli.
- Un même compte ne peut pas republier une observation ponctuelle de même
  catégorie à moins de 500 m pendant deux heures.
- Les observations ponctuelles de comptes différents, de même catégorie, à
  moins de 500 m et deux heures sont regroupées en un seul repère cartographique.
  Les lignes et surfaces dessinées ne sont jamais fusionnées.
- Chaque contribution reste enregistrée séparément : son auteur conserve la
  possibilité de l’enrichir ou de la supprimer.
- Les durées de vie sont limitées selon la catégorie : flammes et évacuation
  2 h, fumée et autre 3 h, intervention 4 h, route fermée 6 h. Les éléments
  expirés ne sont plus servis par l’API publique.

Restant avant un déploiement à grande échelle : vérification obligatoire de
l’adresse e-mail, suppression des métadonnées EXIF, analyse des médias,
réputation progressive, protection renforcée des votes, journal d’audit et
interface de modération.
