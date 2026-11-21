# Risques et angles morts

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Perte de fidélité visuelle vs Chronas (frontend non copiable) | Élevée | Moyen | Clean-room assumé ; ADR-0001 documenté ; comparer captures |
| Snapshot géométrique > 1 Mo après simplification | Moyenne | Élevé | Coordonnées arrondies à 3 décimales, simplification déterministe, mesure `test:perf` |
| Hit-testing lent sur 2 492 polygones | Moyenne | Moyen | Calcul uniquement au clic, indexation par bbox, pas de test par frame |
| Licence CC BY-SA non respectée sur la couche données | Faible | Élevé | `DATA-LICENSE.md`, `ATTRIBUTION.md`, `meta.license` dans le snapshot |
| Références mortes après archivage | Moyenne | Moyen | `npm run check` + `check:imports` verts avant publication |
| Téléphone 390 px : zoom/pan peu précis | Moyenne | Moyen | Cibles 44 px, boutons zoom, `touch-action:none`, test captures |
| Service worker qui cache une ancienne version du snapshot | Moyenne | Moyen | Bump de version du cache à chaque regeneration du snapshot |

## Hypothèses à valider

- L'API Chronas reste accessible au build (les données sont ensuite locales, aucun runtime ne dépend d'elle).
- `value=Berry` corresponds to `properties.name = "Berry"` dans la géométrie (à confirmer par test E2E).
- `pos=lat,lon,zoom` suffit à reproduire le cadrage attendu sans tuiles externes.

## Angles morts

- Aucun test utilisateur (phase K skipped) : la qualité perceptuelle n'est pas validée.
- La couleur par culture/religion n'est pas encore définie : la palette Chronas n'est pas copiable telle quelle ; une palette propre sera dérivée des tokens existants.
