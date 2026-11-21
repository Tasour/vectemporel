# État courant — mesures brutes (2026-11-21)

## Outils disponibles

- `tools.arch.profile`, `tools.arch.budget`, `tools.arch.dependency_graph`, `tools.arch.scorecard`, `tools.arch.verify` : ✅
- Adaptateurs externes (dependency-cruiser, madge, knip, deptrac, jscpd) : ❌ absents → heuristiques intégrées utilisées, à expliciter.

## Mesures

| Mesure | Valeur | Source |
|---|---|---|
| Langages | JavaScript (1 184 fichiers), CSS (2), HTML (2) | `tools.arch.profile` |
| Framework détecté | aucun | `tools.arch.profile` |
| Dépendances runtime déclarées | 0 (dev uniquement : puppeteer-core, yaml) | `package.json` |
| Cycles d'imports | 0 | `tools.arch.dependency_graph` |
| Gros fichiers signalés | `three.min.js` 633 Ko, `chronas-snapshot.js` 705 Ko | `tools.arch.budget` |
| Régions Chronas en 1000 | 2 429 (dont `Berry`) | API `api.chronas.org/v1/areas/1000` |
| Polygones provinces | 2 492 features avec `properties.name` | API `/v1/metadata?type=g&f=provinces` |
| Budget réseau mesuré | 49 requêtes / 748 Ko au chargement | `npm run test:perf` |
| Tests | `npm run check` = 134 PASS | suite locale |
| Site public | GitHub Pages `gh-pages` → 200 | `curl` |

## Limites

- `tools.arch.profile` ne voit que les entrées `src/**` de `dist-pages` ; la lecture doit être recoupée avec la racine réelle.
- `/v1/areas/1000` et la géométrie sont sous **CC BY-SA 4.0** : attribution et partage à l'identique obligatoires sur la couche données.
- Le frontend Chronas v2 n'a aucun `LICENSE` : son code n'est pas réutilisable ; la reconstruction est **clean-room**.

## Invariants à conserver

- `npm run check` vert, `test:perf` < 50 requêtes / < 1 Mo, PWA hors ligne, 0 id DOM dupliqué, `git diff --check` propre.
