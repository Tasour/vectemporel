# Licences et attributions

| Composant | Version | Licence | Auteurs | URL | Consulté le | Usage |
|---|---|---|---|---|---|---|
| D3 | 7.9.2 | ISC | Mike Bostock et contributeurs | https://d3js.org/ | 2026-11-20 | `lib/vendor/d3.cjs`, copied depuis `mon-suivi-running/node_modules/d3/dist/d3.min.js`. Intégré au moteur, jamais chargé depuis le réseau. |
| snow-d3 | — | MIT | jiannanya | https://github.com/jiannanya/snow-d3 | 2026-11-20 | Taxonomie des 42 types de graphiques et idées de recettes. **Aucun code copié** : réimplémentation originale dans `lib/*-recipes-*.js`. |
| D3 Graph Gallery | — | MIT | Yan Holtz | https://d3-graph-gallery.com/ | 2026-11-20 | Référence de bonnes pratiques (choix du type, caves à éviter). Aucun code copié. |
| d3-power-tools | — | ⚪ non vérifiée | syntagmatic / enjalot | https://github.com/syntagmatic/d3-power-tools | 2026-11-20 | Patterns `linked-views`, `coordination`, `brushing`, `choreography`, `shape-morphing`, `small-multiples` — **inspiration fonctionnelle seule**, réimplémentation originale, aucun code copié. |
| Sources méthodologiques | — | articles / guides publics | Nightingale (DVS), Datawrapper, Material Design, ONS, CMU, Urban Institute, GIJN, data.org, TDWI, GoodData, ColorBrewer, HandsOnDataViz | voir `VISUAL-METHODOLOGY.md` § 0 | 2026-11-21 | Principes de design, typographie, couleur, annotation et narration — idées attribuées, aucun texte ni visuel copié. |

## Bloc d'attribution pour les rapports générés

```html
<!-- Moteur de visualisation : d3-graph-studio (original).
     D3 v7.9.2 — ISC — © 2010-2026 Mike Bostock — https://d3js.org/
     Taxonomie inspirée de snow-d3 (MIT) et du D3 Graph Gallery (MIT). -->
```

## Règle de garde-fou

- 🟢 ISC / MIT : réutilisation autorisée avec attribution (ci-dessus).
- 🟡 Copyleft : validation humaine obligatoire avant tout commit.
- 🔴 Fermé / incertain : inspiration fonctionnelle uniquement, réimplémentation originale.

Aucun code sous licence copyleft ou fermée n'est présent dans ce skill.
