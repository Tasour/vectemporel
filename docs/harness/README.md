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

## Test utilisateur (règle UI)

Captures réelles relues en 1658×1150 et 390×844, dans les thèmes sombre et clair, avec les états significatifs (premier lancement, panneaux Récits et Apprendre). Captures archivées dans `captures/user2-*.png` et `captures/fix0*.png`.

Défauts observés et corrigés :
- `FIX-01` indicateur de panneau chevauchant les actions HUD en mobile.
- `FIX-02` indicateur recouvrant le titre du panneau après déplacement ; masqué en mobile.
- `FIX-03` boutons d'onboarding à 36 px au lieu de 44 px (signalé par le gate live).

## Deuxième passe utilisateur (thème clair)

Relance du parcours en 1658×1150 et 390×844, thèmes sombre et clair, panneaux Récits, Comparaison et Histomap. Nouveaux défauts observés puis corrigés et recapturés :

- `FIX-01` barres de défilement blanches natives → barres fines couleur or.
- `FIX-02` frise et panneaux restés sombres en thème clair → variables `--panel`, `--panel-soft`, `--panel-strong`.
- `FIX-03` résultat de comparaison et presets peu lisibles → corrigés par le thème clair.
- `FIX-04` croix de fermeture invisibles → corrigées par le thème clair.
- `FIX-05` indicateur de panneau frôlant les actions → déplacé sous la marque.
- `FIX-06` boutons Linéaire/Siècle/Histomap sombres en thème clair → fond `--surface`.

Captures de preuve : `captures/fix-verify-dark-trails.png`, `captures/fixv-light-compare.png`, `captures/fixv2-light-histomap.png`, `captures/fixv2-light-1440.png`.

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

Dernier `npm run check` : 1 359 PASS, 35 requêtes / 578 Ko en première visite, 56 Ko en régime établi.
