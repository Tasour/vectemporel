# Ergonomie de la timeline — modèle, calibrage et mesures

Ce document décrit la cinématique `geste → date + zoom`, les raisons du
calibrage et les tests qui la verrouillent.

## 1. Théorie : un seul intégrateur

Le geste n'a pas deux étages (« déplacer, puis ajouter un zoom »). Il n'y a
qu'un état `(centre, span)` et une règle :

```
Δt = (dx / largeur) × S(t)
S_cible = S₀ × g(v)
g(v) = 1 + k · ln(1 + max(0, (|v| − v₀) / v₀))
```

- `S(t)` est le span **instantané**. Chaque pixel est converti à l'échelle
  courante, pas à celle du début du geste.
- `v` est la vitesse lissée du doigt. `S` suit `v` : plus le geste est rapide,
  plus la fenêtre s'élargit, donc plus **les pixels suivants couvrent
  d'années**. L'accélération est le zoom, pas un supplément appliqué après.
- Sous `v₀` (650 px/s), `g = 1` : un geste lent est strictement 1:1.
- Au relâchement, la cible de span est **gelée** : pas de retour de zoom.
  L'inertie décroît, puis l'échelle est réancrée à l'arrêt.
- Le centre interne fait foi. Il n'est **jamais** réinitialisé depuis une
  fenêtre vis-timeline en retard. Seules les actions externes (dialogue
  d'année, autoplay, restauration) passent par `resetGestureToWindow`.

Cette séparation supprime le défaut mesuré auparavant : la trace faisait
`1128 → 1017 → 1128` après le relâchement, parce qu'une entrée tardive
réinitialisait le centre depuis une fenêtre en retard.

### Constantes

| Constante | Valeur | Rôle |
|---|---:|---|
| `WHEEL_REFERENCE_WIDTH` | 700 px | règle virtuelle de la molette |
| `MIN_WHEEL_DT_MS` / `MIN_DRAG_DT_MS` | 32 / 8 ms | planchers de dt |
| `VELOCITY_TAU_MS` | 65 ms | lissage de la vitesse |
| `MAX_VELOCITY` | 3 000 px/s | plafond |
| `ZOOM_MIN_SPEED` | 650 px/s | zone morte : pas de zoom sous ce seuil |
| `ZOOM_SPEED_REF` | 900 px/s | référence logarithmique |
| `ZOOM_GAIN` | 0,9 | pente de la courbe |
| `MAX_ZOOM_FACTOR` | 2,5 | plafond de dézoom |
| `ZOOM_TAU_MS` | 70 ms | interpolation du span |
| `INERTIA_TAU_MS` | 120 ms | décroissance de la vitesse |
| `COAST_BUDGET_RATIO` | 0,6 | glisse max = 60 % de la largeur |
| `WHEEL_GESTURE_GAP_MS` / `DRAG_GESTURE_GAP_MS` | 260 / 700 ms | fin logique du geste |
| watchdog | `DRAG_GESTURE_GAP_MS + 300` ms | fin garantie même si les frames rAF sont rares |

La fenêtre entière est bornée à `[-2250, 2250]` et le centre à `[-2000, 2000]`.
`prefers-reduced-motion` supprime l'inertie et l'interpolation de zoom.

## 2. Tests

### Unitaires

`kinematics.test.ts` simule le chemin exact du composant (`applyGestureInput`
puis `advanceMotion`, frames de 16 ms). Il couvre : cran isolé, 3 crans, rafale,
glisser 1:1 mobile/desktop, flick, direction, bornes, stabilité et **fenêtre en
retard** (le centre rapporté est décalé de 120 ans, le geste ne recule pas).

### E2E

`tests/e2e/timeline-ergonomics.spec.ts` : 17 tests en 390×844 et 1658×1150,
plus un glisser tactile. Le test `le geste ne revient jamais en arrière`
échantillonne l'année toutes les 60 ms pendant et après un glisser réel et
échoue si une baisse dépasse 3 ans.

```bash
VITE_API_BASE_URL=http://127.0.0.1:4189/api/v1 VITE_ENVIRONMENT=development \
  npx playwright test tests/e2e/timeline-ergonomics.spec.ts
```

Le rapport est écrit dans `test-results/ergonomie/ergonomie-timeline.json` avec
les captures `zones-*.png` et `burst-*.png`.

## 3. Zoom ancré et réversible

- **Ancrage au pointeur** : pendant l'interpolation du span, le temps sous le
  curseur/doigt reste fixe (`anchorOffset` dans `GestureState`). Le zoom ne fait
  plus glisser la date visée.
- **Ctrl/⌘ + molette** : zoom explicite autour du curseur, sans déplacement
  temporel. C'est le moyen de revenir en arrière après un dézoom par vitesse.
- **Boutons** : `−` (zoom arrière), `500 ans` (échelle par défaut), `+` (zoom
  avant), placés au-dessus de la timeline pour ne pas intercepter les gestes.
- **Annulation de l'inertie** : un nouveau pointerdown arrête la glisse net.
- **Touches `+`/`−`** : les boutons sont focusables, font 44×44 et ont des
  libellés explicites (`Zoom avant`, `Zoom arrière`, `Revenir à 500 ans`).
- **Défilement mobile préservé** : `touch-action: pan-y` sur la timeline ; un
  geste vertical fait défiler la page, un geste horizontal contrôle le temps.

Le zoom par vitesse reste l'accélérateur ; ces contrôles rendent l'échelle
réversible et prévisible.

## 4. Résultats mesurés (26/11/2026)

| Geste | 390×844 | 1658×1150 |
|---|---:|---:|
| 1 cran | +71 ans, fenêtre 500 → 500 | +71 ans, 500 → 500 |
| glisser 100 px | +128 ans (attendu 128) | +30 ans (attendu 30) |
| rafale de 10 crans | +711 ans, 500 → 1 078 | +711 ans, 500 → 1 025 |
| aller-retour 100 px | retour à 1000 | retour à 1000 |
| longue rafale | 1711 / -1089, span 2 323 | 1713 / -1090, span 2 323 |
| stabilité à +1,5 s | année et span identiques | année et span identiques |
| retour en arrière maximal | **0 an** | **0 an** |
| tactile 100 px | +128 ans, retour à 1000 | — |

## 5. Frontières intérieures

La bordure est dérivée de la couleur de remplissage résolue, assombrie de
**18 %** (`darkenColor`, facteur 0,82), avec une opacité de 0,9 sur les
frontières internes et 0,35 sur le contour. Les anciennes propriétés
`rDark/cDark/eDark/gDark` ont été supprimées : elles dupliquaient la couleur et
ajoutaient un calcul par feature.

## 6. Libellés français

L'API ne fournit `*_fr` que pour une partie des entités. `src/data/frenchNames.ts`
complète les noms manquants les plus visibles (royaumes, empires, cultures et
religions) à partir de libellés français publiés (Wikidata / Wikipédia). Les
noms officiels de l'API restent prioritaires ; les entités sans équivalent
français établi conservent leur nom source. La couverture est mesurée dans
`docs/FR-LABELS-COVERAGE.md`.
