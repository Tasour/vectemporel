
## v0-local — miroir API local

Cette branche part du fork intégral de `Chronasorg/chronas-frontend`. L'API est reproduite localement dans `api/v1/` (4 001 années, marqueurs, métadonnées) et servie par `public/mirror-sw.js`. L'interface est francisée et expose trois vues réellement utilisables : **Découvrir** (onglets Articles / Époques / Régions), **Article aléatoire** (province de l'année courante, tiroir local) et **Collections** (provinces + articles persistés). Le panneau **Téléchargements** permet une sélection hiérarchique continent → époque → groupe → provinces, persistée et exportable en JSON.

Les articles Wikipédia sont extraits hors ligne dans `public/articles/` avec vignettes WebP ≤ 25 Ko et crédits Commons. Le catalogue contient 2 338 groupes ; 78 fiches sont validées au manifeste. Les échecs d'extraction restent journalisés dans `public/articles/FAILURES.json` et ne sont pas remplacés par des données inventées. Voir `docs/FORK-NOTICE.md` pour le périmètre et le risque juridique assumé.

```bash
npm run catalog:build     # régénère public/articles/catalog.json
npm run articles:extract  # reprend l'extraction Wikipédia
npm run articles:verify   # vérifie SHA-256, images et crédits
```

### Barre basse et navigation temporelle

La sidebar est supprimée sur tous les écrans. Une **barre basse universelle à deux rangées** la remplace : navigation (Couches, Découvrir, Aléatoire, Réglages, Collections, Lecture, Aide) puis chronologie (Agrandir, Réinitialiser, Épopées, Lecture). Chaque rangée défile horizontalement si nécessaire. La timeline reste au-dessus de cette barre, sans contrôles flottants à gauche. Le trait d'année est fixe au centre : glisser le doigt horizontalement fait défiler le temps derrière lui et l'année affichée suit le centre. Le français est la langue par défaut et le repli.

`scripts/patch-pages.mjs` corrige les chemins absolus du build pour GitHub Pages. Le fond de carte OpenFreeMap reste la seule ressource externe au runtime.

# Chronas Frontend

Modern React 19 + Vite 8 + TypeScript frontend shell for the Chronas interactive historical map application.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | Lint code |
| `npm run format` | Format code with Prettier |
| `npm run deploy` | Deploy to AWS S3 |

## Environment Configuration

Create environment files in the project root:

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

Required variables:
```
VITE_API_BASE_URL=http://localhost:3030/v1
VITE_ENVIRONMENT=development
VITE_ENABLE_DEV_TOOLS=true
```

## Deployment

Deploy to AWS S3 with CloudFront:

```bash
npm run deploy              # Deploy to development
npm run deploy staging      # Deploy to staging
npm run deploy production   # Deploy to production
```

Requires AWS CLI configured with `chronas-dev` profile.

## Tech Stack

- React 19
- Vite 8
- TypeScript 6
- Zustand (state management)
- React Router v6 (HashRouter)
- Axios (API client)
- Vitest + Playwright (testing)
