# Sécurité et vie privée

L’authentification repose sur Better Auth et les signalements sont conservés
dans PostgreSQL via Prisma. Les médias sont téléversés directement vers
Cloudflare R2 avec une URL signée de courte durée, puis vérifiés côté serveur
avant d’être associés à une contribution.

Les recherches d'adresse passent par une route serveur sans cache puis par
Photon/OpenStreetMap, avec IGN Géoplateforme comme secours français. Firemaps
ne les stocke pas, mais elles peuvent apparaître dans les journaux techniques
de l'hébergeur ou des fournisseurs. Avant production, désactiver la
journalisation des chaînes de requête ou définir une rétention minimale et
l'expliquer dans l'information de confidentialité.

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
- La génération d’URL signée R2 est limitée à 10 demandes par compte et par
  tranche de 10 minutes. Les votes sont limités à 60 par minute, les
  modifications à 30 par minute et les suppressions à 10 par minute.
- Better Auth applique une limite générale de 60 appels par minute, resserrée
  pour la connexion, l’inscription et la réinitialisation de mot de passe.
- Ces dernières limites sont conservées dans la mémoire de chaque instance :
  elles freinent les erreurs et les abus simples, mais doivent être doublées par
  des règles Vercel WAF ou un compteur partagé pour résister à une attaque
  distribuée.

## Préparation aux pics de trafic

- `DATABASE_URL` doit utiliser l’hôte Neon contenant `-pooler`. Le déploiement
  actuel respecte cette règle et utilise `sslmode=require`.
- La lecture des 250 derniers signalements est placée dans le Data Cache
  Next/Vercel pendant 20 secondes. Le résultat brut commun est réutilisé entre
  visiteurs, puis personnalisé avec la session courante. Publication, vote,
  modification et suppression invalident immédiatement ce cache.
- Dans Vercel, créer des règles WAF pour `/api/community/*` et `/api/auth/*`.
  Commencer en mode journalisation, vérifier les clients légitimes, puis
  répondre en `429` aux dépassements.
- Les médias publics ne doivent pas rester durablement servis par `r2.dev`,
  prévu pour le développement. Configurer un domaine personnalisé, par exemple
  `media.firemaps.app`, avant une campagne apportant beaucoup de trafic.
- Sur Neon, conserver le pooling, activer une plage d’autoscaling adaptée au
  budget et envisager de désactiver la mise en veille pour éviter la latence de
  réveil lors d’un service public actif en continu.
- Surveiller au minimum : taux de réponses 429/5xx, durée p95 des routes,
  connexions et CPU Neon, appels FIRMS, objets/volume R2 et dépenses Vercel.

Restant avant un déploiement à grande échelle : vérification obligatoire de
l’adresse e-mail, suppression des métadonnées EXIF, analyse des médias,
réputation progressive, protection renforcée des votes, journal d’audit et
interface de modération.
