
## v0-local — miroir API local

Cette branche part du fork intégral de `Chronasorg/chronas-frontend`. L'API est reproduite localement dans `api/v1/` (4 001 années, marqueurs, métadonnées) et servie par `public/mirror-sw.js`. L'interface est francisée et expose trois vues réellement utilisables : **Découvrir** (onglets Articles / Époques / Régions), **Article aléatoire** (province de l'année courante, tiroir local) et **Collections** (provinces + articles persistés). Le panneau **Téléchargements** permet une sélection hiérarchique continent → époque → groupe → provinces, persistée et exportable en JSON.

Les articles Wikipédia sont extraits hors ligne dans `public/articles/` avec vignettes WebP ≤ 25 Ko et crédits Commons. Le catalogue contient 2 338 groupes ; 78 fiches sont validées au manifeste. Les échecs d'extraction restent journalisés dans `public/articles/FAILURES.json` et ne sont pas remplacés par des données inventées. Voir `docs/FORK-NOTICE.md` pour le périmètre et le risque juridique assumé.

```bash
npm run catalog:build     # régénère public/articles/catalog.json
npm run articles:extract  # reprend l'extraction Wikipédia
npm run articles:verify   # vérifie SHA-256, images et crédits
```

### Langue

Le français est la langue **par défaut et de repli** de l’application : `DEFAULT_LOCALE = 'fr'` dans `src/i18n/i18n.ts`, état initial du store UI, `<html lang="fr">`, titre et métadonnées en français. Les autres langues restent disponibles dans les réglages.

### Barre basse, menus et navigation temporelle

La sidebar et ses réservations d’espace sont supprimées sur tous les écrans : la carte occupe toute la largeur, y compris quand un menu est ouvert. Une **barre basse compacte à cinq boutons** la remplace : Couches, Découvrir, Aléatoire, Collections et Outils.

Tous les panneaux du bas (Couches, Découvrir, Collections, Téléchargements, Réglages, Aide et Outils) s’ouvrent dans **un conteneur unique** (`BottomMenu`) inséré sous la timeline et juste au-dessus des boutons. La timeline se décale vers le haut de la hauteur réelle du menu (`ResizeObserver` → `--bottom-menu-height`) et le menu monte par une transition `translateY(100%) → 0`. Chaque menu possède un bouton de fermeture ; le bouton de la barre basse retoggle le même panneau et `aria-expanded` suit l’état réel. L’état visuel des boutons dérive uniquement du store (plus de `:hover` collant au tactile).

La timeline porte une **surcouche** (`TimelineOverlay`) au-dessus de vis-timeline : graduations d’années recalculées depuis la fenêtre visible et grandes périodes (Antiquité, Moyen Âge, Temps modernes, Contemporain). Elle est synchronisée pendant le drag, ignore les pointeurs et ne bloque ni le trait central fixe ni le geste tactile. Les étiquettes dupliquées de vis-time-axis sont masquées.

Le pas de graduation suit le zoom : `graduationStep` choisit un multiple 1-2-5 de puissance de dix d’après la largeur réelle de la surcouche (`ResizeObserver`) et la fenêtre affichée. Dézoomer augmente donc le pas au lieu de conserver les mêmes graduations.

Chaque période possède sa propre couleur : le rectangle couvre **l’intégralité des années de début et de fin**, même lorsqu’il dépasse la fenêtre visible ; seul le débordement est masqué. Le libellé est ancré dans la portion visible, sans transition de sortie, ce qui évite la superposition avec la période précédente. La teinte de fond est éclaircie en thème clair et assombrie en thème sombre.

Les bornes de vis-timeline sont élargies dynamiquement d’une marge égale à la moitié de la fenêtre visible : `-2000` et `2000` peuvent tous deux être amenés sous le trait central, quel que soit le niveau de zoom. L’année sélectionnée reste limitée à `[-2000, 2000]`.

### Frontières entre régions

Les frontières internes sont dérivées de la **couleur de remplissage réellement résolue** par MapLibre, assombrie de 18 % seulement (`darkenColor`, facteur 0,82) : elles restent proches de la teinte de la région au lieu de tirer vers le noir. Deux entités qui partagent la même couleur partagent exactement la même bordure, quelle que soit la dimension active ; le cas `population` utilise une teinte neutre.

### Performance du changement d’année

Le chemin année → carte est mesuré avec `performance.mark/measure` (`vectemporel-year-<année>`). Mesures locales en 390×844 : **18–50 ms** pour une année froide, **12–17 ms** pour une année en cache. Le service worker met en cache les réponses décompressées (LRU de 12), le store met en cache les données d’année (LRU borné) et précharge les deux années voisines lorsque l’application est active. Le GeoJSON est muté sur place puis publié par une seule référence, et les expressions de couleur sont mémoïsées.

**Décision Rust/Wasm : non retenu.** Le profil montre que le coût dominant est le chargement/décodage local et la propagation MapLibre/React, pas le calcul JS. Un module Wasm imposerait un binaire, un pipeline de build et une conversion des 4 001 fichiers pour un gain inférieur à la marge de mesure ; le cache et le préchargement apportent un gain supérieur pour un coût bien moindre. Le seuil de réévaluation est un p95 > 8 ms **après** cache, hors rendu MapLibre.

### Geste temporel et zoom

Le défilement est un **intégrateur unique** : chaque pixel est converti avec le span instantané (`Δt = dx/largeur × S(t)`), et le span suit la vitesse (`S = S₀ · g(v)`). L’accélération n’est donc pas ajoutée après le geste : plus le doigt va vite, plus la fenêtre s’élargit, donc plus les pixels suivants couvrent d’années. Sous 650 px/s, le geste reste strictement 1:1 (100 px sur 390 px = 128 ans pour 500 ans de fenêtre). Un cran isolé translate sans zoomer ; une rafale atteint une date lointaine et dézoome (facteur ≤ 2,5). L’inertie décroît (τ = 120 ms) sans retour de zoom, avec un watchdog qui termine le geste même si les frames rAF sont rares. Le zoom est **ancré sous le doigt/curseur** et **réversible** : `Ctrl`/`⌘` + molette, boutons `−` / `500 ans` / `+`. Un nouveau toucher annule l’inertie. Le centre interne fait foi : une fenêtre vis-timeline en retard ne peut plus provoquer de retour en arrière. Bornes `[-2000, 2000]` pour le centre, `[-2250, 2250]` pour la fenêtre ; `prefers-reduced-motion` supprime l’inertie.

Le modèle, ses constantes et les mesures sont détaillés dans [`docs/ERGONOMIE-TIMELINE.md`](docs/ERGONOMIE-TIMELINE.md). Les tests d’ergonomie sont dans `tests/e2e/timeline-ergonomics.spec.ts` (390×844 et 1658×1150) et écrivent leurs mesures dans `test-results/ergonomie/`.

La pile de la timeline est explicitement ordonnée : panneaux vis < grille < surcouche périodes/graduations < trait central < marqueur et libellé d’année < popovers.

### Modèle binaire préchargé

Les 4 001 années d'aires ne sont plus chargées par requête : un pack binaire de **886 Ko compressés** (dictionnaires + keyframes tous les 100 ans + deltas de 18 provinces par an) et un pack marqueurs de **2,72 Mo** (68 473 fiches uniques + index année → ids) sont préchargés au démarrage. Le décodage d'une année prend ~0,2 ms (p95 2,3 ms) et les requêtes `/areas` et `/markers?year=` disparaissent. Détails, format et vérification : [`docs/ATLAS-PACK.md`](docs/ATLAS-PACK.md).

### Invalidation du cache

Chaque déploiement injecte un `BUILD_VERSION` dans le service worker et dans le bundle. Lors d’un changement de version, les anciens caches du service worker sont supprimés, le cache de décompression est vidé, les anciennes inscriptions sont désenregistrées et les stores persistés (interface, collections, téléchargements) sont remis à zéro. Une application ouverte avec un ancien cache recharge donc des données propres, y compris sur mobile.

Le reset est effectué **avant le montage React** (`main.tsx`) : il ne peut plus invalider une requête d’aires en vol et laisser la carte vide au premier chargement. Les requêtes sont en outre identifiées par un compteur monotone, ce qui rend les réponses tardives inoffensives.

### Superpositions et ergonomie

- **Modales** (année, aide, connexion) : une seule à la fois, au-dessus de tout, focus piégé ; elles ferment les menus bas et les popovers de timeline.
- **Menu bas** : un seul à la fois ; couches, découverte, collections, réglages, aide et outils partagent le même conteneur.
- **Popovers** (lecture auto, recherche d’épopées) : un seul à la fois ; tout autre panneau le ferme.
- **Tiroir droit** (détails de province/article) : indépendant du menu bas, réduit uniquement la largeur de la carte.
- **Échap** ferme uniquement la couche la plus haute ; le focus revient au bouton déclencheur.
- Les requêtes annulées lors d’un changement rapide d’année ne déclenchent plus d’erreur visible.
- Le rechargement des métadonnées pour changer de langue ne remplace plus le GeoJSON déjà coloré : les noms suivent la locale tandis que les couleurs de l’année courante sont réappliquées.

### Téléchargements

Le panneau Téléchargements sélectionne toujours des groupes ou des provinces ; le bouton **Télécharger en `<langue>`** construit maintenant un paquet JSON local contenant les fiches disponibles, leurs vignettes et crédits déjà inlinés, ainsi que `locale`, la source et la date de génération. Le nom de fichier inclut la langue (`vectemporel-fr-articles-…json`). Aucune requête réseau n’est ajoutée : les fiches sont lues depuis `./articles/`. Les fiches indisponibles sont ignorées et comptées à part dans le statut. Le corps des extraits reste celui de la source locale extraite (`en.wikipedia.org`) : le paquet est identifié `fr` et utilise l’interface et les métadonnées françaises, mais aucune traduction n’est fabriquée artificiellement.

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
