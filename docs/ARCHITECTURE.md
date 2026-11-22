# Comment c'est fait

## Architecture

`src/app.js` est la racine de composition : il construit la frise, le HUD, les panneaux et relie les modules. Aucun framework applicatif, aucune dépendance runtime.

1. **Données** — `scripts/import-chronas-*.mjs` interrogent l'API Chronas au build uniquement. Les sorties sont des modules ou chunks locaux sous `src/data/`.
2. **Globe** — `src/globe/globe.js` pilote Three.js : une seule boucle rAF, pause sur `document.hidden`, picking par raycast puis test de polygone, maillage vectoriel des provinces.
3. **Temps** — `src/timeline/scale.js` fournit les conversions année ↔ position (linéaire, récents, siècle). `epics.js` gère les 560 épiques et leur filtre.
4. **Histoires** — `src/story/trails.js` est un lecteur pur ; `content/trails/*.json` porte les jalons et leur preuve vérifiée au build.
5. **Détections** — `scripts/build-turning-points.mjs` et `build-anomalies.mjs` calculent des extraits reproductibles avec SHA-256.
6. **Histomap** — `scripts/build-histomap.mjs` agrège la population par famille ; `src/histomap/stream.js` rend le streamgraph avec un D3 local chargé à la demande.
7. **Apprentissage** — `src/learning/` : Leitner local, générateur de questions et cinq défis déterministes.

## Contraintes tenues

- Zéro réseau à l'exécution, CSP stricte, PWA avec cache versionné.
- Zéro `Math.random()` dans l'app : PRNG à graine affichée (20261121).
- Une seule boucle rAF ; tout changement déclenche au plus un rendu explicite.
- Cibles tactiles ≥ 44 px, `aria-valuetext` sur les curseurs, `role="status"` pour les mesures.
- Budget mesuré : 33 requêtes / 492 Ko à la première visite, 56 Ko en régime établi.

## Génération déterministe

Chaque script de build produit un SHA-256 canonique. Deux exécutions donnent le même fichier octet pour octet — contrôlé par les tests `turning-points`, `anomalies`, `histomap-data` et `trails-data`.

## Publication

`npm run build:pages` copie `public/`, `src/`, `icons/` et les fichiers racine vers `dist-pages`, calcule un hash et l'injecte dans le service worker. La branche `gh-pages` est publiée via GitHub Pages.
