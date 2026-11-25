# Ergonomie de la timeline — modèle calibré et mesures

Ce document décrit la cinématique `geste → date + zoom` et les tests qui la
verrouillent. Il complète le `README.md` et le `FORK-NOTICE`.

## 1. Pourquoi un calibrage était nécessaire

Avec l'ancienne cinématique, un seul cran de molette (100 px, 16 ms) produisait :

- une vitesse bornée à 4 000 px/s au lieu de ~600 px/s ;
- un facteur de zoom de 2,35 (fenêtre 500 → 1 175 ans) ;
- une inertie de 720 px appliquée **après** le dézoom, soit ≈ 2 170 ans de glisse.

Résultat mesuré : `1000 → 2000` en un geste, sans précision ni retour possible.

## 2. Modèle

Deux règles structurent `src/components/timeline/VisTimelineWrapper/kinematics.ts` :

1. **Distance.** Chaque pixel est converti en temps avec la fenêtre au début du
   geste (`span0`), jamais avec la fenêtre déjà élargie. Le déplacement reste
   1:1 : 100 px sur 390 px de large déplacent `100/390 × span0`.
2. **Zoom.** Il découle d'une **vitesse soutenue**, pas d'un cran isolé. Il est
   interpolé dans l'unique boucle rAF, puis l'échelle est réancrée à l'arrêt.

La molette utilise une règle virtuelle de 700 px (`WHEEL_REFERENCE_WIDTH`), pour
qu'un cran représente la même durée sur mobile et sur desktop. Le glisser
souris/tactile utilise la largeur réelle du conteneur.

### Constantes

| Constante | Valeur | Rôle |
|---|---:|---|
| `WHEEL_REFERENCE_WIDTH` | 700 px | règle virtuelle de la molette |
| `MIN_WHEEL_DT_MS` | 32 ms | plancher de dt (un cran n'est pas un flick) |
| `VELOCITY_TAU_MS` | 70 ms | lissage exponentiel de la vitesse |
| `MAX_VELOCITY` | 2 500 px/s | plafond de vitesse |
| `ZOOM_MIN_SAMPLES` | 3 | échantillons avant zoom |
| `ZOOM_MIN_DISTANCE` | 150 px | distance avant zoom |
| `ZOOM_MIN_SPEED` | 700 px/s | vitesse avant zoom |
| `ZOOM_GAIN` | 0,45 | poids du `log1p(vitesse/1200)` |
| `MAX_ZOOM_FACTOR` | 2,5 | plafond de dézoom |
| `ZOOM_TAU_MS` | 100 ms | interpolation du zoom |
| `INERTIA_TAU_MS` | 120 ms | décroissance de la vitesse |
| `COAST_BUDGET_RATIO` | 0,6 | glisse max = 60 % de la largeur |
| `GESTURE_GAP_MS` | 260 ms | fin logique du geste |
| watchdog | `GESTURE_GAP_MS + 300` ms | fin garantie même si les frames rAF sont rares |

La fenêtre entière est bornée à `[-2250, 2250]` et le centre à `[-2000, 2000]`.
Avec `prefers-reduced-motion`, la translation est immédiate et il n'y a ni
inertie ni interpolation de zoom.

## 3. Tests

### Unitaires

`src/components/timeline/VisTimelineWrapper/kinematics.test.ts` simule le même
chemin que le composant (`applyGestureInput` + `advanceMotion`, frames de 16 ms)
et vérifie : cran isolé, 3 crans, rafale, glisser 1:1 mobile/desktop, flick,
direction, bornes, stabilité.

### E2E

`tests/e2e/timeline-ergonomics.spec.ts` (15 tests) mesure Chromium en
**390×844** et **1658×1150**, plus un glisser tactile. Il écrit
`test-results/ergonomie/ergonomie-timeline.json` et les captures
`zones-*.png` / `burst-*.png`.

Commande locale (le miroir API doit être servi sur le port 4189) :

```bash
VITE_API_BASE_URL=http://127.0.0.1:4189/api/v1 VITE_ENVIRONMENT=development \
  npx playwright test tests/e2e/timeline-ergonomics.spec.ts
```

## 4. Résultats mesurés (25/11/2026, 15 tests verts)

| Geste | 390×844 | 1658×1150 |
|---|---:|---:|
| 1 cran | +71 ans, fenêtre 500 → 500 | +71 ans, 500 → 500 |
| glisser 100 px | +128 ans (attendu 128) | +30 ans (attendu 30) |
| rafale de 10 crans | +873 ans, 500 → 754 | +881 ans, 500 → 754 |
| aller-retour 100 px | retour à 1000 | retour à 1000 |
| longue rafale | centre 1873 / -1683 | centre 1889 / -1696 |
| stabilité à +1,5 s | 1610 → 1610 | 1592 → 1592 |
| tactile 100 px | +128 ans, retour à 1000 | — |

Les captures associées montrent les zones colorées présentes au premier
chargement (plus de message « No Data Available ») et l'élargissement des
graduations après la rafale.

## 5. Régression du premier chargement

`resetStaleCache()` est désormais appelé avant `createRoot` (`main.tsx`) : aucune
requête d'aire n'est en vol au moment du reset. `loadAreaData` compare un
identifiant de requête monotone au lieu de l'`AbortController`, et le reset
aborte explicitement la requête courante. Un test unitaire couvre la réponse
tardive et le test E2E `le premier chargement affiche les zones colorées` couvre
le cas réel.
