# Preuves — lots 2026-11-22/23

## Captures

Les captures des lots sont archivées dans `captures/`, en 1658×1150 et 390×844. Elles ont été relues visuellement avant chaque commit.

| Lot | Fonctionnalités | Captures |
|---|---|---|
| B | minimap, échelle | `vatlas-b-1658.png`, `vatlas-b-390.png` |
| A | récits | `vatlas-a2-1658-list.png`, `vatlas-a2-390-step.png` |
| C | arcs | `vatlas-c-1658-arcs.png` |
| 5 | Histomap | `vatlas-5b-1658.png`, `vatlas-5b-390.png` |
| 1 | filtres, historique, arcs | `vatlas-lot1-*.png` |
| 2 | zoom siècle, A/B | `vatlas-lot2-*.png` |
| 3 | ombre, anomalies | `vatlas-lot3-*.png` |
| 4 | apprentissage | `vatlas-lot4-*.png` |
| Contenu | 10 récits | `vatlas-content-*.png` |

## Gate D3

`histomap-proof.html` est généré depuis `histomap-proof.spec.json` et les données Histomap. Résultats : `audit.mjs --advanced` **40/40**, `roast.mjs` **0 défaut** (`histomap-gates.txt`).

## Matrice idée → fichiers → tests

| Idée | Fichiers clés | Tests |
|---|---|---|
| Minimap / échelle | `src/timeline/scale.js`, `src/app.js` | `timeline-scale`, `e2e` |
| Récits | `content/trails/`, `src/story/trails.js` | `trails-data`, `trails`, `e2e` |
| Ruptures | `scripts/build-turning-points.mjs` | `turning-points`, `turning-ui` |
| Arcs | `src/globe/simultaneity.js`, `globe.js` | `simultaneity`, `arcs` |
| Histomap | `src/histomap/stream.js`, `scripts/build-histomap.mjs` | `histomap-data`, `histomap-ui` |
| Apprentissage | `src/learning/challenges.js`, `learn-ui.js` | `challenges`, `learning`, `e2e` |
| Qualité données | `scripts/build-data-quality.mjs`, `build-anomalies.mjs` | `data-quality`, `anomalies`, `snapshot` |
| UI outils | `src/app.js`, `styles.css` | `e2e`, `a11y` |
| Hors ligne | `sw.js`, `scripts/build-pages.mjs` | `pwa`, `offline-links` |
| Perf | `src/globe/globe.js` | `perf`, `perf-throttle` |

## Budget mesuré

Dernier `npm run check` : 1 328 PASS, 34 requêtes / 501 Ko en première visite, 56 Ko en régime établi.
