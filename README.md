# Firemaps

PWA cartographique mondiale d'information citoyenne pendant les incendies.
Firemaps aide à comprendre les informations connues et leurs limites ; elle ne
remplace ni les secours ni les alertes officielles.

## Démarrer

Prérequis : Node.js 20.9+ et npm.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Créer gratuitement une clé NASA FIRMS sur `https://firms.modaps.eosdis.nasa.gov/api/map_key/`, puis renseigner `NASA_FIRMS_MAP_KEY` dans `.env.local`. La route mondiale interroge l'emprise visible sur une période maximale de cinq jours.

Pour les comptes et contributions, configurer également PostgreSQL Neon,
Better Auth, Resend et Cloudflare R2 selon `.env.example`, puis appliquer les
migrations avec `npm run db:deploy`.

La découverte semi-automatique de liens vidéo publics est facultative. Créer une clé Brave Search sur `https://api.search.brave.com/`, puis renseigner `BRAVE_SEARCH_API_KEY` côté serveur.

Ouvrir `http://localhost:3000`. Les marqueurs rouges représentent des détections
thermiques satellite récentes, jamais des incendies confirmés. La recherche de
lieux est mondiale grâce à Photon/OpenStreetMap, avec IGN comme secours français.

## Vérifier

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Repères

- `src/app/` : routes App Router et manifeste PWA
- `src/components/` : shell, carte et fonctions clientes
- `src/domain/` : types et règles métier testables
- `src/integrations/` : adaptateurs des fournisseurs externes
- `docs/current-state.md` : source de vérité sur l’état du projet
- `docs/adr/` : décisions structurantes
- `.codex/skills/` : procédures persistantes pour agents

Consulter [docs/README.md](docs/README.md), puis [docs/current-state.md](docs/current-state.md) avant toute contribution. Toute nouvelle source de données doit être documentée avant connexion.
