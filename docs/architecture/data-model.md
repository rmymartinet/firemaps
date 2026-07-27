# Modèle de données

Les types initiaux sont dans `src/domain/models.ts`.

- `Incident` porte localisation, statut et traçabilité complète.
- `Observation` reste distincte d’un incident et suit `pending | verified | rejected | duplicate`.
- `OfficialUpdate` conserve publication et dernière vérification séparément.
- `SavedLocation` est locale et limitée à une entrée.
- `Shelter` conserve source et fraîcheur.

## Persistance communautaire

Prisma décrit la base PostgreSQL dans `prisma/schema.prisma`.

- `CommunityReport` conserve la position, le type d’observation, sa durée de
  validité et son état de modération. Il peut aussi porter une direction
  approximative et un contour dessiné par l’auteur ; ces éléments restent
  toujours présentés comme communautaires et non vérifiés.
- `CommunityMedia` référence une photo, une vidéo ou un lien social. Le fichier
  volumineux reste dans un stockage objet ; PostgreSQL ne conserve que son URL,
  sa clé et ses métadonnées.
- `CommunityVote` garantit un seul vote par visiteur et par signalement grâce à
  une contrainte unique. La suppression d’un signalement supprime ses médias et
  ses votes associés.
- `User`, `Session`, `Account` et `Verification` sont les tables d’identité
  Better Auth. Un signalement peut désormais être rattaché à son auteur sans
  exposer ses informations personnelles sur la carte.

`reporterId` et `voterId` sont des identifiants techniques opaques. Ils ne
doivent contenir ni adresse IP brute ni donnée personnelle directement lisible.

Commandes utiles :

- `npm run db:generate` génère le client typé ;
- `npm run db:migrate -- --name <nom>` crée et applique une migration locale ;
- `npm run db:deploy` applique les migrations déjà validées en production ;
- `npm run db:studio` ouvre l’interface d’administration locale.

Compromis : le périmètre GeoJSON est typé sans dépendance supplémentaire. Les identifiants sont des chaînes pour accepter UUID ou identifiants fournisseurs. Les dates sont ISO 8601 aux frontières ; une validation runtime sera ajoutée avec la première source.
