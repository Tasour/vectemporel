# État courant — mesures brutes (2026-11-21, après ADR-0004)

## Mesures

| Mesure | Valeur | Source |
|---|---|---|
| Livrables architecture | présents, 7 ADR, 0 erreur | `tools.arch.verify` |
| Scorecard | 87/100, couverture 100 %, confiance high | `docs/architecture/scorecard.md` |
| Modules JS livrés | 5 (`app.js`, `map/{data,projection,renderer}.js`, snapshot) | `find src` |
| Cycles d'imports | 0 | `tools.arch.dependency_graph` |
| Snapshot données | 593 Ko, 2 429 régions, 2 492 géométries | `scripts/verify.mjs` |
| Première visite | 10 requêtes / 208 Ko | `npm run test:perf` |
| PWA | 12/12, hors ligne | `npm run test:pwa` |
| Actif Three.js | r180, bundle ESM tree-shaké, 491 Ko brut / 126 Ko gzip, MIT | `scripts/build-three.mjs` |
| Site public | GitHub Pages `gh-pages` → 200 | `curl` |

## Décision en cours

La sphère WebGL est livrée (ADR-0004), avec timeline 4 001 ans (ADR-0005) et rendu vectoriel des provinces (ADR-0007). Les versions antérieures sont archivées dans `archive/v1-map-2d/` et `archive/v2-globe-1year/`.

P6 est terminé : 16 741 triangles, 21 743 sommets, construction en 44 ms, texture réduite à 2048×1024 (fond océan + graticule), zoom borné à 6. Les frontières restent nettes en gros plan.

## Prochaines phases

P1 données multi-années · P2 rendu haute définition · P3 timeline · P4 features Chronas complémentaires · P5 qualité et publication. Un push est effectué à la fin de chaque phase.

## Limites et invariants

- L'ancien UMD `three.min.js` r152 émettait un `console.warn` de dépréciation : supprimé en P15 au profit d'un bundle ESM r180 sans avertissement.
- Aucun appel réseau au runtime : la texture est générée localement depuis `chronas-map.js`.
- Données sous **CC BY-SA 4.0** : attribution conservée dans `DATA-LICENSE.md`, `ATTRIBUTION.md` et le HUD.
- Code sous **MIT**, y compris Three.js r152.
- Contrat d'URL et ids DOM uniques conservés.
- `npm run check`, `test:perf` (< 50 req / < 1 Mo), PWA hors ligne et `git diff --check` restent les portes de sortie.
